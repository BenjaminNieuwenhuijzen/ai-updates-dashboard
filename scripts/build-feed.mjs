// Bouwt twee bestanden uit de bronfeeds van Model Monitor:
//   feed.xml  - gecombineerde RSS, voor het Blogtrottr-mailabonnement.
//   data.json - gestructureerd (incl. thumbnail + samenvatting), voor het dashboard.
// Ontbrekende afbeeldingen/samenvattingen worden via og:-tags van de artikelpagina
// aangevuld, met een cache over runs heen. Draait in GitHub Actions (Node 20+).
import { writeFileSync, readFileSync } from "node:fs";

// company = exacte kaartnaam in het dashboard; source = sublabel (bij meerdere feeds).
const FEEDS = [
  { company: "OpenAI", source: "", url: "https://openai.com/news/rss.xml" },
  { company: "Anthropic", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml" },
  { company: "Google (AI & DeepMind)", source: "Google AI", url: "https://blog.google/technology/ai/rss/" },
  { company: "Google (AI & DeepMind)", source: "DeepMind", url: "https://deepmind.google/blog/rss.xml" },
  { company: "Meta AI", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml" },
  { company: "Microsoft AI", source: "", url: "https://news.microsoft.com/source/topics/ai/feed/" },
  { company: "NVIDIA", source: "", url: "https://blogs.nvidia.com/feed/" },
  { company: "Hugging Face", source: "", url: "https://huggingface.co/blog/feed.xml" },
  { company: "xAI (Grok)", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml" },
  { company: "Perplexity", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_perplexity_hub.xml" },
  { company: "Mistral AI", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_mistral.xml" },
  { company: "Cohere", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_cohere.xml" }
];

const PER_FEED = 40;       // items per bronfeed
const RSS_MAX = 60;        // items in de gecombineerde RSS (e-mail)
const JSON_MAX = 360;      // items in data.json (dashboard)
const MAX_FETCH = 170;     // max. artikelpagina's ophalen per run (rest uit cache)
const CONCURRENCY = 8;

const pick = (xml, tag) => {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1].trim() : "";
};
const unCdata = s => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
// Decodeer ge-encode HTML-entiteiten, verwijder dan tags, normaliseer witruimte.
const strip = s => (s || "")
  .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"').replace(/&#0?39;/g, "'").replace(/&apos;/gi, "'").replace(/&nbsp;/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ").trim();
const escXml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const deEnt = s => s.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/").replace(/&#38;/g, "&");
const norm = s => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

function rssImage(block) {
  let m = block.match(/<media:(?:content|thumbnail)[^>]*\burl="([^"]+)"/i);
  if (m) return deEnt(m[1]);
  m = block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image/i) || block.match(/<enclosure[^>]*type="image[^>]*\burl="([^"]+)"/i);
  if (m) return deEnt(m[1]);
  const dec = block.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  m = dec.match(/<img[^>]*\bsrc="([^"]+)"/i);
  return m ? deEnt(m[1]) : "";
}

// Afbeelding + samenvatting van de artikelpagina (één request).
async function fetchMeta(url) {
  const out = { image: "", description: "" };
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; ModelMonitorBot/1.0)" }
    });
    if (!res.ok) return out;
    const html = (await res.text()).slice(0, 150000);
    const img = html.match(/<meta[^>]+(?:property|name)="og:image(?::secure_url)?"[^>]+content="([^"]+)"/i)
             || html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="og:image"/i)
             || html.match(/<meta[^>]+name="twitter:image(?::src)?"[^>]+content="([^"]+)"/i);
    if (img) { try { out.image = new URL(deEnt(img[1]), url).href; } catch {} }
    const desc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)
              || html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:description"/i)
              || html.match(/<meta[^>]+name="twitter:description"[^>]+content="([^"]*)"/i)
              || html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
    if (desc) out.description = strip(desc[1]).slice(0, 300);
    return out;
  } catch {
    return out;
  }
}

async function pool(tasks, size) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, async () => {
    while (i < tasks.length) { const idx = i++; await tasks[idx](); }
  }));
}

// ---- bronfeeds ophalen ----
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
      if (norm(desc) === norm(title)) desc = "";
      items.push({ company: feed.company, source: feed.source, title, link, pubDate, t, desc, image: rssImage(block) });
      if (++count >= PER_FEED) break;
    }
    console.log(`${feed.company}/${feed.source || "-"}: ${count} items`);
  } catch (e) {
    console.error(`${feed.company}/${feed.source || "-"}: ${e.message}`);
  }
}

items.sort((a, b) => b.t - a.t);
const kept = items.slice(0, JSON_MAX);

// ---- afbeeldingen + samenvattingen aanvullen ----
const cache = {};
try {
  const prev = JSON.parse(readFileSync("data.json", "utf8"));
  for (const it of prev.items || []) if (it.link) cache[it.link] = { image: it.image || "", summary: it.summary || "" };
} catch { /* eerste run */ }

let fetched = 0;
const tasks = [];
for (const it of kept) {
  const c = cache[it.link];
  if (!it.image && c && c.image) it.image = c.image;
  if (!it.desc && c && c.summary) it.desc = c.summary;
  if ((!it.image || !it.desc) && fetched < MAX_FETCH) {
    fetched++;
    tasks.push(async () => {
      const m = await fetchMeta(it.link);
      if (!it.image) it.image = m.image;
      if (!it.desc) it.desc = m.description;
    });
  }
}
await pool(tasks, CONCURRENCY);

// Blank boilerplate-samenvattingen: een tekst die binnen één bedrijf >1x voorkomt
// is vrijwel zeker de generieke sitebeschrijving, geen artikelsamenvatting.
const byCo = {};
for (const it of kept) (byCo[it.company] = byCo[it.company] || []).push(it);
for (const list of Object.values(byCo)) {
  const counts = {};
  for (const it of list) if (it.desc) counts[norm(it.desc)] = (counts[norm(it.desc)] || 0) + 1;
  for (const it of list) {
    if (it.desc && counts[norm(it.desc)] >= 2) it.desc = "";
    if (norm(it.desc) === norm(it.title)) it.desc = "";
  }
}
// Fallback-thumbnail: screenshot van de artikelpagina via thum.io. Werkt ook voor
// pagina's die og:image blokkeren (OpenAI, xAI, Perplexity), zodat elke kaart beeld krijgt.
const ogImages = kept.filter(i => i.image).length;
for (const it of kept) {
  if (!it.image && it.link) it.image = "https://image.thum.io/get/width/1200/crop/700/" + it.link;
}
console.log(`images: ${kept.filter(i => i.image).length}/${kept.length} (og:${ogImages}, screenshot:${kept.length - ogImages}) | summaries: ${kept.filter(i => i.desc).length}/${kept.length} | fetched: ${fetched}`);

// ---- data.json (dashboard) ----
const json = {
  generated: new Date().toISOString(),
  items: kept.map(i => ({
    company: i.company, source: i.source, title: i.title,
    link: i.link, date: i.pubDate, summary: i.desc, image: i.image || ""
  }))
};
writeFileSync("data.json", JSON.stringify(json));
console.log(`data.json: ${json.items.length} items`);

// ---- feed.xml (Blogtrottr e-mail) ----
const top = kept.slice(0, RSS_MAX);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Model Monitor</title>
<link>https://benjaminnieuwenhuijzen.github.io/ai-updates-dashboard/</link>
<description>Combined updates from leading AI companies.</description>
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
