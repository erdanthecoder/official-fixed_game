/**
 * The window on the landing page.
 *
 * Purpose-built mock-ups, not the real components: the real ones need a signed-in
 * account and documents to render, and a landing page has neither. These are
 * built from the same CSS tokens as the app, so what a visitor sees here is what
 * they get after signing in.
 */

import Icon from '../ui/Icon.jsx';

function Chrome({ title, accent, children }) {
  return (
    <div className="preview-window" style={{ '--preview-accent': accent }}>
      <div className="preview-bar">
        <span className="preview-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="preview-title">{title}</span>
      </div>
      <div className="preview-body">{children}</div>
    </div>
  );
}

function NotesPreview({ copy }) {
  return (
    <Chrome title={copy.notesFile} accent="#1A73E8">
      <div className="preview-toolbar">
        <span className="preview-chip">B</span>
        <span className="preview-chip preview-italic">I</span>
        <span className="preview-chip preview-underline">U</span>
        <span className="preview-divider" />
        <span className="preview-chip wide">H2</span>
        <span className="preview-chip">•</span>
      </div>
      <div className="preview-paper">
        <h4>{copy.notesHeading}</h4>
        <p>{copy.notesBody}</p>
        <ul className="preview-check">
          <li>
            <Icon name="circleCheck" size={15} className="ticked" /> {copy.notesTask1}
          </li>
          <li>
            <Icon name="circleCheck" size={15} className="ticked" /> {copy.notesTask2}
          </li>
          <li>
            <Icon name="circleEmpty" size={15} /> {copy.notesTask3}
          </li>
        </ul>
      </div>
    </Chrome>
  );
}

function SheetsPreview({ copy }) {
  const rows = [
    [copy.sheetsSchool1, '12 000', '4', '48 000'],
    [copy.sheetsSchool2, '9 000', '4', '36 000'],
    [copy.sheetsSchool3, '2 500', '5', '12 500'],
  ];

  return (
    <Chrome title={copy.sheetsFile} accent="#0F9D58">
      <div className="preview-formula">
        <span className="preview-ref">D2</span>
        <Icon name="function" size={14} className="preview-fx" />
        <code>=B2*C2</code>
      </div>
      <table className="preview-grid">
        <thead>
          <tr>
            <th>{copy.sheetsHeadSchool}</th>
            <th>{copy.sheetsHeadFee}</th>
            <th>{copy.sheetsHeadYears}</th>
            <th>{copy.sheetsHeadTotal}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={index} className={index > 0 ? 'is-number' : ''}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          <tr className="preview-total">
            <td>{copy.sheetsCheapest}</td>
            <td colSpan={3} className="is-number">
              12 500
            </td>
          </tr>
        </tbody>
      </table>
    </Chrome>
  );
}

function SlidesPreview({ copy }) {
  return (
    <Chrome title={copy.slidesFile} accent="#E8A020">
      <div className="preview-deck">
        <div className="preview-rail">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`preview-thumb ${n === 1 ? 'is-active' : ''}`}>
              {n}
            </span>
          ))}
        </div>
        <div className="preview-slide">
          <strong>{copy.slidesTitle}</strong>
          <span>{copy.slidesSub}</span>
        </div>
      </div>
    </Chrome>
  );
}

function UniSavePreview({ copy }) {
  const files = [
    { name: copy.saveFile1, kind: copy.saveKindNote, shared: copy.saveShared },
    { name: copy.saveFile2, kind: copy.saveKindSheet, shared: null },
    { name: copy.saveFile3, kind: copy.saveKindDeck, shared: copy.saveShared },
  ];

  return (
    <Chrome title={copy.saveFile} accent="#0F7B6C">
      <ul className="preview-files">
        {files.map((file) => (
          <li key={file.name}>
            <span className="preview-file-dot" />
            <span className="preview-file-name">{file.name}</span>
            <span className="preview-file-kind">{file.kind}</span>
            {file.shared ? <span className="preview-file-shared">{file.shared}</span> : null}
          </li>
        ))}
      </ul>
      <div className="preview-avatars">
        <span className="preview-avatar a">A</span>
        <span className="preview-avatar b">M</span>
        <span className="preview-avatar c">+2</span>
        <span className="preview-avatar-label">{copy.savePeople}</span>
      </div>
    </Chrome>
  );
}

function AiPreview({ copy }) {
  return (
    <Chrome title={copy.aiFile} accent="#8430CE">
      <div className="preview-chat">
        <p className="preview-ask">{copy.aiAsk}</p>
        <p className="preview-answer">{copy.aiAnswer}</p>
      </div>
    </Chrome>
  );
}

function LanguagesPreview({ copy }) {
  return (
    <Chrome title={copy.langFile} accent="#C5372C">
      <div className="preview-card">
        <strong>{copy.langFront}</strong>
        <span>{copy.langBack}</span>
      </div>
      <div className="preview-grades">
        <span className="g-again">{copy.langAgain}</span>
        <span className="g-hard">{copy.langHard}</span>
        <span className="g-good">{copy.langGood}</span>
        <span className="g-easy">{copy.langEasy}</span>
      </div>
    </Chrome>
  );
}

function CanvasPreview({ copy }) {
  // A real BoardView would need a board document; this is the same shapes,
  // drawn straight, so the landing page stays free of app state.
  return (
    <Chrome title={copy.canvasFile} accent="#0F7B6C">
      <div className="preview-board">
        <svg viewBox="0 0 320 170" aria-hidden="true">
          <defs>
            <pattern id="preview-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0v20" fill="none" stroke="#e3eaf1" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="320" height="170" fill="#fff" />
          <rect width="320" height="170" fill="url(#preview-grid)" />
          <rect x="24" y="34" width="86" height="46" rx="6" fill="none" stroke="#1A73E8" strokeWidth="3" />
          <rect x="210" y="34" width="86" height="46" rx="6" fill="none" stroke="#0F9D58" strokeWidth="3" />
          <ellipse cx="160" cy="126" rx="52" ry="26" fill="none" stroke="#E8A020" strokeWidth="3" />
          <path d="M110 57h84" stroke="#12263a" strokeWidth="3" strokeLinecap="round" />
          <path d="M186 51l8 6-8 6" fill="none" stroke="#12263a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M67 80v20h86v18" fill="none" stroke="#12263a" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="preview-inks" aria-hidden="true">
        {['#12263a', '#1A73E8', '#0F9D58', '#E8A020', '#C5372C'].map((colour) => (
          <span key={colour} style={{ background: colour }} />
        ))}
      </div>
    </Chrome>
  );
}

function TasksPreview({ copy }) {
  const rows = [
    { text: copy.tasksItem1, state: 'overdue', when: copy.tasksWhen1 },
    { text: copy.tasksItem2, state: 'soon', when: copy.tasksWhen2 },
    { text: copy.tasksItem3, state: 'later', when: copy.tasksWhen3 },
  ];

  return (
    <Chrome title={copy.tasksFile} accent="#C5372C">
      <div className="preview-progress">
        <span style={{ width: '38%' }} />
      </div>
      <ul className="preview-tasks">
        {rows.map((row) => (
          <li key={row.text} className={`is-${row.state}`}>
            <Icon name="circleEmpty" size={15} />
            <span>{row.text}</span>
            <em>{row.when}</em>
          </li>
        ))}
        <li className="is-done">
          <Icon name="circleCheck" size={15} className="ticked" />
          <span>{copy.tasksItem4}</span>
        </li>
      </ul>
    </Chrome>
  );
}

const PREVIEWS = {
  notes: NotesPreview,
  sheets: SheetsPreview,
  slides: SlidesPreview,
  canvas: CanvasPreview,
  tasks: TasksPreview,
  unisave: UniSavePreview,
  ai: AiPreview,
  languages: LanguagesPreview,
};

export default function ModulePreview({ product, copy }) {
  const Preview = PREVIEWS[product] ?? NotesPreview;
  return <Preview copy={copy} />;
}
