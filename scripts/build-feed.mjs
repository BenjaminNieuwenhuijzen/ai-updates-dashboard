// Bouwt feed.xml: één gecombineerde RSS-feed uit de bronnen van Model Monitor.
// Draait in GitHub Actions (Node 20+, geen dependencies).
import { writeFileSync } from "node:fs";

const FEEDS = [
  ["OpenAI", "https://openai.com/news/rss.xml"],
  ["Anthropic", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml"],
  ["Google AI", "https://blog.google/technology/ai/rss/"],
  ["DeepMind", "https://deepmind.google/blog/rss.xml"],
  ["Meta AI", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml"],
  ["xAI", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml"],
  ["Mistral AI", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml"],
  ["Perplexity", "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_perplexity_hub.xml"]
];

const MAX_ITEMS = 60;

const pick = (xml, tag) => {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1].trim() : "";
};
const unCdata = s => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
const strip = s => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const items = [];
for (const [name, url] of FEEDS) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.error(`${name}: HTTP ${res.status}`); continue; }
    const xml = await res.text();
    let count = 0;
    for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
      const block = m[0];
      const title = strip(unCdata(pick(block, "title")));
      const link = unCdata(pick(block, "link"));
      const pubDate = pick(block, "pubDate");
      const t = Date.parse(pubDate);
      if (!title || !link || isNaN(t)) continue;
      const desc = strip(unCdata(pick(block, "description"))).slice(0, 300);
      items.push({ name, title, link, pubDate, t, desc });
      if (++count >= 15) break;
    }
    console.log(`${name}: ${count} items`);
  } catch (e) {
    console.error(`${name}: ${e.message}`);
  }
}

items.sort((a, b) => b.t - a.t);
const top = items.slice(0, MAX_ITEMS);

const out = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Model Monitor</title>
<link>https://benjaminnieuwenhuijzen.github.io/ai-updates-dashboard/</link>
<description>Gecombineerde updates van AI-bedrijven: OpenAI, Anthropic, Google, Meta, xAI, Mistral en Perplexity.</description>
<language>nl</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${top.map(i => `<item>
<title>${esc("[" + i.name + "] " + i.title)}</title>
<link>${esc(i.link)}</link>
<guid isPermaLink="false">${esc(i.link)}</guid>
<pubDate>${esc(i.pubDate)}</pubDate>
${i.desc && i.desc.toLowerCase() !== i.title.toLowerCase() ? "<description>" + esc(i.desc) + "</description>" : ""}
</item>`).join("\n")}
</channel>
</rss>
`;

writeFileSync("feed.xml", out);
console.log(`feed.xml geschreven: ${top.length} items van ${FEEDS.length} bronnen`);
