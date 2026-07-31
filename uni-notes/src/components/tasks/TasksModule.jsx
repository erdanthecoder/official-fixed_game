import PlanEditor from './PlanEditor.jsx';
import TasksDashboard from './TasksDashboard.jsx';

export default function TasksModule({ planId, onOpen, onBack }) {
  if (planId) return <PlanEditor planId={planId} onBack={onBack} />;
  return <TasksDashboard onOpen={onOpen} />;
}
