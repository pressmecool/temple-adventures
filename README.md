# Temple Adventures — Call Intelligence CRM

## What's in here
- `src/` — the dashboard you see (React + plain CSS, no build magic to learn beyond what's here)
- `netlify/functions/calls.js` — runs on Netlify's servers, talks to Exotel securely
- `.env.example` — list of secret values you need to set (never the real values — those go in Netlify, not in this file)

## How it works, in plain terms
1. Your browser loads the dashboard.
2. The dashboard asks Netlify's function ("calls.js") for your recent calls.
3. That function asks Exotel for the real data, using your secret keys.
4. The dashboard shows whatever comes back. If Exotel isn't connected yet, it shows clearly-labeled preview rows instead of pretending they're real.

## Setting it up

### 1. Push this to GitHub
If you don't already have a repo:
```
cd temple-crm
git init
git add .
git commit -m "Initial commit"
```
Then create a new repo on github.com and follow its instructions to push.

### 2. Connect to Netlify
- In Netlify: **Add new site → Import an existing project** → pick your GitHub repo.
- Build command: `npm run build` (already set in `netlify.toml`)
- Publish directory: `dist` (already set)

### 3. Add your Exotel credentials to Netlify (not to any file!)
Go to **Site configuration → Environment variables** in Netlify and add:
- `EXOTEL_API_KEY`
- `EXOTEL_API_TOKEN`
- `EXOTEL_ACCOUNT_SID`
- `EXOTEL_SUBDOMAIN` (use `api.in.exotel.com` if your dashboard is at `my.in.exotel.com` / `my.mum1.exotel.com`, otherwise `api.exotel.com`)

You can find these in your Exotel dashboard under **Settings → API Settings**.

### 4. Deploy
Push to GitHub (or click "Trigger deploy" in Netlify) — it'll build and go live automatically.

### 5. Test it
Make a real call to your ExoPhone number, then click "Refresh" on the dashboard. It should show up in the Recent Calls table.

## If something looks wrong
Open your browser's dev console (F12) on the live site — the app logs the raw Exotel response there. If field names don't match what's expected, that's the easiest way to spot why.
