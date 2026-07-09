/**
 * AI Fight Club Database Schema
 * 10 tables for accountability platform
 */

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'member' | 'admin';
  joined_date: Date;
  current_stage_id: string | null;
  timezone: string;
  is_blocked: boolean; // derived: true if any overdue submission exists and isn't excused
  created_at: Date;
  updated_at: Date;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface Stage {
  id: string;
  name: string;
  order_index: number;
  description: string;
  created_at: Date;
  updated_at: Date;
}

export interface Topic {
  id: string;
  stage_id: string;
  name: string;
  order_index: number;
  resources: {
    books?: string[];
    courses?: string[];
    articles?: string[];
    docs?: string[];
  };
  created_at: Date;
  updated_at: Date;
}

export interface WeeklyTask {
  id: string;
  topic_id: string;
  week_number: number;
  assigned_date: Date;
  due_date: Date;
  required_milestones: ('reading' | 'video' | 'notes' | 'coding' | 'mini_project' | 'quiz' | 'discussion')[];
  created_at: Date;
  updated_at: Date;
}

export interface Submission {
  id: string;
  user_id: string;
  weekly_task_id: string;
  milestone_type: 'reading' | 'video' | 'notes' | 'coding' | 'mini_project' | 'quiz' | 'discussion';
  status: 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'overdue' | 'excused';
  submitted_at: Date | null;
  github_url: string | null;
  notes_content: string | null;
  quiz_score: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Review {
  id: string;
  submission_id: string;
  reviewer_id: string;
  feedback: string | null;
  decision: 'approve' | 'changes_requested' | 'reject' | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Streak {
  user_id: string;
  current_streak_weeks: number;
  longest_streak_weeks: number;
  last_complete_week: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Achievement {
  id: string;
  user_id: string;
  type: 'streak_4' | 'streak_12' | 'stage_complete' | 'capstone_complete' | 'first_review_given' | 'first_submission' | 'perfect_week';
  earned_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DiscussionSession {
  id: string;
  topic_id: string;
  scheduled_at: Date;
  host_id: string;
  attendee_ids: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Excuse {
  id: string;
  submission_id: string;
  granted_by_admin_id: string;
  reason: string;
  granted_at: Date;
  created_at: Date;
  updated_at: Date;
}

// API Types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SubmissionRequest {
  weekly_task_id: string;
  milestone_type: string;
  github_url?: string;
  notes_content?: string;
  quiz_score?: number;
}

export interface ReviewRequest {
  feedback: string;
  decision: 'approve' | 'changes_requested' | 'reject';
}

export interface ExcuseRequest {
  reason: string;
}
