const APIFY_RUN_INPUT = {
  maxReviewsPerHotel: 15,
  reviewScores: ["ALL"],
  sortReviewsBy: "f_recent_desc",
  startUrls: [
    { url: "https://www.booking.com/hotel/vn/laluna-hoi-an-riverside-hotel.html#tab-reviews" }
  ]
};

export async function fetchReviews() {
  const url = process.env.APIFY_URL;
  if (!url) throw new Error("Missing APIFY_URL environment variable");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(APIFY_RUN_INPUT)
  });

  if (!res.ok) {
    throw new Error(`Apify request failed: ${res.status} ${res.statusText} - ${await res.text()}`);
  }

  const reviews = await res.json();
  if (!Array.isArray(reviews)) {
    throw new Error("Unexpected Apify response shape: expected an array of reviews");
  }

  return reviews;
}
