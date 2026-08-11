import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import ShareDialog from '../unisave/ShareDialog.jsx';
import Facepile from '../collab/Facepile.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import DownloadMenu from '../ui/DownloadMenu.jsx';
import { toCsv } from '../../lib/export/formats.js';
import { safeName, saveFile } from '../../lib/export/download.js';
import {
  FUNCTION_HELP,
  cellRef,
  columnIndex,
  columnLabel,
  displayValue,
  isFormulaError,
} from '../../lib/formula.js';
import { DEFAULT_COLS, DEFAULT_ROWS } from '../../lib/templates/sheets.js';
import { useData } from '../../context/DataContext.jsx';
import { useMorphTarget } from '../../lib/morph.js';
import { useT } from '../../i18n/index.jsx';

const MAX_ROWS = 200;
const MAX_COLS = 26;

/**
 * The grid.
 *
 * Cells are stored sparsely — only cells someone actually filled in exist in
 * `cells`. Editing keeps the raw text in local state until the edit is
 * committed, so a half-typed formula never hits the formula engine.
 */
export default function SheetEditor({ sheetId, onBack }) {
  const { t } = useT();
  const { sheets, update, remove } = useData();

  const sheet = sheets.find((item) => item.id === sheetId);

  // The card the reader tapped grows into this page.
  const sheetRef = useRef(null);
  useMorphTarget(sheetRef);
  const [selected, setSelected] = useState({ row: 0, col: 0 });
  const [draft, setDraft] = useState(null); // null = not editing
  // Where the in-progress edit is being typed: 'cell' or 'formula'. Both write
  // the same draft, but only one may own focus — without this the cell's
  // autoFocus input steals focus from the formula bar mid-word.
  const [editIn, setEditIn] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const gridRef = useRef(null);

  const rows = sheet?.rows ?? DEFAULT_ROWS;
  const cols = sheet?.cols ?? DEFAULT_COLS;
  const cells = sheet?.cells ?? {};
  const selectedRef = cellRef(selected.row, selected.col);
  const selectedCell = cells[selectedRef];

  /**
   * The sheet as CSV text, built once for both the download and the share.
   *
   * Calculated values rather than formulas: the point of a CSV is that it says
   * the same thing wherever it is opened, and "=B2+C2" depends on a program
   * the recipient may not be running.
   */
  const csvText = useCallback(() => {
    const grid = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => displayValue(cellRef(row, col), cells)),
    );
    // Trailing empty rows and columns are the grid's padding, not the person's
    // data — exporting them gives a file with forty blank lines at the end.
    while (grid.length && grid[grid.length - 1].every((cell) => !cell)) grid.pop();
    let width = 0;
    for (const row of grid) {
      for (let i = row.length - 1; i >= 0; i -= 1) {
        if (row[i]) {
          width = Math.max(width, i + 1);
          break;
        }
      }
    }
    // The byte-order mark is not decoration: without it Excel on Windows reads
    // a UTF-8 CSV as Latin-1 and every Cyrillic name arrives as mojibake.
    return '\ufeff' + toCsv(grid.map((row) => row.slice(0, width)));
  }, [rows, cols, cells]);

  const patchSheet = useCallback(
    (patch, options) => update('sheets', sheetId, patch, options),
    [sheetId, update],
  );

  const writeCell = useCallback(
    (ref, changes) => {
      const current = cells[ref] ?? {};
      const next = { ...current, ...changes };

      // Drop cells that no longer hold anything, so sheets stay small.
      const isEmpty =
        (next.v === '' || next.v === undefined) && !next.b && (!next.a || next.a === 'left');

      const nextCells = { ...cells };
      if (isEmpty) delete nextCells[ref];
      else nextCells[ref] = next;

      patchSheet({ cells: nextCells });
    },
    [cells, patchSheet],
  );

  /* ------------------------------ navigation ----------------------------- */

  const move = useCallback(
    (rowDelta, colDelta) => {
      setSelected((current) => ({
        row: Math.min(rows - 1, Math.max(0, current.row + rowDelta)),
        col: Math.min(cols - 1, Math.max(0, current.col + colDelta)),
      }));
    },
    [rows, cols],
  );

  const commitDraft = useCallback(
    (value, { rowDelta = 0, colDelta = 0 } = {}) => {
      if (value !== null) writeCell(selectedRef, { v: value });
      setDraft(null);
      setEditIn(null);
      if (rowDelta || colDelta) move(rowDelta, colDelta);
      gridRef.current?.focus();
    },
    [move, selectedRef, writeCell],
  );

  /**
   * Jump to the edge of the data, the way Ctrl+Arrow does in Excel.
   *
   * From a filled cell it runs to the last filled cell before a gap; from an
   * empty one it runs to the next filled cell. That distinction is the whole
   * behaviour — without it, Ctrl+Down from the top of a column full of data
   * lands at row 200 instead of at the bottom of the data, and the shortcut is
   * useless for exactly the job people use it for.
   */
  const jump = useCallback(
    (rowDelta, colDelta) => {
      setSelected((current) => {
        const filled = (r, c) => {
          const cell = cells?.[`${r}:${c}`];
          return cell?.v !== undefined && cell?.v !== '';
        };
        let { row, col } = current;
        const startFilled = filled(row, col);
        for (;;) {
          const nextRow = row + rowDelta;
          const nextCol = col + colDelta;
          if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) break;
          if (startFilled && !filled(nextRow, nextCol)) break;
          row = nextRow;
          col = nextCol;
          if (!startFilled && filled(row, col)) break;
        }
        return { row, col };
      });
    },
    [cells, rows, cols],
  );

  const onGridKeyDown = (event) => {
    if (draft !== null) return; // the cell input handles its own keys

    const { key } = event;
    const mod = event.ctrlKey || event.metaKey;

    // Excel's grid navigation, checked before the plain arrows so the modified
    // form wins.
    if (mod && key.startsWith('Arrow')) {
      event.preventDefault();
      const by = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[key];
      if (by) jump(by[0], by[1]);
      return;
    }
    if (key === 'Home') {
      event.preventDefault();
      // Ctrl+Home is the top-left of the sheet; Home alone is the start of the row.
      setSelected((current) => ({ row: mod ? 0 : current.row, col: 0 }));
      return;
    }
    if (key === 'End') {
      event.preventDefault();
      jump(0, 1);
      return;
    }

    if (key === 'ArrowUp') {
      event.preventDefault();
      move(-1, 0);
    } else if (key === 'ArrowDown' || key === 'Enter') {
      event.preventDefault();
      if (key === 'Enter') {
        setEditIn('cell');
        setDraft(selectedCell?.v ?? '');
      } else move(1, 0);
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      move(0, -1);
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      move(0, 1);
    } else if (key === 'Tab') {
      event.preventDefault();
      move(0, event.shiftKey ? -1 : 1);
    } else if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      writeCell(selectedRef, { v: '' });
    } else if (key === 'F2') {
      event.preventDefault();
      setEditIn('cell');
      setDraft(selectedCell?.v ?? '');
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Typing over a cell replaces it, like every other spreadsheet.
      event.preventDefault();
      setEditIn('cell');
      setDraft(key);
    }
  };

  // Keep the selected cell in view when navigating with the keyboard.
  useEffect(() => {
    const node = gridRef.current?.querySelector(`[data-ref="${selectedRef}"]`);
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedRef]);

  /* -------------------------- structure changes -------------------------- */

  const addRow = () => patchSheet({ rows: Math.min(MAX_ROWS, rows + 1) }, { immediate: true });
  const addColumn = () => patchSheet({ cols: Math.min(MAX_COLS, cols + 1) }, { immediate: true });

  /** Removing a row shifts everything below it up, formulas included as text. */
  const deleteRow = () => {
    if (rows <= 1) return;
    const target = selected.row;
    const nextCells = {};
    Object.entries(cells).forEach(([ref, cell]) => {
      const match = /^([A-Z]+)(\d+)$/.exec(ref);
      if (!match) return;
      const rowIndex = Number(match[2]) - 1;
      if (rowIndex === target) return;
      const shifted = rowIndex > target ? rowIndex - 1 : rowIndex;
      nextCells[`${match[1]}${shifted + 1}`] = cell;
    });
    patchSheet({ rows: rows - 1, cells: nextCells }, { immediate: true });
    setSelected((current) => ({ ...current, row: Math.min(current.row, rows - 2) }));
  };

  const deleteColumn = () => {
    if (cols <= 1) return;
    const target = selected.col;
    const nextCells = {};
    Object.entries(cells).forEach(([ref, cell]) => {
      const match = /^([A-Z]+)(\d+)$/.exec(ref);
      if (!match) return;
      const colIndex = columnIndex(match[1]);
      if (colIndex === target) return;
      const shifted = colIndex > target ? colIndex - 1 : colIndex;
      nextCells[`${columnLabel(shifted)}${match[2]}`] = cell;
    });
    patchSheet({ cols: cols - 1, cells: nextCells }, { immediate: true });
    setSelected((current) => ({ ...current, col: Math.min(current.col, cols - 2) }));
  };

  const toggleBold = () => writeCell(selectedRef, { b: !selectedCell?.b });
  const setAlign = (align) => writeCell(selectedRef, { a: align });

  const columnIndices = useMemo(() => Array.from({ length: cols }, (unused, i) => i), [cols]);
  const rowIndices = useMemo(() => Array.from({ length: rows }, (unused, i) => i), [rows]);

  if (!sheet) {
    return (
      <div className="editor-missing">
        <h1>{t('notes.missingTitle')}</h1>
        <p>{t('notes.missingBody')}</p>
        <button type="button" className="button primary" onClick={onBack}>
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="sheet-page">
      <header className="editor-header">
        <button
          type="button"
          className="icon-button back"
          onClick={onBack}
          title={t('common.back')}
          aria-label={t('common.back')}
        >
          <Icon name="back" size={19} />
        </button>

        <div className="editor-title-block">
          <input
            className="editor-title-input"
            value={sheet.title ?? ''}
            aria-label={t('sheets.sheetTitle')}
            onChange={(event) => patchSheet({ title: event.target.value })}
            onBlur={(event) =>
              patchSheet({ title: event.target.value.trim() || t('common.untitled') }, { immediate: true })
            }
          />
          <div className="editor-title-meta">
            <SaveIndicator />
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('sheets.rowsCols', { rows, cols })}</span>
          </div>
        </div>

        <div className="editor-header-actions">
          <Facepile document={sheet} onShare={() => setSharing(true)} />
          <DownloadMenu
            formats={[
              {
                id: 'csv',
                file: () => new File([csvText()], safeName(sheet.title, 'csv'), { type: 'text/csv' }),
                ext: 'CSV',
                label: t('export.csv'),
                /*
                 * Calculated values, not formulas. A spreadsheet exported with
                 * "=B2+C2" in it is a file whose numbers depend on a program
                 * the recipient may not be running; the point of a CSV is that
                 * it opens anywhere and says the same thing.
                 */
                run: () =>
                  saveFile(csvText(), safeName(sheet.title, 'csv'), 'text/csv;charset=utf-8'),
              },
              {
                id: 'pdf',
                ext: 'PDF',
                label: t('export.pdf'),
                run: () => window.print(),
              },
            ]}
          />
          <button type="button" className="button ghost" onClick={() => setSharing(true)}>
            <Icon name="share" size={16} />
            {t('common.share')}
          </button>
          <button type="button" className="button danger-ghost" onClick={() => setConfirmDelete(true)}>
            {t('common.delete')}
          </button>
        </div>
      </header>

      <div className="sheet-toolbar" role="toolbar" aria-label={t('sheets.title')}>
        <div className="tool-group">
          <button type="button" className="tool-button wide" onClick={addRow}>
            <Icon name="addRow" size={17} />
            <span className="tool-text">{t('sheets.addRow')}</span>
          </button>
          <button type="button" className="tool-button wide" onClick={addColumn}>
            <Icon name="addColumn" size={17} />
            <span className="tool-text">{t('sheets.addColumn')}</span>
          </button>
        </div>

        <div className="tool-group">
          <button
            type="button"
            className="tool-button"
            title={t('sheets.deleteRow')}
            aria-label={t('sheets.deleteRow')}
            onClick={deleteRow}
          >
            <Icon name="deleteRow" size={17} />
          </button>
          <button
            type="button"
            className="tool-button"
            title={t('sheets.deleteColumn')}
            aria-label={t('sheets.deleteColumn')}
            onClick={deleteColumn}
          >
            <Icon name="deleteColumn" size={17} />
          </button>
        </div>

        <div className="tool-group">
          <button
            type="button"
            className={`tool-button ${selectedCell?.b ? 'is-active' : ''}`}
            title={t('sheets.boldCell')}
            aria-label={t('sheets.boldCell')}
            aria-pressed={Boolean(selectedCell?.b)}
            onClick={toggleBold}
          >
            <Icon name="bold" size={17} />
          </button>
          {[
            ['left', 'alignLeft', 'sheets.alignLeft'],
            ['center', 'alignCentre', 'sheets.alignCentre'],
            ['right', 'alignRight', 'sheets.alignRight'],
          ].map(([align, glyph, labelKey]) => (
            <button
              key={align}
              type="button"
              className={`tool-button ${(selectedCell?.a ?? 'left') === align ? 'is-active' : ''}`}
              title={t(labelKey)}
              aria-label={t(labelKey)}
              onClick={() => setAlign(align)}
            >
              <Icon name={glyph} size={17} />
            </button>
          ))}
        </div>

        <div className="tool-group push-right">
          <button
            type="button"
            className={`tool-button wide ${helpOpen ? 'is-open' : ''}`}
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
          >
            <Icon name="function" size={17} />
            <span className="tool-text">{t('sheets.functionsTitle')}</span>
          </button>
          {helpOpen ? (
            <div className="function-help" role="dialog" aria-label={t('sheets.functionsTitle')}>
              <ul>
                {FUNCTION_HELP.map((entry) => (
                  <li key={entry.name}>
                    <code>{entry.name}</code>
                    <span>{entry.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="formula-bar">
        <span className="formula-ref">{selectedRef}</span>
        <Icon name="function" size={15} className="formula-divider" />
        <input
          className="formula-input"
          value={draft ?? selectedCell?.v ?? ''}
          placeholder={t('sheets.formulaHint')}
          aria-label={t('sheets.formula')}
          onChange={(event) => {
            setEditIn('formula');
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitDraft(event.currentTarget.value, { rowDelta: 1 });
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(null);
              setEditIn(null);
              gridRef.current?.focus();
            }
          }}
          onBlur={(event) => {
            if (draft !== null) commitDraft(event.currentTarget.value);
          }}
        />
      </div>

      <div
        className="sheet-scroll"
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={sheet.title || t('common.untitled')}
        onKeyDown={onGridKeyDown}
      >
        <table className="sheet-grid" ref={sheetRef}>
          <thead>
            <tr>
              <th className="sheet-corner" aria-hidden="true" />
              {columnIndices.map((col) => (
                <th
                  key={col}
                  className={`sheet-col-head ${selected.col === col ? 'is-active' : ''}`}
                  scope="col"
                >
                  {columnLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowIndices.map((row) => (
              <tr key={row}>
                <th
                  className={`sheet-row-head ${selected.row === row ? 'is-active' : ''}`}
                  scope="row"
                >
                  {row + 1}
                </th>
                {columnIndices.map((col) => {
                  const ref = cellRef(row, col);
                  const cell = cells[ref];
                  const isSelected = selected.row === row && selected.col === col;
                  const isEditing = isSelected && draft !== null && editIn === 'cell';
                  const value = displayValue(ref, cells);

                  return (
                    <td
                      key={col}
                      data-ref={ref}
                      className={[
                        'sheet-cell',
                        isSelected ? 'is-selected' : '',
                        cell?.b ? 'is-bold' : '',
                        isFormulaError(value) ? 'is-error' : '',
                        typeof value === 'number' ? 'is-number' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={cell?.a ? { textAlign: cell.a } : undefined}
                      onMouseDown={() => {
                        if (draft !== null) commitDraft(draft);
                        setSelected({ row, col });
                      }}
                      onDoubleClick={() => {
                        setEditIn('cell');
                        setDraft(cell?.v ?? '');
                      }}
                      aria-selected={isSelected}
                    >
                      {isEditing ? (
                        <input
                          className="sheet-cell-input"
                          autoFocus
                          value={draft}
                          aria-label={t('sheets.cell', { ref })}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitDraft(event.currentTarget.value, { rowDelta: 1 });
                            } else if (event.key === 'Tab') {
                              event.preventDefault();
                              commitDraft(event.currentTarget.value, {
                                colDelta: event.shiftKey ? -1 : 1,
                              });
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              setDraft(null);
                              setEditIn(null);
                              gridRef.current?.focus();
                            }
                          }}
                          onBlur={(event) => commitDraft(event.currentTarget.value)}
                        />
                      ) : (
                        String(value ?? '')
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sharing ? <ShareDialog document={sheet} onClose={() => setSharing(false)} /> : null}


      {confirmDelete ? (
        <ConfirmDialog
          title={t('sheets.deleteSheetTitle', { name: sheet.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            remove('sheets', sheetId);
            onBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </div>
  );
}
