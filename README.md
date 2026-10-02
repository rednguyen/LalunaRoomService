# Laluna Review Bot

Daily GitHub Action that fetches Laluna Hoi An's Booking.com reviews via Apify,
translates them to Vietnamese, and posts any new ones to a Zalo group chat,
every day at 8am Vietnam time.

## How it works

1. `fetchReviews.js` calls the Apify `booking-reviews-scraper` actor.
2. `processReviews.js` filters out reviews already posted (tracked by id in
   `state/last-run.json`), sorts the new ones newest-first, and formats each
   one as a message (translating the liked/disliked text to Vietnamese via
   `translate.js`).
3. `postToZalo.js` posts a header message, then one message per new review,
   to the configured Zalo group.
4. `analyzeReviews.js` sends the day's new reviews to Gemini
   (`gemini-flash-lite-latest`) and posts a short Vietnamese summary of
   strong points and weak points as a final message. If this step fails, it
   just gets skipped — the review posts above it still go out.
5. The workflow commits the updated `state/last-run.json` back to the repo
   so the same review is never posted twice.

The workflow runs once daily at 01:00 UTC, which is always 8am in
`Asia/Ho_Chi_Minh` (Vietnam doesn't observe daylight saving time, so this
never needs adjusting).

## Setup

In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add:

- `APIFY_URL` — the full Apify run-sync-get-dataset-items URL (token included)
- `ZALO_URL` — the full Zalo bot `sendMessage` URL (token included)
- `ZALO_CHAT_ID` — the target Zalo group chat id
- `GEMINI_API_KEY` — a Gemini API key from [Google AI Studio](https://aistudio.google.com) (free tier)

## Local testing

```bash
cp .env.example .env   # fill in real values
node --env-file=.env src/index.js   # Node 20.6+
```

Or export the three env vars manually and run `node src/index.js`.

You can also trigger a run manually anytime from the **Actions** tab via
**Run workflow**.
