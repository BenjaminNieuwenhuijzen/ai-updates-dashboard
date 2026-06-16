// Builds two files from AI Radar's source feeds:
//   feed.xml  - combined RSS, for the Blogtrottr email subscription.
//   data.json - structured (incl. thumbnail + summary), for the dashboard.
// Missing images/summaries are filled in from the article page's og: tags,
// with a cache that persists across runs. Runs in GitHub Actions (Node 20+).
import { writeFileSync, readFileSync } from "node:fs";

// company = exact card name in the dashboard; source = sublabel (when there are multiple feeds).
// All URLs verified live (2026-06-16). format=Atom feeds (<entry>) need the Atom branch
// in the parser below; format=RSS feeds use <item>. Channel IDs for YouTube confirmed official.
const FEEDS = [
  // OpenAI — official news + developer-platform docs + status + video
  { company: "OpenAI", source: "News", url: "https://openai.com/news/rss.xml" },
  { company: "OpenAI", source: "Developer", url: "https://developers.openai.com/rss.xml" },
  { company: "OpenAI", source: "Status", url: "https://status.openai.com/history.rss" },
  { company: "OpenAI", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXZCJLdBC09xxGZ6gcdrc6A" },
  // Anthropic — community mirrors (Anthropic publishes no native RSS) + video
  { company: "Anthropic", source: "News", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml" },
  { company: "Anthropic", source: "Research", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_research.xml" },
  { company: "Anthropic", source: "Engineering", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml" },
  { company: "Anthropic", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCrDwWp7EBBv4NwvScIpBDOA" },
  // Google — AI blog + DeepMind + Research + Cloud AI + Gemini product + DeepMind video
  { company: "Google (AI & DeepMind)", source: "Google AI", url: "https://blog.google/technology/ai/rss/" },
  { company: "Google (AI & DeepMind)", source: "DeepMind", url: "https://deepmind.google/blog/rss.xml" },
  { company: "Google (AI & DeepMind)", source: "Research", url: "https://research.google/blog/rss/" },
  { company: "Google (AI & DeepMind)", source: "Cloud AI", url: "https://cloudblog.withgoogle.com/products/ai-machine-learning/rss/" },
  { company: "Google (AI & DeepMind)", source: "Gemini", url: "https://blog.google/products/gemini/rss/" },
  { company: "Google (AI & DeepMind)", source: "DeepMind video", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCP7jMXSY2xbc3KCAE0MHQ-A" },
  // Meta AI — research-blog mirror + AI-tag newsroom + full newsroom + video (dedup handles overlap)
  { company: "Meta AI", source: "Blog", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml" },
  { company: "Meta AI", source: "Newsroom (AI)", url: "https://about.fb.com/news/tag/ai/feed/" },
  { company: "Meta AI", source: "Newsroom", url: "https://about.fb.com/news/feed/" },
  { company: "Meta AI", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC5qxlwEKM7-5YZudb24l0bg" },
  // Microsoft AI — Source newsroom + Research + Agent Framework + Azure + Microsoft 365
  { company: "Microsoft AI", source: "Source", url: "https://news.microsoft.com/source/topics/ai/feed/" },
  { company: "Microsoft AI", source: "Research", url: "https://www.microsoft.com/en-us/research/feed/" },
  { company: "Microsoft AI", source: "Agent Framework", url: "https://devblogs.microsoft.com/semantic-kernel/feed/" },
  { company: "Microsoft AI", source: "Azure", url: "https://azure.microsoft.com/en-us/blog/feed/" },
  { company: "Microsoft AI", source: "Microsoft 365", url: "https://www.microsoft.com/en-us/microsoft-365/blog/feed/" },
  // NVIDIA — corporate blog + newsroom press + technical/developer blog (Atom) + video
  { company: "NVIDIA", source: "Blog", url: "https://blogs.nvidia.com/feed/" },
  { company: "NVIDIA", source: "Newsroom", url: "https://nvidianews.nvidia.com/rss.xml" },
  { company: "NVIDIA", source: "Developer", url: "https://developer.nvidia.com/blog/feed/" },
  { company: "NVIDIA", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHuiy8bXnmK5nisYHUd1J5g" },
  // Hugging Face — official blog + status + video (HF exposes no other native RSS)
  { company: "Hugging Face", source: "Blog", url: "https://huggingface.co/blog/feed.xml" },
  { company: "Hugging Face", source: "Status", url: "https://status.huggingface.co/feed.rss" },
  { company: "Hugging Face", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCHlNU7kIZhRgSbhHvFoy72w" },
  // xAI (Grok) — community mirror of x.ai/news only (no official RSS or legitimate YouTube exists)
  { company: "xAI (Grok)", source: "", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml" },
  // Perplexity — community mirror of perplexity.ai/hub (no native RSS at all) + official video
  { company: "Perplexity", source: "Hub", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_perplexity_hub.xml" },
  { company: "Perplexity", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCYqxnCFtaC4-iC_bwt2bRLg" },
  // Mistral AI — official native feed (replaces the older mirror) + official video
  { company: "Mistral AI", source: "News", url: "https://mistral.ai/rss.xml" },
  { company: "Mistral AI", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC5-pBdfdA3KUo-vq72l-umA" },
  // Cohere — blog mirror + official changelog + status + video
  { company: "Cohere", source: "Blog", url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_cohere.xml" },
  { company: "Cohere", source: "Changelog", url: "https://docs.cohere.com/changelog.rss" },
  { company: "Cohere", source: "Status", url: "https://status.cohere.com/history.rss" },
  { company: "Cohere", source: "YouTube", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCAKTUy0tz47ZY02DFpxMqoQ" }
];

const PER_FEED = 40;       // items per source feed
const RSS_MAX = 60;        // items in the combined RSS (email)
const JSON_MAX = 800;      // items in data.json (dashboard) — raised for the larger feed set
const MAX_FETCH = 170;     // max article pages to fetch per run (rest from cache)
const CONCURRENCY = 8;

const pick = (xml, tag) => {
  const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i"));
  return m ? m[1].trim() : "";
};
const unCdata = s => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1").trim();
// Decode encoded HTML entities, then strip tags, then normalize whitespace.
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
  // media:content / media:thumbnail. Skip non-image media:content (YouTube lists the video
  // URL as media:content before the thumbnail) and tiny author avatars (GitHub releases.atom).
  for (const mm of block.matchAll(/<media:(content|thumbnail)\b([^>]*)>/gi)) {
    const tag = mm[1].toLowerCase(), attrs = mm[2];
    const u = attrs.match(/\burl="([^"]+)"/i);
    if (!u) continue;
    const type = attrs.match(/\btype="([^"]+)"/i);
    if (tag === "content" && type && !/^image\//i.test(type[1])) continue;
    const w = attrs.match(/\bwidth="(\d+)"/i);
    if (w && Number(w[1]) <= 120) continue;
    if (/avatars\.githubusercontent\.com/i.test(u[1])) continue;
    return deEnt(u[1]);
  }
  let m = block.match(/<enclosure[^>]*\burl="([^"]+)"[^>]*type="image/i) || block.match(/<enclosure[^>]*type="image[^>]*\burl="([^"]+)"/i);
  if (m) return deEnt(m[1]);
  const dec = block.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  m = dec.match(/<img[^>]*\bsrc="([^"]+)"/i);
  return m ? deEnt(m[1]) : "";
}

// Atom <link href="..."> extraction (prefer rel="alternate"; YouTube/GitHub use that).
function atomLink(block) {
  let m = block.match(/<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["']/i)
       || block.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']alternate["']/i)
       || block.match(/<link[^>]*\bhref=["']([^"']+)["']/i);
  return m ? deEnt(m[1]) : "";
}

// Image + summary from the article page (one request).
async function fetchMeta(url) {
  const out = { image: "", description: "" };
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; AIRadarBot/1.0)" }
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

// ---- fetch source feeds (handles both RSS <item> and Atom <entry>) ----
const items = [];
for (const feed of FEEDS) {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(20000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; AIRadarBot/1.0)" }
    });
    if (!res.ok) { console.error(`${feed.company}/${feed.source || "-"}: HTTP ${res.status}`); continue; }
    const xml = await res.text();
    // Atom = has <entry> and no <item>. (RSS feeds may carry an <atom:link> self-ref,
    // so we must NOT detect on the Atom namespace alone.)
    const isAtom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
    const blockRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;
    let count = 0;
    for (const m of xml.matchAll(blockRe)) {
      const block = m[0];
      const title = strip(unCdata(pick(block, "title")));
      let link, pubDate, t, desc;
      if (isAtom) {
        link = atomLink(block);
        t = Date.parse(pick(block, "published") || pick(block, "updated"));
        pubDate = isNaN(t) ? "" : new Date(t).toUTCString();   // RFC822 for the email RSS
        desc = strip(unCdata(pick(block, "summary") || pick(block, "media:description") || pick(block, "content"))).slice(0, 300);
      } else {
        link = unCdata(pick(block, "link"));
        pubDate = pick(block, "pubDate");
        t = Date.parse(pubDate);
        desc = strip(unCdata(pick(block, "description"))).slice(0, 300);
      }
      if (!title || !link || isNaN(t)) continue;
      if (norm(desc) === norm(title)) desc = "";
      items.push({ company: feed.company, source: feed.source, title, link, pubDate, t, desc, image: rssImage(block) });
      if (++count >= PER_FEED) break;
    }
    console.log(`${feed.company}/${feed.source || "-"}: ${count} items${isAtom ? " (atom)" : ""}`);
  } catch (e) {
    console.error(`${feed.company}/${feed.source || "-"}: ${e.message}`);
  }
}

items.sort((a, b) => b.t - a.t);
// De-duplicate by link: overlapping feeds for one company (e.g. the AI-tag newsroom and the
// full newsroom) can carry the same article. Keep the first (newest) occurrence. Only the URL
// fragment + trailing slash are normalized, so distinct ?v= YouTube videos are kept separate.
const seenLinks = new Set();
const deduped = [];
for (const it of items) {
  const key = (it.link || "").trim().replace(/#.*$/, "").replace(/\/+$/, "").toLowerCase();
  if (key && seenLinks.has(key)) continue;
  if (key) seenLinks.add(key);
  deduped.push(it);
}
const kept = deduped.slice(0, JSON_MAX);

// ---- fill in images + summaries ----
const cache = {};
try {
  const prev = JSON.parse(readFileSync("data.json", "utf8"));
  for (const it of prev.items || []) if (it.link) cache[it.link] = { image: it.image || "", summary: it.summary || "" };
} catch { /* first run */ }

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

// Blank out boilerplate summaries: text that appears >1x within a single company
// is almost certainly the generic site description, not an article summary.
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
// Fallback thumbnail: screenshot of the article page via thum.io. NOT for domains
// that also block thum.io's crawler with Cloudflare (the screenshot would then show
// an "access denied" page) — those items stay imageless and get a clean brand
// placeholder in the dashboard.
const SCREENSHOT_BLOCK = ["openai.com", "x.ai"];
const ogImages = kept.filter(i => i.image).length;
for (const it of kept) {
  if (it.image || !it.link) continue;
  let host = "";
  try { host = new URL(it.link).hostname.replace(/^www\./, ""); } catch {}
  if (SCREENSHOT_BLOCK.some(d => host === d || host.endsWith("." + d))) continue;
  it.image = "https://image.thum.io/get/width/1200/crop/700/" + it.link;
}
// Safety net: blocked domains must never keep a screenshot, not even one that
// still comes from a previous run's cache.
for (const it of kept) {
  if (!it.image.includes("image.thum.io")) continue;
  let host = "";
  try { host = new URL(it.link).hostname.replace(/^www\./, ""); } catch {}
  if (SCREENSHOT_BLOCK.some(d => host === d || host.endsWith("." + d))) it.image = "";
}
console.log(`images: ${kept.filter(i => i.image).length}/${kept.length} (og:${ogImages}, screenshot:${kept.length - ogImages}) | summaries: ${kept.filter(i => i.desc).length}/${kept.length} | fetched: ${fetched}`);

// ---- daily briefing (Claude Haiku, server-side) ----
// Generates "Today in AI": 5 short items from the latest headlines. Runs at most
// once per UTC day and only if ANTHROPIC_API_KEY is set; without a key or on an
// error the existing digest.json is kept, so the feed build never breaks.
async function generateDigest(allItems) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let prev = null;
  try { prev = JSON.parse(readFileSync("digest.json", "utf8")); } catch { /* no digest yet */ }
  if (!apiKey) { console.log("digest: no ANTHROPIC_API_KEY — skipping"); return prev; }

  const today = new Date().toISOString().slice(0, 10);
  if (prev && prev.date === today && Array.isArray(prev.items) && prev.items.length) {
    console.log("digest: already generated for " + today + " — keeping");
    return prev;
  }

  const recent = allItems.slice(0, 30)
    .map(i => `- [${i.company}] ${i.title}${i.desc ? " — " + i.desc : ""}`)
    .join("\n");
  const schema = {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            headline: { type: "string" },
            summary: { type: "string" },
            company: { type: "string" }
          },
          required: ["headline", "summary", "company"],
          additionalProperties: false
        }
      }
    },
    required: ["items"],
    additionalProperties: false
  };
  const body = {
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: "You are the editor of an AI-industry news dashboard. From the supplied recent headlines across multiple AI companies, pick the five most significant and write a tight daily briefing. Be factual and concise, no hype, no marketing language. Each item: a short headline (max ~8 words), a one-sentence summary, and the company name exactly as given.",
    messages: [{ role: "user", content: `Recent AI updates:\n\n${recent}\n\nReturn the five most significant as JSON.` }],
    output_config: { format: { type: "json_schema", schema } }
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000)
    });
    if (!res.ok) {
      console.error("digest: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
      return prev;
    }
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = JSON.parse(text);
    const items = (parsed.items || []).slice(0, 6);
    if (!items.length) { console.error("digest: empty result"); return prev; }
    console.log("digest: generated " + items.length + " items for " + today);
    return { date: today, generated: new Date().toISOString(), items };
  } catch (e) {
    console.error("digest error: " + e.message);
    return prev;   // on an error, keep the previous digest
  }
}
const digest = await generateDigest(kept);
if (digest) {
  writeFileSync("digest.json", JSON.stringify(digest));
  console.log(`digest.json: ${digest.items.length} items (${digest.date})`);
}

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

// ---- feed.xml (Blogtrottr email) ----
const top = kept.slice(0, RSS_MAX);
// Daily briefing as the top email item (guid per day, so sent once per day).
const digestItem = digest && digest.items && digest.items.length ? `<item>
<title>${escXml("AI Radar — Today in AI (" + digest.date + ")")}</title>
<link>https://benjaminnieuwenhuijzen.github.io/ai-updates-dashboard/</link>
<guid isPermaLink="false">mm-digest-${digest.date}</guid>
<pubDate>${new Date().toUTCString()}</pubDate>
<description>${escXml(digest.items.map(d => "• " + d.headline + " (" + d.company + "): " + d.summary).join("\n"))}</description>
</item>
` : "";
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>AI Radar</title>
<link>https://benjaminnieuwenhuijzen.github.io/ai-updates-dashboard/</link>
<description>Combined updates from leading AI companies.</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${digestItem}${top.map(i => `<item>
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
