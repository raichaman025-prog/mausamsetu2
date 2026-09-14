# Deploying MausamSetu as a live website

The project is two separate apps — deploy them separately, then point the
frontend at the backend's public URL. Easiest free-tier path: **Render**
(backend) + **Vercel** (frontend). Alternatives noted at the bottom.

---

## Step 1 — Push the code to GitHub

Deploy platforms build from a git repo, not a zip.

```bash
cd mausamsetu
git init
git add .
git commit -m "MausamSetu prototype"
```

Create an empty repo on GitHub, then:

```bash
git remote add origin https://github.com/<you>/mausamsetu.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy the backend (Render, free tier)

1. Go to [render.com](https://render.com) → **New → Web Service** → connect your
   GitHub repo.
2. Set:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     (a `Procfile` with this same command is already included, so Render/Railway
     may auto-detect it)
3. Add environment variables (Render dashboard → Environment):
   - `JWT_SECRET_KEY` = any long random string
   - `CORS_ORIGINS` = leave blank for now — you'll come back and set this to your
     frontend's URL after Step 3
   - `DATABASE_URL` — leave unset to keep using SQLite (fine for a demo; note
     Render's free-tier disk is ephemeral, so the DB resets on redeploy — reseed
     with the Shell tab: `python -m app.seed_data`)
4. Deploy. You'll get a URL like `https://mausamsetu-api.onrender.com`.
5. Open `https://mausamsetu-api.onrender.com/docs` to confirm the API is live,
   then run the seed step once from Render's **Shell** tab:
   ```bash
   python -m app.seed_data
   ```

> Railway and Fly.io work the same way (root directory `backend`, same start
> command) if you prefer them over Render.

---

## Step 3 — Deploy the frontend (Vercel, free tier)

1. Go to [vercel.com](https://vercel.com) → **New Project** → import the same repo.
2. Set:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://mausamsetu-api.onrender.com` (your backend URL
     from Step 2, **no trailing slash**)
4. Deploy. You'll get a URL like `https://mausamsetu.vercel.app`.

A `vercel.json` (SPA rewrite) is already included so React Router's client-side
routes (e.g. `/location/gomti-nagar`) work on page refresh. A `netlify.toml`
equivalent is included if you use Netlify instead.

---

## Step 4 — Connect them (fix CORS)

Go back to Render → your backend service → Environment → set:

```
CORS_ORIGINS=https://mausamsetu.vercel.app
```

Redeploy the backend. Now open `https://mausamsetu.vercel.app` — it will call
the real backend instead of falling back to mock data (you can confirm this by
opening browser DevTools → Network tab and seeing requests to your Render URL
succeed with 200s).

---

## Notes for a hackathon/SIH demo

- **If you don't want to deal with a backend at all**: the frontend alone
  (deployed on Vercel/Netlify with no `VITE_API_BASE_URL` set) still runs the
  entire demo using its built-in mock data fallback — it just won't have a
  real database or Swagger docs to show. This is the fastest path if you only
  need the UI to be reachable at a public URL.
- **Free-tier cold starts**: Render's free web services sleep after inactivity
  and take ~30–50s to wake on the first request — hit `/api/health` a minute
  before you present, or upgrade to a paid instance for the demo window.
- **Custom domain**: both Vercel and Render let you attach a custom domain for
  free under their dashboards' "Domains" settings if you want something nicer
  than the default `*.vercel.app` / `*.onrender.com` URLs.
