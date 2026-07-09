-- AI Fight Club PostgreSQL schema
-- Designed for Neon Postgres and Vercel Functions.

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_stage_id TEXT,
  timezone TEXT DEFAULT 'UTC',
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "user" (email);
CREATE INDEX IF NOT EXISTS idx_user_role ON "user" (role);
CREATE INDEX IF NOT EXISTS idx_user_is_blocked ON "user" (is_blocked);

CREATE TABLE IF NOT EXISTS stage (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  resources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stage_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_topic_stage_id ON topic (stage_id);

CREATE TABLE IF NOT EXISTS weekly_task (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  assigned_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  required_milestones JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_task_topic_id ON weekly_task (topic_id);
CREATE INDEX IF NOT EXISTS idx_weekly_task_due_date ON weekly_task (due_date);

CREATE TABLE IF NOT EXISTS submission (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  weekly_task_id TEXT NOT NULL REFERENCES weekly_task(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('reading', 'video', 'notes', 'coding', 'mini_project', 'quiz', 'discussion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in_review', 'approved', 'rejected', 'overdue', 'excused')),
  submitted_at TIMESTAMPTZ NULL,
  github_url TEXT,
  notes_content TEXT,
  quiz_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, weekly_task_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_submission_user_id ON submission (user_id);
CREATE INDEX IF NOT EXISTS idx_submission_weekly_task_id ON submission (weekly_task_id);
CREATE INDEX IF NOT EXISTS idx_submission_status ON submission (status);

CREATE TABLE IF NOT EXISTS review (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  feedback TEXT NULL,
  decision TEXT NULL CHECK (decision IS NULL OR decision IN ('approve', 'changes_requested', 'reject')),
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_submission_id ON review (submission_id);
CREATE INDEX IF NOT EXISTS idx_review_reviewer_id ON review (reviewer_id);

CREATE TABLE IF NOT EXISTS streak (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  current_streak_weeks INTEGER NOT NULL DEFAULT 0,
  longest_streak_weeks INTEGER NOT NULL DEFAULT 0,
  last_complete_week TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievement (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('streak_4', 'streak_12', 'stage_complete', 'capstone_complete', 'first_review_given', 'first_submission', 'perfect_week')),
  earned_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_achievement_user_id ON achievement (user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_type ON achievement (type);

CREATE TABLE IF NOT EXISTS discussion_session (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  host_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  attendee_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_session_topic_id ON discussion_session (topic_id);
CREATE INDEX IF NOT EXISTS idx_discussion_session_scheduled_at ON discussion_session (scheduled_at);

CREATE TABLE IF NOT EXISTS excuse (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
  granted_by_admin_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_excuse_submission_id ON excuse (submission_id);
CREATE INDEX IF NOT EXISTS idx_excuse_admin_id ON excuse (granted_by_admin_id);
