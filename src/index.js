import { fetchReviews } from "./fetchReviews.js";
import { loadState, saveState } from "./state.js";
import { selectNewReviews, formatReviewMessage, todayVietnamDate } from "./processReviews.js";
import { postToZalo } from "./postToZalo.js";
// import { analyzeReviews } from "./analyzeReviews.js"; // AI summary temporarily disabled

async function main() {
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

  // AI summary temporarily disabled
  // const reviewsWithText = newReviews.filter((r) => r.likedText || r.dislikedText);
  // if (reviewsWithText.length === 0) {
  //   console.log("No liked/disliked text to analyze, skipping AI summary.");
  // } else {
  //   try {
  //     const summary = await analyzeReviews(reviewsWithText);
  //     await postToZalo(`🤖 Phân tích AI - Điểm mạnh & điểm cần cải thiện hôm nay:\n\n${summary}`);
  //     console.log("Posted AI summary to Zalo.");
  //   } catch (err) {
  //     console.error(`AI summary failed, skipping: ${err.message}`);
  //   }
  // }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
