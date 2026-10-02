# Laluna Review Bot

Daily GitHub Action that fetches Laluna Hoi An's Booking.com reviews via Apify
and posts any new ones to a Zalo group chat, around 8pm Central Time.

## How it works

1. `fetchReviews.js` calls the Apify `booking-reviews-scraper` actor.
2. `processReviews.js` filters out reviews already posted (tracked by id in
   `state/last-run.json`) and formats a digest message.
3. `postToZalo.js` sends the digest to the configured Zalo group.
4. The workflow commits the updated `state/last-run.json` back to the repo
   so the same review is never posted twice.

The workflow runs twice daily (01:00 and 02:00 UTC) to cover both Central
Daylight and Central Standard Time; `src/index.js` only proceeds if it's
actually ~8pm in `America/Chicago` at run time, so only one of the two
triggers actually does anything on a given day.

## Setup

In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add:

- `APIFY_URL` — the full Apify run-sync-get-dataset-items URL (token included)
- `ZALO_URL` — the full Zalo bot `sendMessage` URL (token included)
- `ZALO_CHAT_ID` — the target Zalo group chat id

## Local testing

```bash
cp .env.example .env   # fill in real values
node --env-file=.env src/index.js   # Node 20.6+
```

Or export the three env vars manually and run `node src/index.js`
(set `SKIP_TIME_CHECK=true` to bypass the 8pm Central guard).

You can also trigger a run manually from the **Actions** tab via
**Run workflow** (the manual trigger skips the time guard by default).
