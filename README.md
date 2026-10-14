# Sales enquiry platform

Multi-customer enquiry portal. You manage customers in an admin console; each customer gets their own login and isolated portal.

## Roles

| Who | Where | Purpose |
|-----|--------|---------|
| **You (platform)** | `/admin/login` | Create customers, set their credentials, webhook, enable/disable access, copy portal links |
| **Customer** | `/t/{slug}/login` | Their branded enquiry tickets, filters, alerts — only their data |

## Run locally

```bash
npm install
npm run dev
```

- Platform console: [http://127.0.0.1:5174/admin/login](http://127.0.0.1:5174/admin/login)
- Default platform login: `platform` / `PlatformAdmin` (change via `PLATFORM_ADMIN_*`)
- First customer is seeded as Hilton (`/t/hilton-t5/login`, `admin` / `Hilton`) until you edit or replace it in admin

## Give a customer access

1. Sign in at `/admin`
2. Create a customer (name, slug, username, password, webhook URL)
3. Copy their portal link (`/t/{slug}/login`) and send it to them
4. Disable or delete anytime from the console

## Vercel

Connect the GitHub repo, set production branch to `main`, add env vars from `.env.example`.

**Important:** set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Upstash / Vercel KV) so customers and push subscriptions survive redeploys. Without KV, data is ephemeral on serverless.
