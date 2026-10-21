import type { HackathonFeatureKey } from '@/lib/types';

export const FEATURE_OPTIONS: { key: HackathonFeatureKey; label: string; description: string }[] = [
  { key: 'ideas', label: 'Idea submission (phase 1: plan)', description: 'Teams first submit an idea (problem, approach, plan). You review it and can require approval before the project phase.' },
  { key: 'submissions', label: 'Project submissions (phase 2: implement)', description: 'Registered teams submit their project (repo, demo, video, slides) before a deadline you set.' },
  { key: 'judging', label: 'Judging', description: 'Judges score submissions against a rubric you define; scores are averaged into a leaderboard.' },
  { key: 'check_in', label: 'Check-in', description: 'Each participant gets a QR code; you or volunteers scan it on the day to record who arrived.' },
  { key: 'certificates', label: 'Certificates', description: 'Participants download a certificate with a code anyone can verify, once you release them.' },
  { key: 'team_finder', label: 'Team finder', description: 'Solo participants list their skills and teams that are recruiting say who they need.' },
  { key: 'showcase', label: 'Project showcase', description: 'After results are published, submitted projects appear in a public gallery.' },
];
