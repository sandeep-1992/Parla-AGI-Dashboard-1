# Hilton Inquiries

Standalone website for the live sales enquiry feed. It matches the outbound calling manager look (Plus Jakarta Sans, light studio cards, dark action buttons).

## What it does

- Username / password login
- Fetches enquiries from `https://engine.auriforce.com/webhook/fetch-sales-enquiry` through a local `/api/enquiries` proxy (avoids browser CORS)
- Datatable of enquiry type, guest contact, enquiry preview, and received time
- Search, type filter, auto-sync, CSV export
- Responsive layout for phone and laptop

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:5174/login](http://127.0.0.1:5174/login).

Default login (change in `.env`):

- Username: `admin`
- Password: `Hilton`
