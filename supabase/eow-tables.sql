-- Day off / half day tracking
-- Run this in the Supabase SQL editor if these tables don't exist yet

CREATE TABLE IF NOT EXISTS public.day_off (
  id         serial PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  day        text NOT NULL,
  type       text CHECK (type IN ('off', 'half')) NOT NULL,
  UNIQUE(user_id, week_start, day)
);

ALTER TABLE public.day_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own day offs" ON public.day_off;
CREATE POLICY "Users can manage their own day offs"
  ON public.day_off FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- EOW report storage
CREATE TABLE IF NOT EXISTS public.eow_reports (
  id          serial PRIMARY KEY,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  member_name text NOT NULL,
  week_of     text NOT NULL,
  report_text text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.eow_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own EOW reports" ON public.eow_reports;
CREATE POLICY "Users can read their own EOW reports"
  ON public.eow_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert EOW reports" ON public.eow_reports;
CREATE POLICY "Service role can insert EOW reports"
  ON public.eow_reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read all EOW reports" ON public.eow_reports;
CREATE POLICY "Admins can read all EOW reports"
  ON public.eow_reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
