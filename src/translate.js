export async function translateToVietnamese(text, sourceLang = "autodetect") {
  if (!text) return text;
  if (sourceLang === "vi") return text;

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|vi`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Translation request failed: ${res.status}`);

    const data = await res.json();
    if (data.responseStatus !== 200) {
      throw new Error(`Translation failed: ${data.responseDetails}`);
    }

    return data.responseData.translatedText;
  } catch (err) {
    console.error(`Translation failed, falling back to original text: ${err.message}`);
    return text;
  }
}
