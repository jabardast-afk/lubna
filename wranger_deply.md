# Lubna Cloudflare Deploy Runbook

This file is the quick reference for deploying Lubna from GitHub to Cloudflare with Wrangler.

## What You Need

- A Cloudflare account
- Access to the GitHub repo
- Google OAuth client ID and client secret
- A terminal with `pnpm` and `wrangler` available through the repo

## Important URLs

- Frontend: `https://lubna.pages.dev`
- Worker: `https://lubna-worker.sandeepkumarbtech2012.workers.dev`
- Google OAuth redirect URI: `https://lubna-worker.sandeepkumarbtech2012.workers.dev/auth/callback`

## 1. Install Dependencies

Run from the repo root:

```bash
pnpm install
```

## 2. Log In To Cloudflare

This opens a browser window and signs Wrangler into your Cloudflare account:

```bash
pnpm --filter @lubna/worker exec wrangler login
```

Verify the login:

```bash
pnpm --filter @lubna/worker exec wrangler whoami
```

## 3. Create Cloudflare Resources

Create the KV namespace:

```bash
pnpm --filter @lubna/worker exec wrangler kv namespace create lubna-kv
```

Create the D1 database:

```bash
pnpm --filter @lubna/worker exec wrangler d1 create lubna-db
```

## 4. Update `apps/worker/wrangler.toml`

Open [apps/worker/wrangler.toml](/workspaces/lubna/apps/worker/wrangler.toml) and replace:

- `REPLACE_WITH_KV_NAMESPACE_ID_FROM_CLOUDFLARE_DASHBOARD`
- `REPLACE_WITH_D1_DATABASE_ID_FROM_CLOUDFLARE_DASHBOARD`

Use the IDs shown in the Cloudflare dashboard after you create the resources.

## 5. Run The Database Schema

Load the schema into D1:

```bash
pnpm --filter @lubna/worker exec wrangler d1 execute lubna-db --file=schema.sql
```

## 6. Set Worker Secret

Add the Google client secret:

```bash
pnpm --filter @lubna/worker exec wrangler secret put GOOGLE_CLIENT_SECRET
```

Optional secrets:

```bash
pnpm --filter @lubna/worker exec wrangler secret put SESSION_SECRET
pnpm --filter @lubna/worker exec wrangler secret put ELEVENLABS_API_KEY
```

## 7. Deploy The Worker

```bash
pnpm --filter @lubna/worker exec wrangler deploy
```

## 8. Build The Frontend

The frontend must be built with the Worker API URL baked in:

```bash
VITE_API_BASE=https://lubna-worker.sandeepkumarbtech2012.workers.dev pnpm --filter @lubna/web build
```

## 9. Deploy Cloudflare Pages

Deploy the built frontend:

```bash
pnpm dlx wrangler pages deploy apps/web/dist --project-name lubna
```

## 10. Cloudflare Dashboard Fields

If you prefer the dashboard for the final values, set these in the Worker:

- `APP_URL` = `https://lubna.pages.dev`
- `FRONTEND_ORIGIN` = `https://lubna.pages.dev`
- `GOOGLE_CLIENT_ID` = `245236117299-hpbhch5kqk5opnbgeqci2v4fhl59m4fu.apps.googleusercontent.com`
- `GOOGLE_REDIRECT_URI` = `https://lubna-worker.sandeepkumarbtech2012.workers.dev/auth/callback`

Secrets:

- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET` if you want one
- `ELEVENLABS_API_KEY` if you use it

Bindings:

- KV binding name: `KV`
- D1 binding name: `DB`

## 11. Google OAuth Console

Make sure these are already added:

- Authorized JavaScript origin: `https://lubna.pages.dev`
- Authorized redirect URI: `https://lubna-worker.sandeepkumarbtech2012.workers.dev/auth/callback`

## 12. Quick Smoke Test

1. Open `https://lubna.pages.dev`
2. Click `Continue with Google`
3. Finish sign-in
4. Confirm you land in the app and the session is active
