# Deploy & Update Guide (step by step)

Plain-English steps to put this CRM online and to make changes later. No prior
experience assumed. You do each section once; after that, updating is one button.

---

## The pieces (where each lives)

| Piece | Lives on | You set up |
|-------|----------|-----------|
| Website + backend API | **Vercel** | once |
| Mobile app | **App Store / Google Play** (built by **Expo EAS**) | once per release |
| Login | **Clerk** (cloud) | once |
| Data backup | **Google Sheet** | once |
| Code | **GitHub** (done ✅) | done |

You need free accounts: GitHub (done), Clerk, Google, Vercel. Expo + Apple/Google
only when you ship the mobile app.

---

## 1. Code on GitHub (done)

Using **GitHub Desktop**: open the `crm-platform` repo → **Publish repository**
(keep it Private). Later, after any change, the same window shows the change and you
click **Push origin** to sync it. That's the whole git workflow you need.

---

## 2. Clerk (login)

1. Go to **clerk.com** → create an application (email/password sign-in is fine).
2. From the API Keys page copy:
   - **Publishable key** (`pk_...`)
   - **Secret key** (`sk_...`)
   Keep these for step 4 and the mobile app.

## 3. Google Sheet (data backup)

1. **console.cloud.google.com** → create a project → enable the **Google Sheets API**.
2. Create a **Service account** → create a **JSON key** → download it. From that file
   note `client_email` and `private_key`.
3. Create a Google Sheet. Copy its **ID** from the URL
   (`docs.google.com/spreadsheets/d/`**`THIS-PART`**`/edit`).
4. **Share** the Sheet (Editor) with the service account's `client_email`.
   (The app creates the `Clients` and `Entries` tabs automatically on first run.)

## 4. Vercel (website + API online)

1. **vercel.com** → sign in with GitHub → **Add New… → Project** → import
   **`crm-platform`**.
2. Set **Root Directory** to **`apps/web`**.
3. Open **Environment Variables** and add (from steps 2–3):
   | Name | Value |
   |------|-------|
   | `STORAGE_DRIVER` | `sheets` |
   | `CLERK_SECRET_KEY` | your `sk_...` |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | your `pk_...` |
   | `GOOGLE_SHEETS_SPREADSHEET_ID` | the Sheet ID |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the service account `client_email` |
   | `GOOGLE_PRIVATE_KEY` | the `private_key` (paste exactly, including the `\n`s) |
4. Click **Deploy**. You get a URL like `https://crm-platform.vercel.app` — that's your
   live website **and** the API the mobile app uses.
5. In Clerk, add that Vercel domain under the app's allowed domains.

## 5. Mobile app (when you're ready)

1. Install Expo tooling and sign in: `npm i -g eas-cli` then `eas login`.
2. In `apps/mobile`, set env (Expo reads `EXPO_PUBLIC_*`):
   - `EXPO_PUBLIC_API_URL` = your Vercel URL
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = your `pk_...`
3. Try it instantly on your phone: `pnpm --filter mobile start` → open in **Expo Go**.
4. Real app-store builds: `eas build` then `eas submit` (needs an **Apple Developer**
   account $99/yr and/or **Google Play** $25 once).

---

## Making changes later

1. I (or you) edit the code.
2. In **GitHub Desktop**, click **Push origin**.
3. **Vercel redeploys the website + API automatically** in ~1 minute. Done.

- **Most "fit a client" changes** = edit `crm.config.ts` (fields, stages, labels) — no
  other code touched.
- **Switch storage** (Sheets → database/Airtable) = add one adapter file + change
  `STORAGE_DRIVER`. Nothing else changes.
- **Mobile JS/UI change** = `eas update` pushes it to installed phones instantly, no app
  store review. Only *native* changes need a new `eas build` + store submit.

---

## If something's off

- **Website loads but saving fails** → check the Vercel env vars (step 4), and that the
  Sheet is shared with the service account email (step 3.4).
- **Can't sign in** → Clerk keys wrong, or the Vercel domain isn't added in Clerk.
- Tell me the error text and I'll pinpoint it.
