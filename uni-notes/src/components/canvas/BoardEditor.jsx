/**
 * The drawing surface.
 *
 * Two rules shape the code:
 *
 * 1. The shape being drawn right now lives in local state, not in the document.
 *    A freehand stroke produces a point every few milliseconds; routing those
 *    through the save pipeline would mean hundreds of writes for one line. The
 *    shape is committed to the document once, on pointer-up.
 *
 * 2. Undo history is local and is not saved. It is a record of what *you* did
 *    in this session, and on a board two people can draw on at once, replaying
 *    it into the document would undo the other person's work. Reload starts a
 *    fresh history; the board itself is intact either way.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import BoardView from './BoardView.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import Icon from '../ui/Icon.jsx';
import PromptDialog from '../ui/PromptDialog.jsx';
import SaveIndicator from '../SaveIndicator.jsx';
import ShareDialog from '../unisave/ShareDialog.jsx';
import Facepile from '../collab/Facepile.jsx';
import {
  BACKGROUNDS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  INKS,
  TOOLS,
  WIDTHS,
  hitsShape,
  isDegenerate,
  makeShape,
} from '../../lib/templates/canvas.js';
import { useData } from '../../context/DataContext.jsx';
import { useT } from '../../i18n/index.jsx';

const HISTORY_LIMIT = 60;
const ERASER_RADIUS = 14;

export default function BoardEditor({ boardId, onBack }) {
  const { t } = useT();
  const { boards, update, remove, mayEdit } = useData();

  const board = boards.find((item) => item.id === boardId);
  const editable = mayEdit(board);

  const [tool, setTool] = useState('pen');
  const [ink, setInk] = useState(INKS[0].value);
  const [width, setWidth] = useState(WIDTHS[1].value);
  const [drawing, setDrawing] = useState(null);
  const [textAt, setTextAt] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [sharing, setSharing] = useState(false);

  const surfaceRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [historyDepth, setHistoryDepth] = useState([0, 0]);

  const shapes = board?.shapes ?? [];

  /** Commit a new shape list, remembering the old one so undo can get back. */
  const commit = useCallback(
    (next, previous) => {
      undoStack.current.push(previous);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current = [];
      setHistoryDepth([undoStack.current.length, 0]);
      update('boards', boardId, { shapes: next });
    },
    [boardId, update],
  );

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(board?.shapes ?? []);
    setHistoryDepth([undoStack.current.length, redoStack.current.length]);
    update('boards', boardId, { shapes: previous }, { immediate: true });
  }, [board, boardId, update]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(board?.shapes ?? []);
    setHistoryDepth([undoStack.current.length, redoStack.current.length]);
    update('boards', boardId, { shapes: next }, { immediate: true });
  }, [board, boardId, update]);

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  /**
   * Screen coordinates to board coordinates.
   *
   * The SVG is laid out with preserveAspectRatio, so it is letterboxed inside
   * its box and the offset is not simply the element's top-left corner. Work it
   * out from the rendered scale rather than assuming the two boxes line up.
   */
  const toBoard = useCallback((event) => {
    const svg = surfaceRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / BOARD_WIDTH, rect.height / BOARD_HEIGHT);
    const drawnWidth = BOARD_WIDTH * scale;
    const drawnHeight = BOARD_HEIGHT * scale;
    const originX = rect.left + (rect.width - drawnWidth) / 2;
    const originY = rect.top + (rect.height - drawnHeight) / 2;
    return {
      x: Math.round((event.clientX - originX) / scale),
      y: Math.round((event.clientY - originY) / scale),
    };
  }, []);

  const erase = useCallback(
    (point) => {
      const survivors = shapes.filter((shape) => !hitsShape(shape, point.x, point.y, ERASER_RADIUS));
      if (survivors.length !== shapes.length) commit(survivors, shapes);
    },
    [shapes, commit],
  );

  const onPointerDown = (event) => {
    if (!editable || event.button === 2) return;
    const point = toBoard(event);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === 'eraser') {
      setDrawing({ type: 'eraser' });
      erase(point);
      return;
    }

    if (tool === 'text') {
      setTextAt(point);
      return;
    }

    if (tool === 'pen') {
      setDrawing(makeShape('pen', { points: [point.x, point.y], colour: ink, width }));
      return;
    }

    if (tool === 'rect' || tool === 'ellipse') {
      setDrawing(makeShape(tool, { x: point.x, y: point.y, w: 0, h: 0, colour: ink, width }));
      return;
    }

    setDrawing(makeShape(tool, { x1: point.x, y1: point.y, x2: point.x, y2: point.y, colour: ink, width }));
  };

  const onPointerMove = (event) => {
    if (!drawing) return;
    const point = toBoard(event);

    if (drawing.type === 'eraser') {
      erase(point);
      return;
    }

    setDrawing((current) => {
      if (!current) return current;
      if (current.type === 'pen') {
        const points = current.points;
        // Skip points closer than 2 units: at 120Hz a slow hand produces a
        // hundred coordinates that all round to the same place.
        const lastX = points[points.length - 2];
        const lastY = points[points.length - 1];
        if (Math.hypot(point.x - lastX, point.y - lastY) < 2) return current;
        return { ...current, points: [...points, point.x, point.y] };
      }
      if (current.type === 'rect' || current.type === 'ellipse') {
        return { ...current, w: point.x - current.x, h: point.y - current.y };
      }
      return { ...current, x2: point.x, y2: point.y };
    });
  };

  const onPointerUp = () => {
    if (!drawing) return;
    if (drawing.type !== 'eraser' && !isDegenerate(drawing)) {
      commit([...shapes, drawing], shapes);
    }
    setDrawing(null);
  };

  const addText = (value) => {
    const text = value.trim();
    if (!text || !textAt) return;
    commit(
      [...shapes, makeShape('text', { x: textAt.x, y: textAt.y, text, colour: ink, size: 20 + width * 2.4 })],
      shapes,
    );
  };

  if (!board) {
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

  const [undoDepth, redoDepth] = historyDepth;

  return (
    <div className="board-page">
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
            value={board.title ?? ''}
            readOnly={!editable}
            aria-label={t('canvas.boardTitle')}
            onChange={(event) => update('boards', boardId, { title: event.target.value })}
            onBlur={(event) =>
              update(
                'boards',
                boardId,
                { title: event.target.value.trim() || t('common.untitled') },
                { immediate: true },
              )
            }
          />
          <div className="editor-title-meta">
            <SaveIndicator />
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{t('canvas.shapeCount', { count: shapes.length })}</span>
          </div>
        </div>

        <div className="editor-header-actions">
          <Facepile document={board} onShare={() => setSharing(true)} />
          <button type="button" className="button ghost" onClick={() => setSharing(true)}>
            <Icon name="share" size={16} />
            {t('unisave.share')}
          </button>
          {editable ? (
            <button
              type="button"
              className="button danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              {t('common.delete')}
            </button>
          ) : null}
        </div>
      </header>

      {editable ? (
        <div className="board-toolbar" role="toolbar" aria-label={t('canvas.tools')}>
          <div className="tool-group">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tool-button ${tool === item.id ? 'is-active' : ''}`}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                aria-pressed={tool === item.id}
                onClick={() => setTool(item.id)}
              >
                <Icon name={item.icon} size={18} />
              </button>
            ))}
          </div>

          <div className="tool-group" role="group" aria-label={t('canvas.colour')}>
            {INKS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`board-ink ${ink === item.value ? 'is-active' : ''}`}
                style={{ background: item.value }}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                aria-pressed={ink === item.value}
                onClick={() => setInk(item.value)}
              />
            ))}
          </div>

          <div className="tool-group" role="group" aria-label={t('canvas.width')}>
            {WIDTHS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`board-width ${width === item.value ? 'is-active' : ''}`}
                title={t(item.labelKey)}
                aria-label={t(item.labelKey)}
                aria-pressed={width === item.value}
                onClick={() => setWidth(item.value)}
              >
                <span style={{ height: Math.max(2, item.value / 2), background: ink }} />
              </button>
            ))}
          </div>

          <label className="select-field">
            <span className="sr-only">{t('canvas.background')}</span>
            <select
              value={board.background ?? 'grid'}
              onChange={(event) =>
                update('boards', boardId, { background: event.target.value }, { immediate: true })
              }
            >
              {BACKGROUNDS.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <div className="tool-group push-right">
            <button
              type="button"
              className="icon-button"
              title={t('notes.undo')}
              aria-label={t('notes.undo')}
              onClick={undo}
              disabled={undoDepth === 0}
            >
              <Icon name="undo" size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t('notes.redo')}
              aria-label={t('notes.redo')}
              onClick={redo}
              disabled={redoDepth === 0}
            >
              <Icon name="redo" size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              title={t('canvas.clear')}
              aria-label={t('canvas.clear')}
              onClick={() => setConfirmClear(true)}
              disabled={shapes.length === 0}
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        </div>
      ) : (
        <p className="board-readonly">
          <Icon name="lock" size={15} className="notice-icon" />
          {t('share.viewerOnly')}
        </p>
      )}

      <div className="board-surface">
        <BoardView
          svgRef={surfaceRef}
          id={`board-${boardId}`}
          shapes={drawing && drawing.type !== 'eraser' ? [...shapes, drawing] : shapes}
          background={board.background ?? 'grid'}
          className={`is-live is-${tool} ${editable ? '' : 'is-locked'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>

      {textAt ? (
        <PromptDialog
          title={t('canvas.addText')}
          label={t('canvas.textLabel')}
          initialValue=""
          confirmLabel={t('common.add')}
          cancelLabel={t('common.cancel')}
          onConfirm={addText}
          onClose={() => setTextAt(null)}
        />
      ) : null}

      {confirmClear ? (
        <ConfirmDialog
          title={t('canvas.clearTitle')}
          message={t('canvas.clearBody')}
          confirmLabel={t('canvas.clear')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => commit([], shapes)}
          onClose={() => setConfirmClear(false)}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title={t('canvas.deleteBoardTitle', { name: board.title })}
          message={t('common.deleteForeverWarning')}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => {
            remove('boards', boardId);
            onBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}

      {sharing ? (
        <ShareDialog document={board} onClose={() => setSharing(false)} />
      ) : null}
    </div>
  );
}
