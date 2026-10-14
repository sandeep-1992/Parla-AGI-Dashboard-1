# Hilton Inquiries

Standalone website for the live Hilton Heathrow Terminal 5 sales enquiry feed. Ticket-style cards, department allocation, status filters, and optional phone push alerts.

## What it does

- Username / password login
- Fetches enquiries from `https://engine.auriforce.com/webhook/fetch-sales-enquiry` through `/api/enquiries` (avoids browser CORS)
- Ticket cards with guest contact, request details, Accept / Reject
- Search, enquiry-type filter, and All / Pending / Accepted / Resolved filters
- Department Allocation donut (click a slice to filter)
- Optional home-screen phone alerts for new enquiries (Web Push)
- CSV export and conversation audio / transcript when a conversation ID is available

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:5174/login](http://127.0.0.1:5174/login).

Default login (change in `.env`):

- Username: `admin`
- Password: `Hilton`

## Vercel

Connect this GitHub repo in the Vercel project (**Settings → Git**), set production branch to `main`, then redeploy. Add env vars from `.env.example` (including `VAPID_*` for push alerts).
