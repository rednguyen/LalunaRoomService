const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestTranslation(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const prompt = `Dịch đoạn văn bản sau đây sang tiếng Việt. Chỉ trả về bản dịch, không thêm giải thích hay chú thích nào khác:\n\n${text}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!res.ok) throw new Error(`Translation request failed: ${res.status}`);

  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

export async function translateToVietnamese(text) {
  if (!text) return text;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestTranslation(text);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Translation failed after ${MAX_ATTEMPTS} attempts, falling back to original text: ${err.message}`);
        return text;
      }
      console.error(`Translation attempt ${attempt} failed, retrying: ${err.message}`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}
