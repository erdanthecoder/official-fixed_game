import SheetEditor from './SheetEditor.jsx';
import SheetsDashboard from './SheetsDashboard.jsx';

export default function SheetsModule({ sheetId, onOpen, onBack }) {
  if (sheetId) return <SheetEditor sheetId={sheetId} onBack={onBack} />;
  return <SheetsDashboard onOpen={onOpen} />;
}
