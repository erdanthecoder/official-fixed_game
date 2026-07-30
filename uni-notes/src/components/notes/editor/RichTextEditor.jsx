import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * The white canvas.
 *
 * It's an uncontrolled `contentEditable` on purpose: React re-rendering the
 * innerHTML on every keystroke would fight the browser's caret and wipe out the
 * native undo stack. Instead we seed the HTML when the document changes and
 * report edits back up through `onChange`.
 *
 * Formatting uses `document.execCommand`. It's legacy, but it's the only API
 * that gives bold/italic/lists/colour *plus* a working native undo history with
 * zero dependencies — which is exactly the trade this app wants. Everything is
 * funnelled through the imperative handle below, so replacing it with a real
 * editor engine later means rewriting this one file.
 */

const BLOCK_TAGS = ['h1', 'h2', 'h3', 'p'];

const RichTextEditor = forwardRef(function RichTextEditor(
  { documentId, initialHtml, onChange, onSelectionChange },
  ref,
) {
  const editorRef = useRef(null);
  const savedRange = useRef(null);

  // Seed content when a different document is opened (not on every keystroke).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = initialHtml || '<p><br /></p>';
    savedRange.current = null;
    // Colour/highlight commands should emit inline styles, not <font> tags.
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch {
      /* older browsers simply keep their default behaviour */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    const insideEditor =
      selection?.rangeCount > 0 && el.contains(selection.getRangeAt(0).commonAncestorContainer);

    if (insideEditor) return;

    el.focus();
    if (savedRange.current) {
      selection?.removeAllRanges();
      selection?.addRange(savedRange.current);
    }
  }, []);

  const reportChange = useCallback(() => {
    onChange?.(editorRef.current?.innerHTML ?? '');
  }, [onChange]);

  /** Read back which formats apply to the caret so the toolbar can light up. */
  const reportSelection = useCallback(() => {
    if (!editorRef.current) return;
    const query = (command) => {
      try {
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };

    let block = 'p';
    try {
      const value = (document.queryCommandValue('formatBlock') || '').toLowerCase();
      if (BLOCK_TAGS.includes(value)) block = value;
    } catch {
      /* ignore — the toolbar just shows "Normal text" */
    }

    onSelectionChange?.({
      bold: query('bold'),
      italic: query('italic'),
      underline: query('underline'),
      unorderedList: query('insertUnorderedList'),
      orderedList: query('insertOrderedList'),
      block,
    });
  }, [onSelectionChange]);

  // Keep the toolbar in sync while the caret moves around.
  useEffect(() => {
    const onSelectionChangeEvent = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      if (!editorRef.current?.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
      rememberSelection();
      reportSelection();
    };
    document.addEventListener('selectionchange', onSelectionChangeEvent);
    return () => document.removeEventListener('selectionchange', onSelectionChangeEvent);
  }, [rememberSelection, reportSelection]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editorRef.current?.focus(),

      exec(command, value = null) {
        restoreSelection();
        try {
          document.execCommand(command, false, value);
        } catch (error) {
          console.warn(`Formatting command "${command}" failed.`, error);
        }
        reportChange();
        reportSelection();
      },

      /** Toggle a heading level off again if it's already applied. */
      toggleBlock(tag, currentBlock) {
        const next = currentBlock === tag ? 'p' : tag;
        this.exec('formatBlock', `<${next}>`);
      },

      insertHtml(html) {
        restoreSelection();
        try {
          document.execCommand('insertHTML', false, html);
        } catch (error) {
          // Fallback: append at the end rather than losing the insert entirely.
          if (editorRef.current) editorRef.current.innerHTML += html;
          console.warn('insertHTML failed, appended instead.', error);
        }
        reportChange();
        reportSelection();
      },

      getHtml: () => editorRef.current?.innerHTML ?? '',
    }),
    [restoreSelection, reportChange, reportSelection],
  );

  /** Checklist boxes are plain spans — clicking one ticks it. */
  const handleClick = (event) => {
    const box = event.target.closest?.('.uni-check');
    if (!box) return;
    const ticked = box.textContent.trim() === '☑';
    box.textContent = ticked ? '☐' : '☑';
    box.closest('li')?.classList.toggle('is-done', !ticked);
    reportChange();
  };

  /** Paste as plain-ish text so copied web pages don't drag in their styling. */
  const handlePaste = (event) => {
    const text = event.clipboardData?.getData('text/plain');
    if (text == null) return;
    event.preventDefault();
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .split(/\n{2,}/)
      .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
      .join('');
    document.execCommand('insertHTML', false, escaped);
    reportChange();
  };

  return (
    <div
      ref={editorRef}
      className="editor-canvas"
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      aria-multiline="true"
      aria-label="Document content"
      onInput={reportChange}
      onBlur={() => {
        rememberSelection();
        reportChange();
      }}
      onClick={handleClick}
      onPaste={handlePaste}
      onKeyUp={reportSelection}
    />
  );
});

export default RichTextEditor;
