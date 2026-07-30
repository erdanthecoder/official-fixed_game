/**
 * A small spreadsheet formula engine.
 *
 * Supports what a student comparing tuition costs actually needs:
 *   numbers, + - * / ^ and parentheses
 *   cell references (B2) and ranges (B2:B10)
 *   SUM AVERAGE MIN MAX COUNT COUNTA ROUND ABS IF AND OR NOT CONCAT LEN TODAY DAYS
 *   text in quotes, comparisons (= <> < <= > >=)
 *
 * Deliberately not supported: absolute refs ($A$1), cross-sheet refs, arrays.
 * Those can be added in `parsePrimary` / `FUNCTIONS` without touching callers.
 *
 * Evaluation is a recursive-descent parser over a token list. Cell lookups
 * recurse through `evaluateCell`, which tracks a visiting set so a circular
 * reference reports an error instead of blowing the stack.
 */

export const ERROR = {
  circular: '#CIRCULAR!',
  name: '#NAME?',
  value: '#VALUE!',
  divide: '#DIV/0!',
  syntax: '#ERROR!',
};

const ERROR_VALUES = new Set(Object.values(ERROR));

export function isFormulaError(value) {
  return typeof value === 'string' && ERROR_VALUES.has(value);
}

/* ------------------------------ cell addresses ---------------------------- */

export function columnLabel(index) {
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export function columnIndex(label) {
  return [...label.toUpperCase()].reduce(
    (total, char) => total * 26 + (char.charCodeAt(0) - 64),
    0,
  ) - 1;
}

export function cellRef(row, col) {
  return `${columnLabel(col)}${row + 1}`;
}

export function parseRef(ref) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) return null;
  return { col: columnIndex(match[1]), row: Number(match[2]) - 1 };
}

/* --------------------------------- tokenizer ------------------------------ */

const TOKEN_PATTERNS = [
  ['ws', /^\s+/],
  ['number', /^\d+(\.\d+)?/],
  ['string', /^"([^"]*)"/],
  ['range', /^[A-Za-z]+\d+:[A-Za-z]+\d+/],
  ['ref', /^[A-Za-z]+\d+(?![\w(])/],
  ['name', /^[A-Za-z_][A-Za-z0-9_.]*/],
  ['op', /^(<=|>=|<>|[+\-*/^()=<>,%&])/],
];

function tokenize(input) {
  const tokens = [];
  let rest = input;

  while (rest.length > 0) {
    const matched = TOKEN_PATTERNS.some(([type, pattern]) => {
      const match = pattern.exec(rest);
      if (!match) return false;
      if (type !== 'ws') {
        tokens.push({ type, value: type === 'string' ? match[1] : match[0] });
      }
      rest = rest.slice(match[0].length);
      return true;
    });
    if (!matched) throw new Error('syntax');
  }
  return tokens;
}

/* -------------------------------- functions ------------------------------- */

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[\s,$%]/g, '');
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) throw new Error('value');
  return parsed;
};

const numbersIn = (args) =>
  args.flat().filter((value) => value !== '' && value !== null && value !== undefined)
    .map(toNumber);

const DAY_MS = 24 * 60 * 60 * 1000;

const FUNCTIONS = {
  SUM: (args) => numbersIn(args).reduce((total, n) => total + n, 0),
  AVERAGE: (args) => {
    const values = numbersIn(args);
    if (values.length === 0) throw new Error('divide');
    return values.reduce((total, n) => total + n, 0) / values.length;
  },
  MIN: (args) => {
    const values = numbersIn(args);
    return values.length ? Math.min(...values) : 0;
  },
  MAX: (args) => {
    const values = numbersIn(args);
    return values.length ? Math.max(...values) : 0;
  },
  COUNT: (args) => numbersIn(args).length,
  COUNTA: (args) =>
    args.flat().filter((value) => value !== '' && value !== null && value !== undefined).length,
  ROUND: (args) => {
    const [value, digits = 0] = args.flat();
    const factor = 10 ** toNumber(digits);
    return Math.round(toNumber(value) * factor) / factor;
  },
  ABS: (args) => Math.abs(toNumber(args.flat()[0])),
  AND: (args) => args.flat().every(truthy),
  OR: (args) => args.flat().some(truthy),
  NOT: (args) => !truthy(args.flat()[0]),
  CONCAT: (args) => args.flat().map((value) => (value == null ? '' : String(value))).join(''),
  LEN: (args) => String(args.flat()[0] ?? '').length,
  TODAY: () => new Date().toISOString().slice(0, 10),
  DAYS: (args) => {
    const [end, start] = args.flat();
    const endDate = new Date(String(end));
    const startDate = start ? new Date(String(start)) : new Date();
    if (Number.isNaN(endDate.getTime()) || Number.isNaN(startDate.getTime())) {
      throw new Error('value');
    }
    return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
  },
};

export const FUNCTION_HELP = [
  { name: 'SUM(B2:B8)', description: 'Adds a range up.' },
  { name: 'AVERAGE(B2:B8)', description: 'Mean of a range.' },
  { name: 'MIN / MAX(B2:B8)', description: 'Smallest / largest value.' },
  { name: 'COUNT(B2:B8)', description: 'How many numbers are in the range.' },
  { name: 'ROUND(B2, 0)', description: 'Rounds to a number of decimals.' },
  { name: 'IF(B2>50000, "high", "ok")', description: 'Pick one value or the other.' },
  { name: 'DAYS("2027-01-05")', description: 'Days from today until a date.' },
  { name: 'B2*4', description: 'Any arithmetic with cell references.' },
];

function truthy(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (value == null || value === '') return false;
  const text = String(value).trim().toUpperCase();
  if (text === 'FALSE' || text === '0') return false;
  return true;
}

/* ---------------------------------- parser -------------------------------- */

function createParser(tokens, resolveRef, resolveRange) {
  let position = 0;

  /**
   * While `skipDepth > 0` the parser walks the grammar without computing
   * anything: references resolve to 0, functions aren't called, and nothing
   * throws. That's what makes IF lazy — we can measure how long a branch is
   * without evaluating it, then evaluate only the branch actually taken.
   */
  let skipDepth = 0;
  const skipping = () => skipDepth > 0;

  const peek = () => tokens[position];
  const eat = (value) => {
    const token = tokens[position];
    if (token && token.type === 'op' && token.value === value) {
      position += 1;
      return true;
    }
    return false;
  };

  function parseExpression() {
    let left = parseConcat();
    for (;;) {
      const token = peek();
      if (!token || token.type !== 'op') return left;
      if (!['=', '<>', '<', '<=', '>', '>='].includes(token.value)) return left;
      position += 1;
      const right = parseConcat();
      left = compare(token.value, left, right);
    }
  }

  function parseConcat() {
    let left = parseAdditive();
    while (peek()?.type === 'op' && peek().value === '&') {
      position += 1;
      left = `${left ?? ''}${parseAdditive() ?? ''}`;
    }
    return left;
  }

  function parseAdditive() {
    let left = parseMultiplicative();
    for (;;) {
      if (eat('+')) left = toNumber(left) + toNumber(parseMultiplicative());
      else if (eat('-')) left = toNumber(left) - toNumber(parseMultiplicative());
      else return left;
    }
  }

  function parseMultiplicative() {
    let left = parseUnary();
    for (;;) {
      if (eat('*')) left = toNumber(left) * toNumber(parseUnary());
      else if (eat('/')) {
        const divisor = toNumber(parseUnary());
        if (divisor === 0) {
          if (skipping()) return 0;
          throw new Error('divide');
        }
        left = toNumber(left) / divisor;
      } else return left;
    }
  }

  function parseUnary() {
    if (eat('-')) return -toNumber(parseUnary());
    if (eat('+')) return toNumber(parseUnary());
    return parsePower();
  }

  function parsePower() {
    const base = parsePrimary();
    if (eat('^')) return toNumber(base) ** toNumber(parseUnary());
    return base;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('syntax');

    if (token.type === 'number') {
      position += 1;
      let value = Number(token.value);
      if (eat('%')) value /= 100;
      return value;
    }

    if (token.type === 'string') {
      position += 1;
      return token.value;
    }

    if (token.type === 'range') {
      position += 1;
      return skipping() ? [0] : resolveRange(token.value);
    }

    if (token.type === 'ref') {
      position += 1;
      return skipping() ? 0 : resolveRef(token.value);
    }

    if (token.type === 'name') {
      position += 1;
      const name = token.value.toUpperCase();

      if (eat('(')) {
        // IF is short-circuiting, like every real spreadsheet: the untaken
        // branch is never evaluated, so =IF(A1=0, "", B1/A1) is safe.
        if (name === 'IF') return parseIf();

        const args = [];
        if (!eat(')')) {
          do {
            args.push(parseExpression());
          } while (eat(','));
          if (!eat(')')) throw new Error('syntax');
        }
        const fn = FUNCTIONS[name];
        if (!fn) {
          if (skipping()) return 0;
          throw new Error('name');
        }
        return fn(args);
      }

      if (name === 'TRUE') return true;
      if (name === 'FALSE') return false;
      throw new Error('name');
    }

    if (eat('(')) {
      const value = parseExpression();
      if (!eat(')')) throw new Error('syntax');
      return value;
    }

    throw new Error('syntax');
  }

  /** Record how many tokens an argument spans without evaluating it. */
  function measureArgument() {
    const start = position;
    skipDepth += 1;
    try {
      parseExpression();
    } finally {
      skipDepth -= 1;
    }
    return { start, end: position };
  }

  function evaluateSpan(span) {
    const resume = position;
    position = span.start;
    const value = parseExpression();
    position = resume;
    return value;
  }

  /** IF(condition, whenTrue, whenFalse) — only the taken branch is evaluated. */
  function parseIf() {
    const condition = parseExpression();
    if (!eat(',')) throw new Error('syntax');

    const whenTrue = measureArgument();
    const whenFalse = eat(',') ? measureArgument() : null;
    if (!eat(')')) throw new Error('syntax');

    const after = position;
    const taken = truthy(Array.isArray(condition) ? condition[0] : condition)
      ? whenTrue
      : whenFalse;

    if (!taken) {
      // IF(cond, value) with no else branch: FALSE, matching spreadsheets.
      position = after;
      return false;
    }

    const value = evaluateSpan(taken);
    position = after;
    return value;
  }

  return () => {
    const value = parseExpression();
    if (position < tokens.length) throw new Error('syntax');
    return value;
  };
}

function compare(operator, left, right) {
  const bothNumeric = [left, right].every(
    (value) => typeof value === 'number' || (value !== '' && !Number.isNaN(Number(value))),
  );
  const a = bothNumeric ? Number(left) : String(left ?? '').toLowerCase();
  const b = bothNumeric ? Number(right) : String(right ?? '').toLowerCase();

  switch (operator) {
    case '=':
      return a === b;
    case '<>':
      return a !== b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    default:
      throw new Error('syntax');
  }
}

function errorFor(message) {
  return ERROR[message] ?? ERROR.syntax;
}

/* ------------------------------- public API ------------------------------- */

/**
 * Value of one cell, following formulas and references.
 * `cells` maps "A1" → { v: rawString }.
 */
export function evaluateCell(ref, cells, visiting = new Set()) {
  const key = ref.toUpperCase();
  const raw = cells?.[key]?.v;

  if (raw === undefined || raw === null || raw === '') return '';
  if (typeof raw !== 'string') return raw;
  if (!raw.startsWith('=')) {
    const numeric = Number(raw.replace(/,/g, ''));
    return raw.trim() !== '' && !Number.isNaN(numeric) ? numeric : raw;
  }

  if (visiting.has(key)) return ERROR.circular;
  const nextVisiting = new Set(visiting).add(key);

  return evaluateFormula(raw, cells, nextVisiting);
}

export function evaluateFormula(formula, cells, visiting = new Set()) {
  const body = formula.startsWith('=') ? formula.slice(1) : formula;

  const resolveRef = (ref) => {
    const value = evaluateCell(ref, cells, visiting);
    if (isFormulaError(value)) throw new Error(value === ERROR.circular ? 'circular' : 'value');
    return value;
  };

  const resolveRange = (rangeText) => {
    const [startRef, endRef] = rangeText.split(':');
    const start = parseRef(startRef);
    const end = parseRef(endRef);
    if (!start || !end) throw new Error('syntax');

    const values = [];
    for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row += 1) {
      for (let col = Math.min(start.col, end.col); col <= Math.max(start.col, end.col); col += 1) {
        values.push(resolveRef(cellRef(row, col)));
      }
    }
    return values;
  };

  try {
    const parse = createParser(tokenize(body), resolveRef, resolveRange);
    const value = parse();
    if (typeof value === 'number' && !Number.isFinite(value)) return ERROR.divide;
    return value;
  } catch (error) {
    if (isFormulaError(error.message)) return error.message;
    return errorFor(error.message);
  }
}

/** What the user sees in the grid: formulas evaluated, numbers tidied up. */
export function displayValue(ref, cells) {
  const value = evaluateCell(ref, cells);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 1e6) / 1e6);
  }
  return value ?? '';
}
