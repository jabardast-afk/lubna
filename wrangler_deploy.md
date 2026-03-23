# Lubna Cloudflare Deploy Guide

This is the canonical step-by-step deploy guide for putting Lubna on Cloudflare.

## What This Assumes

- Your repo is already on GitHub
- Your Cloudflare account is logged in through Wrangler
- The Worker name is `lubna-worker`
- The frontend will be `https://lubna.pages.dev`
- The Worker will be `https://lubna-worker.sandeepkumarbtech2012.workers.dev`
- Google OAuth is already configured with:
  - Authorized JavaScript origin: `https://lubna.pages.dev`
  - Authorized redirect URI: `https://lubna-worker.sandeepkumarbtech2012.workers.dev/auth/callback`

## Current Config

The repo already contains the Cloudflare binding IDs in [apps/worker/wrangler.toml](/workspaces/lubna/apps/worker/wrangler.toml):

- KV namespace binding: `lubna_kv`
- D1 database binding: `DB`

## 1. Install Dependencies

From the repo root:

```bash
pnpm install
```

## 2. Log In To Cloudflare

This opens your browser and signs Wrangler into Cloudflare:

```bash
pnpm --filter @lubna/worker exec wrangler login
```

Verify the login:

```bash
pnpm --filter @lubna/worker exec wrangler whoami
```

## 3. Confirm The Worker Exists

If this is your first deploy, make sure the Worker exists before setting secrets:

```bash
pnpm --filter @lubna/worker exec wrangler deploy
```

If Wrangler asks whether to create `lubna-worker`, answer `Y`.

## 4. Create Or Confirm Data Resources

If you have not already created them:

```bash
pnpm --filter @lubna/worker exec wrangler kv namespace create lubna-kv
pnpm --filter @lubna/worker exec wrangler d1 create lubna-db
```

If your Cloudflare dashboard already shows the namespace and database IDs, no extra config edit is needed because the repo already has the IDs in `apps/worker/wrangler.toml`.

## 5. Apply The Database Schema

Run the schema from the repo root:

```bash
pnpm --filter @lubna/worker exec wrangler d1 execute lubna-db --file=/workspaces/lubna/schema.sql
```

## 6. Set Secrets

Add the Google client secret:

```bash
pnpm --filter @lubna/worker exec wrangler secret put GOOGLE_CLIENT_SECRET
```

Add a random session secret:

```bash
openssl rand -base64 32
```

Copy the generated value, then set it:

```bash
pnpm --filter @lubna/worker exec wrangler secret put SESSION_SECRET
```

Optional secret if you use ElevenLabs:

```bash
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

Deploy the built frontend bundle:

```bash
pnpm dlx wrangler pages deploy apps/web/dist --project-name lubna
```

If the Pages project does not exist yet, Cloudflare will create it during deploy.

## 10. Final Cloudflare Values

Worker variables should be:

- `APP_URL` = `https://lubna.pages.dev`
- `FRONTEND_ORIGIN` = `https://lubna.pages.dev`
- `GOOGLE_CLIENT_ID` = `245236117299-hpbhch5kqk5opnbgeqci2v4fhl59m4fu.apps.googleusercontent.com`
- `GOOGLE_REDIRECT_URI` = `https://lubna-worker.sandeepkumarbtech2012.workers.dev/auth/callback`

Worker secrets should be:

- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `ELEVENLABS_API_KEY` only if you use it

## 11. Smoke Test

1. Open `https://lubna.pages.dev`
2. Click `Continue with Google`
3. Finish login
4. Confirm you land in `/chat`
5. Send one message to verify the API, session, and D1 are working

## 12. If Something Looks Off

- If login fails, re-check the redirect URI exactly matches the Google console value.
- If sessions fail, confirm the Worker secret `SESSION_SECRET` is set and the Worker deployed after setting it.
- If chat fails, confirm the D1 schema ran and the `DB` binding exists.
- If the frontend cannot reach the API, confirm `VITE_API_BASE` points to the Worker URL.
