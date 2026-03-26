export async function fetchRawHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "PageIntelBot/0.1 (+https://pageintel.local)" },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch HTML (${response.status})`);
  }

  return response.text();
}
