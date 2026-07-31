import BoardEditor from './BoardEditor.jsx';
import CanvasDashboard from './CanvasDashboard.jsx';

export default function CanvasModule({ boardId, onOpen, onBack }) {
  if (boardId) return <BoardEditor boardId={boardId} onBack={onBack} />;
  return <CanvasDashboard onOpen={onOpen} />;
}
