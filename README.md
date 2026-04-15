# Daily Intelligence Aggregator

Daily Intelligence Aggregator is a polished MVP web app that turns RSS feeds into a structured daily briefing. It is designed for busy founders, operators, and knowledge workers who want a faster way to consume important information.

The app includes:

- a premium landing page
- a daily dashboard
- topic management
- source management
- one-click starter imports for live news and newsletter RSS feeds
- briefing history
- settings for live integrations
- RSS ingestion and summary service scaffolding
- a clean demo mode so the app is still usable before live accounts are connected

## Recommended stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase for auth and database
- Vercel for deployment
- OpenAI-compatible API for summaries

## What works today

- The app runs locally
- The product UI is complete for the MVP
- Demo data powers the product out of the box
- The codebase is wired for real Supabase data
- RSS ingestion and article clustering are implemented in the service layer
- the Sources page includes curated starter feeds so live data setup is faster
- AI summarization is implemented with a deterministic JSON response format and a safe heuristic fallback

## Before you start

Install Node.js if it is not already installed.

Then in the project folder run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Local setup for live mode

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project
3. In Supabase, open the SQL editor
4. Copy the contents of [`supabase/schema.sql`](/Users/bm/Documents/Daily news intel aggregator/supabase/schema.sql)
5. Run that SQL once
6. In Supabase, open Project Settings > API
7. Copy the project URL and anon key
8. Copy `.env.example` to `.env.local`
9. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

10. Restart the app with:

```bash
npm run dev
```

## Google OAuth setup

If you want Google sign-in in addition to the existing email-based auth flows, enable Google in Supabase Auth.

1. In Supabase, open `Authentication > Providers > Google`
2. Enable the Google provider
3. Add your Google OAuth client ID and client secret
4. Use the active Vercel project `daily-intelligence-aggregator-ybs9` as the canonical deployment target for this repo. Do not use preview aliases from the duplicate `daily-intelligence-aggregator` project for auth testing.

5. In the Google Cloud Console, add these authorized JavaScript origins:

```text
http://localhost:3000
https://daily-intelligence-aggregator-ybs9.vercel.app
https://daily-intelligence-aggregator-git-91e1f4-brandonma25s-projects.vercel.app
```

6. In the Google Cloud Console, add this authorized redirect URI for Supabase:

```text
https://fwkqjeumreaznfhnlzev.supabase.co/auth/v1/callback
```

7. In Supabase, add these Redirect URLs / allow-list entries for your app callback:

```text
http://localhost:3000/auth/callback
https://daily-intelligence-aggregator-ybs9.vercel.app/auth/callback
https://daily-intelligence-aggregator-git-91e1f4-brandonma25s-projects.vercel.app/auth/callback
```

8. In Vercel, add these env vars to the `Preview` environment on `daily-intelligence-aggregator-ybs9`, not just `Production`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://fwkqjeumreaznfhnlzev.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_APP_URL=https://daily-intelligence-aggregator-git-91e1f4-brandonma25s-projects.vercel.app
```

9. Confirm `NEXT_PUBLIC_APP_URL` matches the environment URL you want OAuth to return to. The UI now computes the redirect target from the current browser origin, but keeping this env var aligned still helps other auth flows and docs stay correct.

Google accounts and password-based accounts both use the same onboarding bootstrap, so starter topics are seeded for either path.

## How to run the app locally

1. Open Terminal
2. Go to the project folder:

```bash
cd "/Users/bm/Documents/Daily news intel aggregator"
```

3. Install packages:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open your browser and go to:

```text
http://localhost:3000
```

## How to deploy on Vercel

1. Create an account at [https://vercel.com](https://vercel.com)
2. Push this project to GitHub
3. In Vercel, click "Add New Project"
4. Import the GitHub repository
5. Add the same environment variables from `.env.local`
6. Click "Deploy"

After deployment, add your production URL as:

```bash
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

Use your canonical production alias here so auth callbacks and environment checks point at the correct live site. For this deployment, the canonical URL is:

```bash
NEXT_PUBLIC_APP_URL=https://daily-intelligence-aggregator-ybs9.vercel.app
```

## What accounts or keys you need

- Supabase account
- Vercel account
- OpenAI-compatible API key
- GitHub account for deployment through Vercel

You can use either the older Supabase `anon` key or the newer `sb_publishable_...` key for the browser-side app.

## Day-to-day operating flow

1. Add the topics you care about
2. Add RSS feeds that map to those topics
3. Generate a new daily briefing
4. Review the top stories first
5. Read the story cards topic by topic
6. Use history to revisit previous briefings

## Product notes

- If no live services are connected, the app falls back to a polished demo mode
- The current MVP is desktop-first but responsive on mobile
- The code is organized so email digest, favorites, and search can be added later
