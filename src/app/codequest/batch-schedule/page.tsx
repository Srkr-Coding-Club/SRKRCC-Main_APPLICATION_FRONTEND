import type { Metadata } from 'next';
import BatchScheduleClient from './BatchScheduleClient';

// Auth-gated admin tool: never CDN-cache the shell as a public page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CodeQuest Batch Scheduling',
  description: 'Schedule multiple CodeQuest problems with individual dates.',
};

export default function CodeQuestBatchSchedulePage() {
  return <BatchScheduleClient />;
}
