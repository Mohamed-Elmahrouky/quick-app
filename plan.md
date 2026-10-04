# Project Plan: Mini Project Registration App

A small web app where students submit their **name**, **academic number**, and **project name**. Data is stored in Supabase, and an admin can view everything and export it as an Excel file.

**Stack:** Next.js (App Router) + Supabase (Postgres + Auth) + Vercel

---

## 1. Goals

- Normal users can **only submit** the form. They cannot read, edit, or delete anything.
- Admin can **log in, view all submissions, and export to Excel**.
- Restrictions are enforced in the **database (Row Level Security)**, not just the UI.

---

## 2. Pages

| Route | Who | What it does |
|---|---|---|
| `/` | Everyone | Form: Full name, Academic number, Project name. Shows a success message after submit. |
| `/admin/login` | Admin | Email + password login (Supabase Auth). |
| `/admin` | Admin only | Table of all submissions + **Export to Excel** button. Redirects to login if not an admin. |
| `/api/export` | Admin only | Generates and returns the `.xlsx` file. |

> That's 2 main pages (user + admin) plus a small login screen for the admin.

---

## 3. Database (Supabase)

Run this in the Supabase **SQL Editor**:

```sql
create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null check (char_length(full_name) between 2 and 100),
  academic_number text not null check (academic_number ~ '^[0-9]{5,12}$'),  -- adjust to your format
  project_name    text not null check (char_length(project_name) between 2 and 150),
  created_at      timestamptz not null default now()
);

-- Optional: stop the same student registering the same project twice
create unique index submissions_unique_idx
  on public.submissions (academic_number, lower(project_name));

-- Lock the table down
alter table public.submissions enable row level security;

-- Anyone (anon) can INSERT only
create policy "public can insert"
  on public.submissions for insert
  to anon
  with check (true);

-- Only admins can SELECT
create policy "admins can read"
  on public.submissions for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Only admins can DELETE (optional)
create policy "admins can delete"
  on public.submissions for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

There is **no** select/update/delete policy for `anon`, so normal users can never read or change data, even if they call the API directly.

---

## 4. Admin Setup

1. In Supabase → **Authentication → Users → Add user**, create the admin account (email + password). Turn **off** public sign-ups under Authentication → Providers → Email.
2. Mark that user as admin (SQL Editor):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'admin@yourdomain.com';
```

`app_metadata` can't be edited by users, so it's safe to trust for the role check.

---

## 5. Project Structure

```
/app
  page.tsx                  # user form
  /admin
    page.tsx                # admin table + export button
    /login/page.tsx         # admin login
  /api
    /submit/route.ts        # validates + inserts submission
    /export/route.ts        # admin-only Excel export
/lib
  supabase-browser.ts       # client for the browser
  supabase-server.ts        # client for server (cookie-based session)
  validation.ts             # zod schema
middleware.ts               # protects /admin routes
.env.local
```

**Packages:**

```bash
npx create-next-app@latest
npm i @supabase/supabase-js @supabase/ssr zod exceljs
```

---

## 6. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

- Only the **anon** key is needed. RLS does the protection.
- Do **not** use the `service_role` key unless you really need it, and never expose it to the browser.
- Add the same two variables in **Vercel → Project → Settings → Environment Variables**.

---

## 7. How Each Part Works

### User form (`/`)
1. User fills in name, academic number, project name.
2. Form posts to `/api/submit`.
3. Server validates with **zod** (length limits, academic number digits only), then inserts into `submissions`.
4. Show "Submitted successfully" or a clear error (e.g. duplicate).

### Admin protection
- `middleware.ts` checks the Supabase session for `/admin/*` (except `/admin/login`).
- No session, or `app_metadata.role !== 'admin'` → redirect to `/admin/login`.
- RLS is the real safety net even if the middleware is bypassed.

### Excel export (`/api/export`)
1. Create the Supabase server client from the request cookies.
2. Confirm the user is an admin (otherwise return `403`).
3. `select full_name, academic_number, project_name, created_at` ordered by `created_at`.
4. Build the workbook with **exceljs** (columns: Name, Academic Number, Project Name, Submitted At).
5. Return it with these headers:
   - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
   - `Content-Disposition: attachment; filename="submissions.xlsx"`
6. The admin page's **Export** button is just a link to `/api/export`.

---

## 8. Restrictions Summary

| Action | Normal user | Admin |
|---|---|---|
| Submit form | Yes | Yes |
| View submissions | No | Yes |
| Export Excel | No | Yes |
| Edit / delete | No | Delete only |

Extra basic protections:
- Server-side validation + database `CHECK` constraints.
- Unique index to block duplicates.
- Optional: add a hidden honeypot field or Vercel's rate limiting to reduce spam, since anyone can submit.

---

## 9. Build Steps (in order)

1. Create the Supabase project and run the SQL from section 3.
2. Create the admin user and set the admin role (section 4).
3. Scaffold the Next.js app and install packages.
4. Add env vars and the Supabase client helpers.
5. Build the user form + `/api/submit`.
6. Build admin login, `middleware.ts`, and the admin table page.
7. Build `/api/export` and the Export button.
8. Push to GitHub, import into Vercel, add env vars, deploy.
9. Test (checklist below).

---

## 10. Test Checklist

- [ ] Submitting the form adds a row in Supabase.
- [ ] Invalid input (empty fields, letters in academic number) is rejected.
- [ ] Duplicate academic number + project is rejected.
- [ ] Visiting `/admin` while logged out redirects to login.
- [ ] A normal (non-admin) account can't see data or export.
- [ ] Admin can log in, see the table, and download a correct `.xlsx`.
- [ ] Calling the Supabase REST API with the anon key can **insert** but not **select**.
- [ ] Production deployment on Vercel works with the env vars set.

---

## 11. Possible Later Upgrades

- Search/filter and pagination in the admin table
- Admin can edit or delete rows from the UI
- Submission deadline or a single-submission-per-student rule
- Email confirmation after submitting
