const MAX_SNIPPET_LENGTH = 300;

function truncate(text) {
  if (!text) return null;
  const clean = text.trim();
  if (clean.length <= MAX_SNIPPET_LENGTH) return clean;
  return clean.slice(0, MAX_SNIPPET_LENGTH).trimEnd() + "…";
}

function formatDate(isoDate) {
  if (!isoDate) return "Unknown";
  return isoDate.slice(0, 10);
}

export function selectNewReviews(reviews, postedIds) {
  const seen = new Set(postedIds);
  return reviews
    .filter((r) => r.id && !seen.has(r.id))
    .sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate));
}

export function formatReviewMessage(review) {
  const lines = [];
  lines.push(`⭐ ${review.rating}/10 - "${review.reviewTitle || "No title"}"`);
  lines.push(`👤 ${review.userName || "Anonymous"} (${review.userLocation || "Unknown"}${review.travelerType ? `, ${review.travelerType}` : ""})`);
  lines.push(`📅 Stayed ${formatDate(review.checkInDate)} → ${formatDate(review.checkOutDate)}`);
  if (review.roomInfo) lines.push(`🛏️ ${review.roomInfo}`);

  const liked = truncate(review.likedText);
  const disliked = truncate(review.dislikedText);
  if (liked) lines.push(`👍 ${liked}`);
  if (disliked) lines.push(`👎 ${disliked}`);

  return lines.join("\n");
}

export function formatDigestMessage(newReviews) {
  const header = `🏨 Laluna Hoi An - ${newReviews.length} New Booking.com Review${newReviews.length > 1 ? "s" : ""}`;
  const body = newReviews.map(formatReviewMessage).join("\n\n———\n\n");
  return `${header}\n\n${body}`;
}
