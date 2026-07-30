import NoteEditor from './NoteEditor.jsx';
import NotesDashboard from './NotesDashboard.jsx';

/** Notes: the card dashboard, or one document open in the editor. */
export default function NotesModule({ noteId, folderId, onOpen, onBack }) {
  if (noteId) return <NoteEditor noteId={noteId} onBack={onBack} />;
  return <NotesDashboard folderId={folderId} onOpen={onOpen} />;
}
