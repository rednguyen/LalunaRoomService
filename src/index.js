import { fetchReviews } from "./fetchReviews.js";
import { loadState, saveState } from "./state.js";
import { selectNewReviews, formatReviewMessage, todayVietnamDate } from "./processReviews.js";
import { postToZalo } from "./postToZalo.js";

function isAroundEightPmCentral() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }).format(new Date())
  );
  return hour === 20;
}

async function main() {
  // The workflow's cron fires at two UTC times (to cover both CDT and CST)
  // so this guard lets only the one that's actually ~8pm Central through.
  if (process.env.SKIP_TIME_CHECK !== "true" && !isAroundEightPmCentral()) {
    console.log("Not ~8pm Central right now, skipping this run.");
    return;
  }

  const state = await loadState();
  const reviews = await fetchReviews();
  const newReviews = selectNewReviews(reviews, state.postedIds);

  if (newReviews.length === 0) {
    console.log("No new reviews since last run.");
    return;
  }

  await postToZalo(`🏨 Booking Reviews ngày ${todayVietnamDate()}:`);

  for (const review of newReviews) {
    await postToZalo(await formatReviewMessage(review));
    state.postedIds.push(review.id);
    await saveState(state);
    console.log(`Posted review ${review.id} to Zalo.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
