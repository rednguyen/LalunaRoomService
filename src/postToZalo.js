export async function postToZalo(text) {
  const url = process.env.ZALO_URL;
  const chatId = process.env.ZALO_CHAT_ID;
  if (!url) throw new Error("Missing ZALO_URL environment variable");
  if (!chatId) throw new Error("Missing ZALO_CHAT_ID environment variable");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  if (!res.ok) {
    throw new Error(`Zalo post failed: ${res.status} ${res.statusText} - ${await res.text()}`);
  }

  return res.json();
}
