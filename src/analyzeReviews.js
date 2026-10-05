function buildPrompt(reviews) {
  const reviewText = reviews
    .map((r) => {
      const lines = [`Rating: ${r.rating}/10`];
      if (r.likedText) lines.push(`Liked: ${r.likedText}`);
      if (r.dislikedText) lines.push(`Disliked: ${r.dislikedText}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return `Dưới đây là các đánh giá của khách lưu trú tại khách sạn Laluna Hoi An trong ngày hôm nay:

${reviewText}

Hãy phân tích và tóm tắt ngắn gọn bằng tiếng Việt:
1. Điểm mạnh nổi bật (những gì khách khen)
2. Điểm cần cải thiện (những gì khách phàn nàn, nếu có)

Trả lời theo đúng định dạng sau:
✅ Điểm mạnh:
- ...

⚠️ Điểm cần cải thiện:
- ...

Nếu không có đánh giá nào chứa phần "Disliked" ở trên, bỏ qua HOÀN TOÀN phần "⚠️ Điểm cần cải thiện" - không viết tiêu đề đó, không viết "(Không có)", không đề cập gì đến việc không có điểm cần cải thiện. Chỉ trả về phần "✅ Điểm mạnh" trong trường hợp đó. Giữ câu trả lời ngắn gọn, súc tích.`;
}

export async function analyzeReviews(reviews) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(reviews) }] }] })
  });

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status} ${res.statusText} - ${await res.text()}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}
