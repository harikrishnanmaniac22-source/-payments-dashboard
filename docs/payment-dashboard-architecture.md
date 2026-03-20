# Marketplace Settlements Dashboard Architecture

## 1. Recommended Tech Stack

- Frontend: `Next.js App Router` with `TypeScript`, `Tailwind CSS`, and `shadcn/ui` for reusable dashboard components.
- Backend: `Next.js route handlers` or `server actions` for CSV upload, validation, and ingestion.
- Database: `PostgreSQL` for production. Use `Prisma` or `Drizzle` as the ORM and `Supabase` or `Neon` as managed hosting.
- Background processing: `Inngest`, `BullMQ`, or a server-side worker for large CSV imports and reconciliation jobs.
- Real-time refresh: `Postgres NOTIFY/LISTEN`, Supabase realtime, or websocket updates if multiple operators need live visibility.

## 2. Recommended Database Schema

```sql
create table channels (
  id text primary key,
  label text not null unique
);

create table upload_batches (
  id uuid primary key,
  file_name text not null,
  uploaded_at timestamptz not null default now(),
  row_count integer not null,
  inserted_count integer not null,
  updated_count integer not null,
  skipped_count integer not null
);

create table settlements (
  id uuid primary key,
  channel_id text not null references channels(id),
  upload_batch_id uuid references upload_batches(id),
  unique_key text not null unique,
  order_id text not null,
  payout_reference text,
  settlement_date date not null,
  gross_amount numeric(14,2) not null default 0,
  total_received numeric(14,2) not null default 0,
  pending_settlements numeric(14,2) not null default 0,
  refunds numeric(14,2) not null default 0,
  disputes numeric(14,2) not null default 0,
  fee_amount numeric(14,2) not null default 0,
  status text not null,
  currency text not null default 'INR',
  raw_row jsonb not null
);
```

## 3. CSV Parsing Logic

- Read the header row and normalize it to lowercase snake_case.
- Detect the marketplace from `channel`, `marketplace`, `platform`, or the file name.
- Map flexible aliases to canonical fields:
  - `total_received`: `received`, `net_amount`, `settlement_amount`
  - `pending_settlements`: `pending`, `pending_settlement`, `outstanding`
  - `refunds`: `refund`, `refund_amount`
  - `disputes`: `chargeback`, `chargebacks`, `dispute_amount`
- Build a `unique_key` from `channel + order_id + payout_reference + settlement_date` and upsert instead of blindly inserting duplicates.

## 4. Frontend Structure

- `/`: overview dashboard with aggregate KPIs, per-channel cards, recent uploads, and recent settlements.
- `/channels/amazon`, `/channels/flipkart`, `/channels/myntra`: channel-specific KPI and settlement table views.
- `/uploads`: upload workflow, parser notes, sample CSV guidance, and ingestion history.
- Reusable UI:
  - `KpiCard`
  - `SettlementsTable`
  - `DashboardHeader`
  - `UploadCsvForm`

## 5. Upload Workflow

1. User selects a CSV in the upload page.
2. Browser posts `multipart/form-data` to `/api/uploads`.
3. The server parses CSV rows, validates required fields, normalizes marketplace labels, and computes canonical settlement values.
4. Matching records are upserted into the store using `unique_key`.
5. Overview and channel pages re-read the normalized store and recalculate KPIs on the next refresh.

## 6. Example CSVs

Amazon:

```csv
channel,order_id,payout_reference,settlement_date,total_received,pending_settlement,refunds,disputes,status,currency
Amazon,AMZ-1003,UTR-AMZ-APR-03,2026-03-20,118500,4200,800,0,partial,INR
```

Flipkart:

```csv
marketplace,order_id,payout_reference,settlement_date,total_received,pending_settlement,refunds,disputes,status,currency
Flipkart,FLP-2003,UTR-FLP-APR-03,2026-03-20,86400,3400,900,250,pending,INR
```

Myntra:

```csv
marketplace,order_id,payout_reference,settlement_date,total_received,pending_settlement,refunds,disputes,status,currency
Myntra,MYN-3003,UTR-MYN-APR-03,2026-03-20,64800,5000,1100,200,pending,INR
```
