import DeckWorkspace from './DeckWorkspace.jsx';
import DecksDashboard from './DecksDashboard.jsx';

export default function LanguagesModule({ deckId, onOpen, onBack }) {
  if (deckId) return <DeckWorkspace deckId={deckId} onBack={onBack} />;
  return <DecksDashboard onOpen={onOpen} />;
}
