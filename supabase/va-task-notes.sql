-- Task notes: one note per task per week per user
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS va_task_notes (
  id          serial PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id     int  NOT NULL,   -- matches task_completions convention: custom tasks use id + 10000
  week_start  date NOT NULL,
  note        text,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, task_id, week_start)
);

ALTER TABLE va_task_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own task notes"
  ON va_task_notes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
