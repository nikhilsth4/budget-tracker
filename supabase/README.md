# Supabase setup

This app needs a Supabase project for its Postgres database and authentication.

## 1. Create a project

Create a project at [supabase.com](https://supabase.com). From **Project Settings →
API**, copy the **Project URL** and the **anon public** key into your `.env.local`
(see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## 2. Apply the schema

Open the **SQL Editor** in the Supabase dashboard, paste the contents of
[`migrations/0001_init.sql`](migrations/0001_init.sql), and run it. This creates the
`categories`, `transactions`, `employers`, and `shifts` tables, enables Row Level
Security (each user only sees their own rows), and installs a trigger that seeds the
default categories whenever a new user signs up.

> With the Supabase CLI you can instead run `supabase db push`.

## 3. Enable magic-link auth

In **Authentication → Providers → Email**, ensure **Email** is enabled. The app uses
passwordless magic links (`signInWithOtp`). Add your local and deployed URLs under
**Authentication → URL Configuration → Redirect URLs**, e.g.
`http://localhost:3000/auth/callback`.

That's it — run `npm run dev` and sign in.
