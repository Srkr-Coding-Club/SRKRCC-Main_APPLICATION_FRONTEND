export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'MEMBER' | 'VOLUNTEER' | 'JUDGE' | 'CLUB_LEAD' | 'ADMIN';
  roll_number?: string;
  branch?: string;
  year?: number;
}

export interface Event {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  venue: string;
  capacity: number;
  start_time: string;
  end_time: string;
}

export interface Hackathon {
  id: number;
  title: string;
  slug: string;
  is_flagship: boolean;
  theme: string;
  description: string;
  prize_pool: string;
  start_date: string;
  end_date: string;
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  scheduled_date: string;
}

export interface JobListing {
  id: number;
  title: string;
  slug: string;
  company_name: string;
  job_type: 'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME';
  location: string;
  deadline: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published_at?: string;
}
