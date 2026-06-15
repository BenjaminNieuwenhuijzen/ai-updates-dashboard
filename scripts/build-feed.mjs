// Bouwt twee bestanden uit de bronfeeds van Model Monitor:
//   feed.xml  - gecombineerde RSS, voor het Blogtrottr-mailabonnement.
//   data.json - gestructureerd, voor het dashboard zelf (geen CORS-proxy nodig).
// Draait in GitHub Actions (Node 20+, geen dependencies).
import { writeFileSync } from "node:fs";

// company = exacte kaartnaam in het dashboard; source = sublabel (bij meerdere feeds).
const FEEDS = [
  { company: "OpenAI", source: "", url: "https://openai.com/news/rss.xml" },
  { company: "Anthropic", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml" },
  { company: "Google (AI & DeepMind)", source: "Google AI", url: "https://blog.google/technology/ai/rss/" },
  { company: "Google (AI & DeepMind)", source: "DeepMind", url: "https://deepmind.google/blog/rss.xml" },
  { company: "Meta AI", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml" },
  { company: "xAI (Grok)", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml" },
  { company: "Perplexity", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_perplexity_hub.xml" },
  { company: "Mistral AI", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml" }
];

const PER_FEED = 40;     // items per bronfeed (diepte voor kaarten + tijdlijn)
const RSS_MAX = 60;      // items in de gecombineerde RSS (e-mail)
const JSON_MAX = 320;    // items in data.json (dashboard)

const pick = (xml, tag) => {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1].trim() : "";
};
const unCdata = s => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
const strip = s => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const escXml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const items = [];
for (const feed of FEEDS) {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) { console.error(`${feed.company}/${feed.source || "-"}: HTTP ${res.status}`); continue; }
    const xml = await res.text();
    let count = 0;
    for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
      const block = m[0];
      const title = strip(unCdata(pick(block, "title")));
      const link = unCdata(pick(block, "link"));
      const pubDate = pick(block, "pubDate");
      const t = Date.parse(pubDate);
      if (!title || !link || isNaN(t)) continue;
      let desc = strip(unCdata(pick(block, "description"))).slice(0, 300);
      if (desc.toLowerCase() === title.toLowerCase()) desc = "";   // feeds die de titel herhalen
      items.push({ company: feed.company, source: feed.source, title, link, pubDate, t, desc });
      if (++count >= PER_FEED) break;
    }
    console.log(`${feed.company}/${feed.source || "-"}: ${count} items`);
  } catch (e) {
    console.error(`${feed.company}/${feed.source || "-"}: ${e.message}`);
  }
}

items.sort((a, b) => b.t - a.t);

// ---- data.json (dashboard) ----
const json = {
  generated: new Date().toISOString(),
  items: items.slice(0, JSON_MAX).map(i => ({
    company: i.company,
    source: i.source,
    title: i.title,
    link: i.link,
    date: i.pubDate,
    summary: i.desc
  }))
};
writeFileSync("data.json", JSON.stringify(json));
console.log(`data.json: ${json.items.length} items`);

// ---- feed.xml (Blogtrottr e-mail) ----
const top = items.slice(0, RSS_MAX);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Model Monitor</title>
<link>https://benjaminnieuwenhuijzen.github.io/ai-updates-dashboard/</link>
<description>Combined updates from AI companies: OpenAI, Anthropic, Google, Meta, xAI, Mistral and Perplexity.</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${top.map(i => `<item>
<title>${escXml("[" + (i.source || i.company) + "] " + i.title)}</title>
<link>${escXml(i.link)}</link>
<guid isPermaLink="false">${escXml(i.link)}</guid>
<pubDate>${escXml(i.pubDate)}</pubDate>
${i.desc ? "<description>" + escXml(i.desc) + "</description>" : ""}
</item>`).join("\n")}
</channel>
</rss>
`;
writeFileSync("feed.xml", rss);
console.log(`feed.xml: ${top.length} items from ${FEEDS.length} feeds`);
