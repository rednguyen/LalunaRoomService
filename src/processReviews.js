import { translateToVietnamese } from "./translate.js";

export function selectNewReviews(reviews, postedIds) {
  const seen = new Set(postedIds);
  return reviews
    .filter((r) => r.id && !seen.has(r.id))
    .sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate));
}

function formatVietnamDate(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function todayVietnamDate() {
  return formatVietnamDate(new Date());
}

export function visibleDislikedText(review) {
  return review.rating < 8 ? review.dislikedText : null;
}

export async function formatReviewMessage(review) {
  const lines = [];
  lines.push(`⭐ ${review.rating}/10 - ${review.reviewTitle}`);
  lines.push(`👤 ${review.userName} - ${review.userLocation}`);
  lines.push(`📅 Ngày: ${formatVietnamDate(new Date(review.reviewDate))}`);
  lines.push("--------------------------------------");
  if (review.likedText) {
    const liked = await translateToVietnamese(review.likedText);
    lines.push(`👍 Good:\n${liked}`);
  }
  const dislikedText = visibleDislikedText(review);
  if (dislikedText) {
    const disliked = await translateToVietnamese(dislikedText);
    lines.push(`👎 Bad:\n${disliked}`);
  }

  return lines.join("\n");
}

