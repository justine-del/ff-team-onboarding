# FF Onboarding Portal — Setup Guide

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL Editor, run `supabase/schema.sql`
3. Then run `supabase/seed.sql` to populate reference data
4. Copy your project URL and keys from Settings → API

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_COMPANY_EMAIL_DOMAIN=funnelfuturist.com
```

## 3. Create Admin Account

After running the schema, manually insert your admin profile in Supabase:
1. Go to Authentication → Users → Invite user (use your company email)
2. After accepting the invite, run this SQL in the SQL Editor:
```sql
update profiles set role = 'admin' where email = 'your@funnelfuturist.com';
```

## 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

```bash
npx vercel
```

Add all environment variables in Vercel project settings.
