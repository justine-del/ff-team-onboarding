-- Seed Phase 1 Tasks
insert into public.phase1_tasks (task_name, description, responsible, login_type, sort_order, phase) values
('Get Team Member Email', 'Collect and verify company email for new member', 'Founder', 'Admin setup', 1, 1),
('Add to Slack Workspace', 'Invite team member to the company Slack workspace', 'Founder', 'Add Team Member''s company email', 2, 1),
('VA Geekbot Access Set Up', 'Configure Geekbot standup access for the member', 'Founder', 'Geekbot admin setup', 3, 1),
('Add to All Slack Channels', 'Add member to all relevant Slack channels', 'Founder', 'Slack admin', 4, 1),
('Loom', 'Grant Loom workspace access', 'Founder', 'Add Team Member''s company email', 5, 1),
('Claude (Anthropic)', 'Set up Claude AI access for the member', 'Founder', 'Add Team Member''s company email', 6, 1),
('ChatGPT', 'Set up ChatGPT account access', 'Founder', 'Add Team Member''s company email', 7, 1),
('Notebook LM Brain', 'Share Notebook LM brain/project with member', 'Founder', 'Share via Google account', 8, 1),
('Google Drive Access', 'Grant access to company Google Drive folders', 'Founder', 'Add Team Member''s company email', 9, 1),
('Text Blaze / AI Blaze Access Setup', 'Set up Text Blaze snippet access', 'Founder', 'Team Member creates account', 10, 1),
('Fireflies.ai', 'Add team member to Fireflies workspace', 'Founder', 'Add Team Member''s company email', 11, 1),
('Create & Send Onboarding Sheet', 'Create personalized onboarding tracker and share with member', 'Founder', 'Google Sheets', 12, 1),
('Send Phase 1 Completion Message', 'Send confirmation message when Phase 1 setup is complete', 'Founder', 'Slack message', 13, 1),
('Miro Account Access', 'Add team member to Miro workspace', 'Founder', 'Add Team Member''s company email', 14, 1),
('Miro Template Library Access', 'Share Miro template library with member', 'Founder', 'Miro workspace', 15, 1),
('Outreach Platform Access', 'Set up access to outreach platform', 'Founder', 'Platform-specific setup', 16, 1),
('Outreach Templates & Scripts', 'Share outreach templates and scripts folder', 'Founder', 'Google Drive share', 17, 1),
('Target List / Lead Source', 'Provide access to target lists and lead sources', 'Founder', 'Google Sheets / CRM access', 18, 1);

-- Seed Incubator Lessons
insert into public.incubator_lessons (category, lesson_name, description, loom_link, benchmark_mins, sort_order) values
('Orientation - Video', 'START HERE', 'Watch this first — overview of the Cyborg VA program and what to expect', '', 10, 1),
('Orientation - Video', 'The Cyborg VA Roles', 'Understand the different VA roles and responsibilities within the team', '', 15, 2),
('Orientation - Video', 'Claude brain / GPT brain', 'How to use Claude and ChatGPT as your AI thinking partners', '', 20, 3),
('Orientation - Video', 'Business Fundamentals', 'Core business concepts you need to understand to succeed in this role', '', 25, 4),
('Orientation - Video', 'Customer Journey', 'Map the client experience from lead to loyal customer', '', 20, 5),
('Orientation - Video', 'Elite values & Mindset', 'The mindset and values that define elite performance at Funnel Futurist', '', 15, 6),
('Ramp - Video', 'Core Skills', 'Essential skills every Cyborg VA must master', '', 30, 7),
('Ramp - Video', 'Core Tools', 'Deep dive into the tools you''ll use every day', '', 30, 8),
('Ramp - Video', '3D Framework', 'The 3D Framework for delivering exceptional work', '', 20, 9),
('Ramp - Video', '2-min Intro Loom', 'Create your introduction Loom video for the team', '', 10, 10),
('Ramp - Video', 'Daily/Weekly SOP', 'Learn your daily and weekly standard operating procedures', '', 20, 11),
('Ramp - Video', 'AI Essentials - Mastery', 'Master the AI tools that power your work as a Cyborg VA', '', 45, 12),
('Ramp - Video', 'Gemini for Document Creation', 'Use Gemini AI to create professional documents faster', '', 30, 13),
('Ramp - Video', 'The Omnipresent Organic Authority System', 'Build and manage omnipresent organic content systems', '', 45, 14),
('Ramp - Video', 'Complete Go Highlevel Guide', 'Full training on Go HighLevel CRM and marketing automation', '', 60, 15),
('Ramp - Video', 'Omnipresent Authority Ads Training', 'Learn to run and manage authority-building ad campaigns', '', 45, 16),
('Quiz', 'ORIENTATION QUIZ', 'Complete the orientation quiz to confirm you''ve absorbed the fundamentals', '', 15, 17);

-- Seed SOP Documents
insert into public.sop_documents (priority, document_name, link, est_minutes, sort_order) values
('CRITICAL', 'Funnel Futurist Overview', 'Master SOP Documentation', 45, 1),
('CRITICAL', 'Daily Sheet Tracking Update', 'Master SOP Documentation', 30, 2),
('CRITICAL', 'Weekly Reporting', 'Master SOP Documentation', 30, 3),
('CRITICAL', 'Accountability', 'Master SOP Documentation', 20, 4),
('CRITICAL', 'Data Privacy & Security', 'Master SOP Documentation', 10, 5),
('CRITICAL', 'LastPass Complete Guide', 'Master SOP Documentation', 20, 6),
('HIGH', 'Communication Policy - Slack', 'Master SOP Documentation', 30, 7),
('HIGH', 'Time Off Policy', 'Master SOP Documentation', 15, 8),
('HIGH', 'Invoice Policy', 'Master SOP Documentation', 10, 9),
('HIGH', 'ClickUp Training', 'Master SOP Documentation', 20, 10);

-- Seed Task Definitions
insert into public.task_definitions (sop_number, task_name, description, days, time_window, est_time, loom_link, sop_doc_link, is_eow, active) values
('1', 'Understanding Your Core Sheet', 'Review and understand the updates in your core tracking sheet', ARRAY['Mon','Tue','Wed','Thu','Fri'], '8 PM EST', '10 mins', '', '', false, true),
('2', 'Daily and Weekly SOP Creation', 'Create and update your daily and weekly standard operating procedures', ARRAY['Mon','Tue','Wed','Thu','Fri'], '8 PM EST', '10 mins', '', '', false, true),
('EOW-1', 'EOW SOP Solidification', 'Review and solidify all SOPs created during the week', ARRAY['Fri'], '5 PM EST', '1 hr', '', '', true, true),
('EOW-2', 'EOW VA Clear Out and Restart', 'Clear your workspace and prepare for the new week', ARRAY['Fri'], '5 PM EST', '10 mins', '', '', true, true),
('EOW-3', 'EOW FF Support Form Submission', 'Submit the Funnel Futurist end-of-week support form', ARRAY['Fri'], '5 PM EST', '10 mins', '', '', true, true);
