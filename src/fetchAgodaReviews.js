const CUTOFF_DAYS_BACK = 11;

function cutoffVietnamDate() {
  // Vietnam is a fixed UTC+7 (no DST), so subtracting whole days of ms is exact.
  const cutoff = new Date(Date.now() - CUTOFF_DAYS_BACK * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(cutoff); // YYYY-MM-DD
}

function buildRunInput() {
  return {
    aggregateRatings: true,
    cutoffDate: cutoffVietnamDate(),
    enabledProviders: ["Agoda"],
    hotelUrl: "https://www.agoda.com/laluna-hoi-an-riverside-hotel-spa/hotel/hoi-an-vn.html?",
    language: "all",
    maxReviewsPerHotel: 5,
    rating: ["all"]
  };
}

// Map Agoda's fields onto the same shape as Booking reviews, so dedupe and
// formatting can treat both sources the same way.
function normalize(review) {
  return {
    id: `agoda-${review.hotelReviewId}`,
    rating: review.rating,
    reviewTitle: review.reviewTitle,
    userName: review.reviewerName,
    userLocation: review.reviewerCountryName,
    reviewDate: review.reviewDate,
    commentsText: review.reviewComments
  };
}

export async function fetchAgodaReviews() {
  const url = process.env.AGODA_URL;
  if (!url) throw new Error("Missing AGODA_URL environment variable");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRunInput())
  });

  if (!res.ok) {
    throw new Error(`Apify (Agoda) request failed: ${res.status} ${res.statusText} - ${await res.text()}`);
  }

  const reviews = await res.json();
  if (!Array.isArray(reviews)) {
    throw new Error("Unexpected Apify (Agoda) response shape: expected an array of reviews");
  }

  return reviews.filter((r) => r.hotelReviewId).map(normalize);
}
