import { fetchReviews } from "./fetchReviews.js";
import { fetchAgodaReviews } from "./fetchAgodaReviews.js";
import { loadState, saveState } from "./state.js";
import { selectNewReviews, formatReviewMessage, todayVietnamDate } from "./processReviews.js";
import { postToZalo } from "./postToZalo.js";

// DRY_RUN=1 prints messages instead of posting them and leaves state untouched.
const DRY_RUN = Boolean(process.env.DRY_RUN);

// Processed one at a time, in this order: each source is fully fetched and
// posted before the next one is fetched.
const SOURCES = [
  { name: "Agoda", fetch: fetchAgodaReviews },
  { name: "Booking", fetch: fetchReviews }
];

async function send(text) {
  if (DRY_RUN) {
    console.log(`\n[DRY RUN] would post:\n${text}\n`);
    return;
  }
  await postToZalo(text);
}

async function persist(state) {
  if (!DRY_RUN) await saveState(state);
}

async function processSource(source, state) {
  const reviews = await source.fetch();
  const newReviews = selectNewReviews(reviews, state.postedIds);

  if (newReviews.length === 0) {
    console.log(`[${source.name}] No new reviews since last run.`);
    return;
  }

  const hasReviewsToPost = newReviews.some((r) => r.rating !== 10);
  if (hasReviewsToPost) {
    await send(`🏨 ${source.name} Reviews ngày ${todayVietnamDate()}:`);
  }

  for (const review of newReviews) {
    if (review.rating === 10) {
      state.postedIds.push(review.id);
      await persist(state);
      console.log(`[${source.name}] Skipped review ${review.id} (perfect 10/10 score, not posted).`);
      continue;
    }
    await send(await formatReviewMessage(review));
    state.postedIds.push(review.id);
    await persist(state);
    console.log(`[${source.name}] Posted review ${review.id} to Zalo.`);
  }

  // AI strong/weak-points summary disabled at the hotel owner's request.
  // analyzeReviews.js is kept so it can be re-enabled later.
}

async function main() {
  const state = await loadState();

  // One source failing (e.g. an Apify outage) shouldn't stop the others from posting.
  for (const source of SOURCES) {
    try {
      await processSource(source, state);
    } catch (err) {
      console.error(`[${source.name}] Failed: ${err.stack || err.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
