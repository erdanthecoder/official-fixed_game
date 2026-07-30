import DeckEditor from './DeckEditor.jsx';
import SlidesDashboard from './SlidesDashboard.jsx';

export default function SlidesModule({ deckId, onOpen, onBack }) {
  if (deckId) return <DeckEditor deckId={deckId} onBack={onBack} />;
  return <SlidesDashboard onOpen={onOpen} />;
}
