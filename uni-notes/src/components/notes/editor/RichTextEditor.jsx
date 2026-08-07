import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { findCommand } from '../../../lib/shortcuts.js';

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

const BLOCK_TAGS = ['blockquote', 'h1', 'h2', 'h3', 'p'];

/**
 * What size and font the caret is actually sitting in.
 *
 * Read off the rendered element, so it is right whether the size came from a
 * span this toolbar wrote, from a heading's own stylesheet rule, or from the
 * document's base size — which is what makes the picker agree with the screen
 * instead of with the last button that was pressed.
 */
function measureType() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { fontSize: null, fontFamily: null };
  const node = selection.getRangeAt(0).startContainer;
  const el = node.nodeType === 1 ? node : node.parentElement;
  if (!el) return { fontSize: null, fontFamily: null };
  const style = getComputedStyle(el);
  return {
    fontSize: Math.round(parseFloat(style.fontSize)) || null,
    fontFamily: style.fontFamily || null,
  };
}

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
      strikethrough: query('strikeThrough'),
      unorderedList: query('insertUnorderedList'),
      orderedList: query('insertOrderedList'),
      // Which way the paragraph is aligned. Reported as one value rather than
      // three booleans so the toolbar can light exactly one button — three
      // separate queries can all answer false on a default paragraph, and then
      // nothing looks selected when something clearly is.
      align: query('justifyCenter') ? 'center' : query('justifyRight') ? 'right' : 'left',
      block,
      // Measured rather than queried. `queryCommandValue('fontSize')` answers
      // in the 1-7 scale, so it cannot tell 15px from 17px; the computed style
      // of the element the caret is in can.
      ...measureType(),
    });
  }, [onSelectionChange]);

  /**
   * The shortcuts that Docs users already have in their hands.
   *
   * Read from the same list the help dialog prints, so a shortcut that is
   * documented is a shortcut that runs. Ctrl+B/I/U are left to the browser —
   * it already does them, and intercepting them only creates a second
   * implementation that can disagree with the first.
   */
  const onKeyDown = useCallback(
    (event) => {
      /*
       * Enter inside a checklist makes another checklist item.
       *
       * Without this the list continues as a plain bullet and every item after
       * the first has to have its box pasted in by hand — which is the point at
       * which people stop using the feature. An empty item leaves the list, the
       * same way a bullet list ends everywhere else.
       */
      if (event.key === 'Enter' && !event.shiftKey) {
        const selection = window.getSelection();
        const node = selection?.anchorNode;
        const item = (node?.nodeType === 1 ? node : node?.parentElement)?.closest?.(
          'ul.uni-checklist li',
        );
        if (item) {
          const bare = item.textContent.replace(/[\u2610\u2611\s\u00a0]/g, '') === '';
          if (bare) {
            /*
             * Leaving the list is done by hand rather than with
             * `insertParagraph`. Removing the item first destroys the selection
             * the command needs, so it put its new block back inside the list —
             * which left an empty bullet behind every single time. Building the
             * paragraph and placing the caret in it explicitly has no such
             * dependency on where the selection happened to survive.
             */
            event.preventDefault();
            const list = item.closest('ul.uni-checklist');
            item.remove();
            const para = document.createElement('p');
            para.innerHTML = '<br>';
            list?.after(para);
            if (list && list.children.length === 0) list.remove();
            const caret = document.createRange();
            caret.setStart(para, 0);
            caret.collapse(true);
            const selection2 = window.getSelection();
            selection2?.removeAllRanges();
            selection2?.addRange(caret);
            reportChange();
            reportSelection();
            return;
          }
          event.preventDefault();
          document.execCommand(
            'insertHTML',
            false,
            '<li><span class="uni-check">\u2610</span>&nbsp;</li>',
          );
          reportChange();
          reportSelection();
          return;
        }
      }

      const hit = findCommand(event);
      if (!hit || ['bold', 'italic', 'underline'].includes(hit.command)) return;
      event.preventDefault();
      const [name, arg] = hit.command.split(':');
      if (name === 'link') {
        // The link tool owns the popover and the selection dance; asking for it
        // by event keeps that logic in one place.
        document.dispatchEvent(new CustomEvent('uni:link'));
        return;
      }
      document.execCommand(name, false, arg ? `<${arg}>` : undefined);
      reportSelection();
      reportChange();
    },
    [reportSelection, reportChange],
  );

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

      /**
       * Text size, in real pixels.
       *
       * `execCommand('fontSize')` only understands the seven HTML font sizes —
       * 1 to 7 — which is a range from tiny to enormous with nothing useful in
       * between, and it writes `<font>` tags that no stylesheet can reach. So:
       * ask for size 7, then rewrite whatever the browser produced into a span
       * carrying the size that was actually asked for. Both shapes are handled
       * because the two engines disagree — with styleWithCSS on, Chromium
       * writes `<span style="font-size: xxx-large">` and older paths still
       * write `<font size="7">`.
       *
       * The rewrite costs this one step in the native undo stack, which is why
       * it happens once at the end rather than per node.
       */
      setFontSize(px) {
        restoreSelection();
        try {
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('fontSize', false, '7');
        } catch (error) {
          console.warn('Text size failed.', error);
          return;
        }

        const root = editorRef.current;
        if (root) {
          for (const node of root.querySelectorAll('font[size="7"]')) {
            const span = document.createElement('span');
            span.style.fontSize = `${px}px`;
            span.innerHTML = node.innerHTML;
            node.replaceWith(span);
          }
          for (const node of root.querySelectorAll('span')) {
            // The marker the browser just wrote, and nothing else: a span that
            // already carries a pixel size is somebody's earlier choice.
            if (node.style.fontSize === 'xxx-large') node.style.fontSize = `${px}px`;
          }
        }

        reportChange();
        reportSelection();
      },

      setFontFamily(stack) {
        restoreSelection();
        try {
          document.execCommand('styleWithCSS', false, true);
          document.execCommand('fontName', false, stack);
        } catch (error) {
          console.warn('Font failed.', error);
        }
        reportChange();
        reportSelection();
      },

      /**
       * A checklist you can actually start.
       *
       * Ticking a box has worked since the day it was written and there was no
       * way to make one — checklists only ever arrived inside a template, so
       * the feature existed and was unreachable from the toolbar.
       */
      insertChecklist() {
        restoreSelection();
        try {
          document.execCommand(
            'insertHTML',
            false,
            '<ul class="uni-checklist"><li><span class="uni-check">\u2610</span>&nbsp;</li></ul>',
          );
        } catch (error) {
          console.warn('Checklist failed.', error);
        }
        reportChange();
        reportSelection();
      },

      /** The element itself, for find-and-replace to walk. */
      root: () => editorRef.current,

      /** Put the caret on a range found by something else, and show it. */
      select(range) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        savedRange.current = range.cloneRange();
        const box = range.getBoundingClientRect();
        if (box.height) {
          range.startContainer.parentElement?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
        }
      },

      /** Swap the text inside a range, keeping the document's own undo step. */
      replaceRange(range, text) {
        range.deleteContents();
        range.insertNode(document.createTextNode(text));

        /*
         * Sweep up the empty formatting tags the deletion leaves behind.
         *
         * A match that straddles a bold run — "Bris<b>tol</b>" — has half its
         * characters inside the <b>. Deleting the range empties that element
         * without removing it, and an empty <b> is not merely untidy: the caret
         * can land inside it, so the next thing typed there comes out bold for
         * no reason the writer can see.
         *
         * Elements holding an image or a line break are left alone; those are
         * empty of text on purpose.
         */
        const root = editorRef.current;
        if (root) {
          for (const el of root.querySelectorAll('b, strong, i, em, u, s, span, mark, font')) {
            if (!el.textContent && !el.querySelector('img, br')) el.remove();
          }
        }

        reportChange();
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
      onKeyDown={onKeyDown}
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
