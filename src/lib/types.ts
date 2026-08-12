export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  updated_at?: string;
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
  image_url?: string;
  form_slug?: string;
  speaker?: string;
  tags?: string[];
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
  image_url?: string;
  form_slug?: string;
  tracks?: string[];
  team_size?: string;
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statement: string;
  scheduled_date: string;
  points?: number;
  solved_count?: number;
  tags?: string[];
  constraints?: string;
}

export interface JobListing {
  id: number;
  title: string;
  slug: string;
  company_name: string;
  company_logo?: string;
  job_type: 'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME';
  location: string;
  stipend?: string;
  deadline: string;
  description?: string;
  form_slug?: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author?: any;
  author_role?: string;
  read_time?: string;
  category?: string;
  image_url?: string;
  cover_image?: string;
  tags?: string[];
  published_at?: string;
}

export interface FormField {
  id: number | string;
  label: string;
  type: 'TEXT' | 'PARAGRAPH' | 'EMAIL' | 'NUMBER' | 'DROPDOWN' | 'RADIO' | 'CHECKBOX' | 'FILE' | 'DATE' | 'TIME' | 'SECTION';
  placeholder?: string;
  is_required: boolean;
  options?: string[];
  conditional_logic?: string;
  order: number;
}

export interface Form {
  id: number | string;
  title: string;
  slug: string;
  description: string;
  image_url?: string;
  category?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'CLOSED';
  open_at?: string;
  close_at?: string;
  fields?: FormField[];
  created_at?: string;
  updated_at?: string;
}

