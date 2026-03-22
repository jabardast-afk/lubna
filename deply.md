# Lubna Cloudflare Deploy (Click-by-Click, UI Only)

This guide is for deploying from Cloudflare Dashboard + GitHub integration only.  
No Cloudflare API token needed.

## 0. Before You Click Anything

Make sure:
- Repo is on GitHub: `jabardast-afk/lubna`
- Branch to deploy: `main`
- You have Cloudflare + GitHub access
- You have Google OAuth `client_id` and `client_secret`

---

## 1. Create Data Resources First (Cloudflare UI)

### 1.1 Create KV Namespace
1. Open Cloudflare dashboard.
2. Left menu: `Storage & Databases`.
3. Click `KV`.
4. Click `Create namespace`.
5. Name: `lubna-kv`.
6. Click `Create`.

### 1.2 Create D1 Database
1. In `Storage & Databases`, click `D1`.
2. Click `Create`.
3. Name: `lubna-db`.
4. Click `Create`.

### 1.3 Create R2 Bucket
1. In `Storage & Databases`, click `R2`.
2. Click `Create bucket`.
3. Name: `lubna-media`.
4. Click `Create bucket`.

---

## 2. Deploy Worker From GitHub (UI)

### 2.1 Create Worker via Git Import
1. Left menu: `Workers & Pages`.
2. Click `Create application`.
3. Choose `Workers`.
4. Click `Import a repository`.
5. Connect GitHub if prompted.
6. Select repo: `jabardast-afk/lubna`.
7. Worker name: `lubna-worker`.
8. Production branch: `main`.

### 2.2 Build/Deploy Settings
Use these exact values:
- Root directory: `/`
- Build command: `pnpm install`
- Deploy command: `pnpm --filter @lubna/worker exec wrangler deploy`

Click `Save and Deploy`.

---

## 3. Add Worker Bindings (UI)

1. Go to `Workers & Pages` → `lubna-worker`.
2. Open `Settings`.
3. Open `Bindings`.
4. Click `Add binding` and add:

### 3.1 KV Binding
- Type: `KV Namespace`
- Variable name: `KV`
- Namespace: `lubna-kv`

### 3.2 D1 Binding
- Type: `D1 Database`
- Variable name: `DB`
- Database: `lubna-db`

### 3.3 R2 Binding
- Type: `R2 Bucket`
- Variable name: `STORAGE`
- Bucket: `lubna-media`

5. Click `Save`.
6. Click `Deploy`.

---

## 4. Add Worker Variables + Secrets (UI)

1. Still in Worker `lubna-worker` → `Settings`.
2. Open `Variables and Secrets`.
3. Add **Variables**:
- `GOOGLE_CLIENT_ID` = your Google OAuth client id
- `GOOGLE_REDIRECT_URI` = `https://api.lubna.app/auth/callback`
- `APP_URL` = `https://lubna.app`

4. Add **Secrets**:
- `GOOGLE_CLIENT_SECRET` = your Google OAuth client secret
- `SESSION_SECRET` = long random string
- `ELEVENLABS_API_KEY` = optional

5. Click `Save`.
6. Click `Deploy`.

---

## 5. Run DB Schema in D1 (UI)

1. Go to `Storage & Databases` → `D1` → `lubna-db`.
2. Open `Console` or `Query` tab.
3. Open local file `schema.sql` from repo.
4. Copy all SQL and paste in D1 query editor.
5. Click `Run`.
6. Confirm tables exist: `users`, `conversations`, `messages`, `memory`.

---

## 6. Deploy Pages Frontend From GitHub (UI)

### 6.1 Create Pages Project
1. Go to `Workers & Pages`.
2. Click `Create application`.
3. Choose `Pages`.
4. Click `Connect to Git`.
5. Select repo: `jabardast-afk/lubna`.
6. Branch: `main`.

### 6.2 Build Settings
Set:
- Framework preset: `Vite` (or `None`)
- Root directory: `/`
- Build command: `pnpm --filter @lubna/web build`
- Build output directory: `apps/web/dist`

### 6.3 Environment Variables (Pages)
Add in both Production and Preview:
- `VITE_API_BASE` = `https://api.lubna.app`

Click `Save and Deploy`.

---

## 7. Attach Custom Domains (UI)

### 7.1 Pages Domain
1. Open Pages project.
2. `Custom domains` → `Set up a custom domain`.
3. Add `lubna.app`.
4. Finish DNS wizard.

### 7.2 Worker Domain
1. Open Worker `lubna-worker`.
2. `Settings` → `Triggers` or `Domains & Routes`.
3. Add custom domain `api.lubna.app`.
4. Save.

Wait until SSL/TLS shows active for both.

---

## 8. Google OAuth Console Setup (Must Match)

In Google Cloud Console:
1. Open OAuth 2.0 Client ID used by Lubna.
2. Add Authorized redirect URI:
- `https://api.lubna.app/auth/callback`
3. Save.

If needed, add origin:
- `https://lubna.app`

---

## 9. First Live Test

1. Open `https://lubna.app`.
2. Click `Continue with Google`.
3. Login and consent.
4. Confirm redirect lands in app and session is active.
5. Send one chat message to verify `/chat/message`.

---

## 10. Troubleshooting (Fast)

### Login returns error
- Verify Google redirect URI exactly matches `https://api.lubna.app/auth/callback`.

### Unauthorized after login
- Check Worker has `KV` binding and session cookie is being set.
- Confirm frontend and API are same-site: `lubna.app` + `api.lubna.app`.

### Chat fails
- Confirm D1 schema ran successfully.
- Confirm Worker bindings: `DB`, `KV`, `STORAGE`.

### Pages deploy fails
- Recheck build command/output directory.
- Ensure root directory is `/`.

---

## 11. Ongoing Deploy Behavior

- Any push to `main` triggers Pages rebuild (if Git-connected).
- Any push to `main` triggers Worker rebuild only if Worker Git build is configured.
- If Worker is not auto-building from Git, press `Deploy` in Worker UI after merges.
