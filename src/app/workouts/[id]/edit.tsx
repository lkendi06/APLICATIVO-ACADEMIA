import { useLocalSearchParams } from 'expo-router';

import { ErrorView, LoadingView } from '@/components/ui';
import { PlanEditor } from '@/components/workout/PlanEditor';
import { usePlan } from '@/hooks/queries';

export default function EditPlan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  if (plan.isLoading) return <LoadingView />;
  if (plan.error || !plan.data) return <ErrorView error={plan.error} onRetry={plan.refetch} />;
  return <PlanEditor plan={plan.data} />;
}
