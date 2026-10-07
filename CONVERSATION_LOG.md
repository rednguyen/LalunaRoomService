# Laluna Review Bot — Build Log

A narrative summary of how this project was built, in order, for future reference.
(Reconstructed from the assistant's own context — not a verbatim transcript.)

## 1. Initial build

Goal: a daily GitHub Action that fetches Laluna Hoi An's Booking.com reviews via
an Apify actor (`voyager~booking-reviews-scraper`), and posts new ones to a Zalo
group chat via the Zalo Bot API. Both APIs take their token directly in the URL —
no OAuth/login flow needed.

Chosen stack: plain Node.js (18+, later targeting 20 for `--env-file` support),
no framework, no database — state tracked in a JSON file. Scheduling via GitHub
Actions.

Initial files created:
- `src/fetchReviews.js` — POSTs to the Apify run-sync-get-dataset-items endpoint
- `src/state.js` — reads/writes `state/last-run.json`, tracking posted review IDs
  (capped at the most recent 100) so nothing gets reposted
- `src/processReviews.js` — dedupe + message formatting
- `src/postToZalo.js` — POSTs `{chat_id, text}` to the Zalo bot's `sendMessage`
- `src/index.js` — orchestrates fetch → filter → post → save state
- `.github/workflows/daily-reviews.yml` — the scheduled job
- `.env.example`, `.gitignore`, `README.md`

Verified the Apify response shape by hand (fields: `id`, `rating` /10, `reviewTitle`,
`likedText`, `dislikedText`, `userName`, `userLocation`, `travelerType`,
`checkInDate`/`checkOutDate`, `roomInfo`, `reviewDate`, `reviewLanguage`, etc.).
Sent one live test message to confirm the Zalo posting side worked before
wiring anything else.

## 2. Message format iteration

The message format went through many small rounds of user feedback, converging
on (per review):

```
⭐ {rating}/10 - {reviewTitle}
👤 {userName} - {userLocation}
📅 Ngày: {reviewDate, converted to Vietnam time}
--------------------------------------
👍 Good:
{likedText, translated to Vietnamese}
👎 Bad:
{dislikedText, translated to Vietnamese}
```

with a standalone first message: `🏨 Booking Reviews ngày {today's VN date}:`

Key decisions along the way:
- Originally tried to send one **combined digest message** per day — this hit
  Zalo's ~2000-character message limit on a day with many reviews, so we
  switched to **one Zalo message per review** instead.
- The header ("Booking Reviews ngày X:") was tried inline-with-first-review,
  then moved to its own standalone message sent before the review messages.
- Reviews are sorted **newest-first** by `reviewDate`.
- "Reviews:" / "Review:" label was dropped entirely — messages go straight
  from the `---` separator to `👍 Good:` / `👎 Bad:`.
- A `rating < 8` gate was added to hide `dislikedText` for well-rated reviews,
  then later **reverted** — dislikedText now always shows when present,
  regardless of rating.
- Reviews rated exactly **10/10** are tracked (so they're never
  re-evaluated) but are **not** posted as individual Zalo messages. The
  standalone header message is also skipped on a day where every new review
  is a 10, to avoid an empty-looking header.

## 3. Translation

Originally used **MyMemory's free translation API** (`api.mymemory.translated.net`),
auto-detecting source language. Hit two real problems in testing:
- A `500-character` request limit (`QUERY LENGTH LIMIT EXCEEDED`) on longer reviews.
- An invalid-language-code error when Booking.com's `reviewLanguage` field
  returned non-standard codes (e.g. `"xu"`).

Fixed the second by switching to MyMemory's `autodetect` source-language mode.
Eventually **replaced MyMemory entirely with Gemini** (`gemini-flash-lite-latest`)
for translation, which removed the 500-char cap (tested successfully with
~970-character input) and is more reliable. Added **retry logic** (up to 3
attempts, 1s delay) after observing transient Gemini `503` overload errors —
confirmed working (one review's translation failed twice then succeeded on
the 3rd attempt, instead of falling back to English).

If translation fails after all retries, it falls back to the original
(untranslated) text rather than failing the whole run — this is deliberate,
not a bug.

## 4. AI strong-points / weak-points summary (Gemini)

Added `src/analyzeReviews.js`: after posting the day's reviews, sends their
liked/disliked text to Gemini and posts one more Zalo message summarizing
strong points (✅) and weak points (⚠️) for the day, in Vietnamese.

- Chose **Gemini over Claude/OpenAI** specifically for cost: Gemini's free
  tier (~1,500 requests/day on Flash models) comfortably covers 1 request/day
  at $0, no credit card needed. Estimated Claude cost would've been
  fractions of a cent/day too, but Gemini's free tier made it genuinely $0.
- Had to iterate on the actual **model name** — `gemini-2.5-flash` and
  `gemini-3.8-flash` both failed (one deprecated for new API keys, the other
  hit capacity/`503` errors under high demand) before landing on
  `gemini-flash-lite-latest`, which worked reliably.
- The summary was **temporarily disabled** at one point (commented out) while
  other changes were being made, then **re-enabled**, scoped specifically to
  only the liked/disliked text that's actually visible in the Zalo messages
  (this mattered more back when dislikedText was conditionally hidden for
  high-rated reviews; that gate has since been reverted).
- Tightened the prompt so that when no reviews have any dislikedText, the
  "⚠️ Điểm cần cải thiện" section is omitted entirely (no header, no
  placeholder "(Không có)" line) rather than printed empty.
- The AI summary step is wrapped in try/catch — if it fails, it's skipped
  silently rather than failing the whole run (the review posts still go out).
- Also added a guard so the Gemini call is skipped entirely (not just the
  posting of its result) if none of the day's new reviews have any
  liked/disliked text to analyze at all.

## 5. Scheduling — a saga

Original plan: GitHub Actions `schedule:` cron trigger, 8pm Central Time.
Converted to **8am Vietnam time** instead (`Asia/Ho_Chi_Minh` is a fixed
UTC+7 with no DST, unlike Central Time — much simpler, one cron entry,
no biannual adjustment needed). Later changed to 11am, then 11:30am.

**Problem:** GitHub's native `schedule:` trigger never fired on its own —
confirmed via the GitHub REST API (`/actions/runs`) across **two full days**
of testing, even though the workflow file was verified correct (right cron
syntax, on the default branch, workflow marked `active`). Manual
`workflow_dispatch` triggers worked every single time, which ruled out a
broader Actions-disabled/permissions problem and pointed specifically at
GitHub's cron-trigger indexing being unreliable for this repo.

**Fix:** Removed the native `schedule:` trigger entirely. Set up a free
external cron job on **cron-job.org** instead, which calls the GitHub REST
API's `workflow_dispatch` endpoint on a schedule:

- URL: `https://api.github.com/repos/rednguyen/LalunaRoomService/actions/workflows/daily-reviews.yml/dispatches`
- Method: `POST`
- Headers: `Authorization: Bearer <GitHub fine-grained PAT, Actions: Read and write, scoped to this repo only>`, `Accept: application/vnd.github+json`
- Body: `{"ref":"main"}`
- Schedule timezone set directly to `Asia/Ho_Chi_Minh` on cron-job.org (no UTC math needed)

This has since fired reliably on schedule (confirmed two days running via the
Actions run history, both logged as `workflow_dispatch` since that's the
trigger type cron-job.org uses).

Note on cron-job.org itself: free, no paid tier, but has a documented
4-40 second jitter delay by design (load-smoothing) and no SLA — a total
non-issue here since we're only using it to fire a quick dispatch call, not
to run the actual job on their infrastructure.

## 6. Secrets / environment variables

Four GitHub repo secrets (Settings → Secrets and variables → **Actions**,
not Codespaces/Dependabot):
- `APIFY_URL` — full Apify run-sync-get-dataset-items URL (token in URL)
- `ZALO_URL` — full Zalo bot `sendMessage` URL (token in URL)
- `ZALO_CHAT_ID` — target Zalo group chat id
- `GEMINI_API_KEY` — from Google AI Studio (free tier), used for both
  translation and the AI summary

Locally, these live in a gitignored `.env` file (`.env.example` is the
committed template). Local testing: `node --env-file=.env src/index.js`
(Node 20.6+).

## 7. Notable debugging moments

- **Apify transient 502**, **Gemini transient 503s** — both just retried
  manually (Apify) or via the built-in retry loop (Gemini translation); not
  code bugs, just upstream flakiness.
- **Duplicate Zalo posts**: during concurrent local + GitHub Actions testing
  (clearing/editing `state/last-run.json` from both sides independently),
  the same ~5 reviews ended up posted 2-3 times for real in the live Zalo
  group. Root-caused via git history (`git show <commit> -- state/last-run.json`
  on both branches) and fixed by merging to the **union** of both sides'
  tracked IDs before pushing, so no further duplicates occurred. Lesson:
  don't test state-mutating runs from both local and CI simultaneously
  against the same live chat.
- **git push conflicts on `state/last-run.json`**: happened multiple times
  since both local testing and the live GitHub Action write to this file.
  Resolved each time with `git pull --rebase origin main`, manually
  resolving the JSON conflict (keeping the union of posted IDs + the latest
  timestamp), then continuing the rebase and pushing.

## 8. Current architecture (as of this log)

```
.github/workflows/daily-reviews.yml   # workflow_dispatch only (no native schedule)
src/
  index.js            # orchestration
  fetchReviews.js      # Apify
  processReviews.js    # dedupe, sort, format
  translate.js          # Gemini-based translation, with retry
  analyzeReviews.js     # Gemini-based daily strong/weak-points summary
  postToZalo.js          # Zalo sendMessage
  state.js                # state/last-run.json read/write
state/last-run.json       # tracked posted review IDs (capped at 100), committed back by CI
```

External trigger: cron-job.org → GitHub `workflow_dispatch` REST API, daily
at 11:30am Vietnam time.

## 9. AI summary accuracy fixes

A live run surfaced two real bugs in the AI summary feature, caught by
comparing the actual Zalo output against what the AI summary said:

- **10/10 reviews leaking into the analysis.** Only one review (9/10) was
  posted that day, but the AI summary mentioned 8 different staff names —
  clear evidence it was drawing on several 10/10 reviews that had been
  correctly skipped from *posting* but were still being fed into
  `analyzeReviews()`. Fixed by excluding `rating === 10` from
  `reviewsForAnalysis` in `index.js`, matching the AI's input to exactly
  what's shown in the chat.
- **Empty "⚠️ Điểm cần cải thiện" section.** Despite an explicit prompt
  instruction to omit this section when there's no dislikedText, Gemini
  still printed the header with a literal "- Không có" line — proving that
  asking an LLM to conditionally omit something isn't reliable enough on
  its own. Fixed by making it **deterministic in code** instead:
  `buildPrompt()` in `analyzeReviews.js` now checks `hasLikedText` /
  `hasDislikedText` across the batch *before* building the prompt, and
  branches into one of three prompt variants — strong-points-only,
  weak-points-only, or both — so Gemini is never even given the option to
  write a section that shouldn't exist. Applied the same treatment
  symmetrically to "✅ Điểm mạnh" (omitted when there's no likedText either).

Lesson reinforced: for a hard yes/no formatting rule like "don't print this
section if there's no data," compute it in JS and branch the prompt — don't
rely on an instruction inside the prompt text, even a very explicit one.

## 10. Final guard: an all-10s day sends nothing

Asked (defensively, as a last check) to confirm that if *every* new review
on a given day happens to be a perfect 10, literally nothing gets sent to
Zalo that day. Traced through the code rather than guessing:

- Header message is gated by `hasReviewsToPost = newReviews.some(r => r.rating !== 10)`
- The per-review posting loop only calls `postToZalo` when `rating !== 10`
- `reviewsForAnalysis` (section 9's fix) also excludes `rating === 10`,
  so if everything's a 10, it's empty and the AI summary step is skipped too

All three checks share the same `rating !== 10` condition, so they can't
drift out of sync with each other. Verified with a quick synthetic
Node script (two mock rating-10 reviews, counting would-be `postToZalo`
calls) rather than assuming — confirmed **0** messages sent. This was
already a side effect of the section-2 and section-9 work, so **no code
change was needed** — just verification.
