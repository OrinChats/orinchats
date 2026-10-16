# Testing Guide - OrinChats

How to prove your instance works end-to-end, and what to do when it doesn't.

> Prerequisite: you finished [SELF_HOSTING.md](SELF_HOSTING.md) - deployed, wizard complete,
> webhook verified in the Meta portal, cron scheduled, Instagram connected.

---

## The end-to-end test (5 minutes)

### 1. Turn on the debug panel

Add env var `NEXT_PUBLIC_DEBUG=true` to your deployment and redeploy.
The **Automations** page now shows a live-streaming event log at the bottom.

### 2. Create a test automation

- **Automations → New Automation → Comment to DM**
- Select a real post on your account (or "Trigger on All Posts")
- Keywords → *Specific Keywords* → add `TEST`
- The opening message field starts **empty on purpose** - write the text you want
  (nothing is injected; the old "Olá, aqui está o seu link!" default is gone)
- Fill the button field the way you want the flow (same field, three behaviors):
  - label **empty** → no button: opening + responses right away
  - label only → opening + button; the responses wait for the tap
  - label + link → opening + a button that opens the link ("click here"), then the responses
- Check the **"O que será enviado no direct"** panel: it lists exactly what the
  worker will send, in order, computed by the same code that does the sending
- Add the responses you want and click **Activate**

### 3. Trigger it

From a **different** Instagram account (a friend's account, or a secondary account added as a
tester on your Meta app), comment on that post:

> `TEST`

⚠️ Comments from your own connected account are deliberately ignored (self-trigger guard) -
you need a second account.

### 4. What you should see (within ~15 seconds)

Debug panel event sequence (button label + link):

```
webhook   webhook_received      PROCESSING
webhook   signature_check       OK
webhook   ig_account_lookup     OK
webhook   comment_event         PROCESSING
webhook   automations_fetch     OK
webhook   keyword_match         OK
webhook   job_enqueued          OK
worker    job_started           PROCESSING
worker    window_check          OK
worker    dedup_check           OK
worker    rate_limit_check      OK
worker    delivery_plan         PROCESSING   ← steps the flow + the exact message list
instagram comment_reply_sent    OK           ← public reply appears under the comment
instagram link_button_sent      OK           ← opening + tappable button in their inbox
worker    message_sent          OK           ← one event per delivered message
worker    job_completed         OK
```

With **button label only** the sequence stops after `message_sent` for the
opening (plus `session_create OK`); after the tap you get `quick_reply_tap →
followup_started → delivery_plan → message_sent … → session_completed`. With **no
button label** you get one `message_sent` per configured message, no session.

If a message is rejected, you will see `message_failed` (confirmed rejection, with
the Meta code) or `message_ambiguous` (timeout/5xx, delivery unknown - never
resent automatically) instead of `message_sent`. There is no "button rejected,
here is the raw link instead" downgrade anymore.

On Instagram (the commenter's side):
1. A public reply appears under their comment (random pick from your reply list).
2. A DM arrives with **exactly** the opening message you wrote + the button (if you set a label).
3. With a reveal button: your responses arrive after the tap. With a link button: the link opens and the responses follow. With no button: the responses arrive right away.

The automation card's **Total DMs Sent** counter increments.

### 4b. Test DM + story-reply triggers

- **DM keyword:** create a **DM Auto Reply** automation with keyword `DIET` and a response containing your resource link → from the second account, send `DIET` as a normal DM to your account → the auto-reply (with a tappable link button) arrives within seconds. Debug panel shows `dm_event → keyword_match → job_enqueued → dm_sent`.
- **Story reply:** post a story on your connected account → create a **Story Reply** automation with keyword `DIET` → from the second account, reply `DIET` to the story → debug panel shows `story_reply_event → keyword_match → ... → dm_sent` and the resource arrives in their DMs.
- Story replies and plain DMs are routed separately: a story reply only fires Story Reply automations, a plain DM only fires DM Auto Reply automations - the same word never triggers both.

### 5. Verify the safety rails

- Comment `TEST` **again from the same account** → debug shows `dedup_check SKIPPED` - no second DM. ✅
- Comment from your own connected account → `comment_event SKIPPED (self)`. ✅
- Hit `https://YOUR_APP/api/cron/process-jobs` with header `Authorization: Bearer YOUR_CRON_SECRET` → returns `{"ok":true,...}`. ✅

---

## Local development testing

Meta needs a public HTTPS URL, so local testing uses a tunnel:

```bash
# Terminal 1
cp .env.example .env         # point NEXT_PUBLIC_SUPABASE_URL etc. at your cloud Supabase
npm run dev

# Terminal 2 - either:
npx cloudflared tunnel --url http://localhost:3000
# or: ngrok http 3000
```

Take the tunnel URL and:
1. Set it as `NEXT_PUBLIC_APP_URL` in `.env`, restart `npm run dev`.
2. Update the Meta portal **Callback URL** to `https://<tunnel>/api/webhook` (re-verify) and
   the **OAuth redirect URI** to `https://<tunnel>/api/instagram/callback`.
3. Run the same end-to-end test above.

Remember to switch the portal URLs back to your production deployment afterwards.

---

## Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| Meta portal says webhook verification failed | Verify token mismatch → copy it fresh from the Setup Wizard; make sure the URL is exactly `/api/webhook` with no trailing slash. Setup must be **saved** first (the token is generated on save). |
| Comment triggers nothing, debug panel completely silent | Meta isn't delivering webhooks. ① The commenter must not be the connected account itself. ② In dev mode, only comments from the app admin/testers' accounts generate events - add your second account as a tester and **accept the invite inside the Instagram app**. ③ Click **Fix Webhooks** then **Check Status** in Settings - you need `✓ comments`. |
| `signature_check ERROR` in debug panel | Wrong App Secret saved in the wizard → re-copy it from Meta portal → App settings → Basic → "Show". |
| `ig_account_lookup SKIPPED` with `entry.id=0` | You used the Meta portal's "Test" button - it sends fake data by design. Use a real comment. |
| OAuth shows "Invalid platform app" | You saved the parent Meta app's ID from App settings → Basic. Instagram login needs the **Instagram app ID/secret** from *Instagram → API setup with Instagram login → Business login* - re-save them in the wizard. |
| OAuth fails with "redirect_uri not identical" | 90% of the time this actually means **wrong App Secret** (Meta's error is misleading). Otherwise: the redirect URI in the portal must match the wizard's value character-for-character. |
| OAuth error `access_denied` | You declined a permission - reconnect and approve everything. |
| DM never arrives but `comment_reply_sent OK` | Check debug for `dm_send_failed` - code 190 = expired token (reconnect), code 10/200 = missing `instagram_business_manage_messages` permission (reconnect and approve all scopes). |
| `rate_limit_check SKIPPED ... delayed` | Working as intended - you sent 180 DMs this hour; the job auto-sends when the window frees up (needs the pg_cron from Setup Step 4). |
| Account shows "Safety pause active" | Meta returned a policy block (error 368). The circuit breaker paused sends for 24h to protect your account. Slow down trigger volume; sends resume automatically. |
| Jobs stuck `pending` in `job_queue` table | pg_cron isn't running → re-run the wizard's SQL snippet; check `select * from cron.job_run_details order by start_time desc limit 5;` for HTTP errors (wrong CRON_SECRET or wrong URL). |
| Everything worked, then died ~60 days later | Token expired without refresh → the cron wasn't scheduled. Reconnect Instagram, then complete Setup Step 4. |

## Where to look when debugging

- **Debug panel** (Automations page, `NEXT_PUBLIC_DEBUG=true`) - every step of every event.
- **Supabase → Table Editor** - `job_queue` (queue state), `dm_jobs` (send audit), `dm_sent_log` (dedup), `debug_events` (raw event log).
- **Deployment logs** - Vercel → Functions logs / `npx wrangler tail` - structured JSON lines from every request.
