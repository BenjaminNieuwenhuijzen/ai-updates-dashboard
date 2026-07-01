# Changelog

All notable changes to AI Radar are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/).

Each released version below links to a comparison with the previous one, so you
can see exactly what changed between any two versions.

## [Unreleased]

### Added
- Custom domain **ai-radar.eu**: added a `CNAME` and pointed all site URLs (README,
  `feed.xml`, build script, Blogtrottr link) at it, plus branding/SEO meta tags
  (description, canonical, Open Graph, Twitter card) in `index.html`.
- Drag-to-reorder the company cards. Drag a card by its grip handle to set your own
  order; it is remembered locally per browser and overrides the automatic activity
  ranking until you press **"Auto order"**. Works with mouse and touch.
- DeepSeek added as the 12th tracked company. It publishes no native or community RSS
  feed, so its card is fed by the official `deepseek-ai` GitHub release feeds plus a
  Google News query for current coverage, and is labelled a community source. Google
  News article links are excluded from screenshot thumbnails, so they fall back to the
  brand placeholder instead of a redirect page.
- Atom feed support in the build (`<entry>` / `<published>` / `<updated>` /
  `<link href>`), alongside the existing RSS `<item>` parsing.
- Many more sources per company — **12 → 36 feeds across the same 11 companies**:
  developer / research / engineering blogs, official newsrooms, product and
  release-note changelogs, and each company's official YouTube channel.
- Mistral now reads its official native feed instead of the community mirror.
- Three new per-post categories — **Hardware & Infrastructure**, **Developer & How-to**
  and **Applied AI** — while the old **Company** and **Safety** tags were broadened into
  **Business & Funding** and **Safety & Policy**, taking the taxonomy from 6 to 9.
- Multi-category post labels: a post can now carry more than one category chip (up to
  three, in priority order) instead of only its top match, so a model release that is
  also a policy story (e.g. "Redeploying Fable 5") shows both **Model release** and
  **Safety & Policy** rather than the first match alone. The category filter now matches
  any of a post's categories, which surfaces the model releases (~20 of them) that were
  hidden behind a higher-priority label under the **Model releases** filter.

### Changed
- `rssImage` skips non-image `media:content` (e.g. YouTube's video URL) and tiny
  author avatars (GitHub release feeds), so the real thumbnail is used.
- Items are de-duplicated by link, so overlapping feeds for one company (e.g. its
  AI-tag and full newsroom) no longer produce duplicates.
- Raised the dashboard item cap (`JSON_MAX`) from 360 to 800 for the larger feed set.
- Items published today now show the publication time (e.g. "today, 13:00") in the
  reader's local timezone; date-only feeds still show just "today".
- Tidied the header: dropped the "View"/"Search" caption labels (kept as `aria-label`)
  and removed the Refresh button, so the controls align on one centered row and the
  bar is shorter.
- Rewrote the automatic category classifier as a priority-ordered keyword chain (first
  match wins). Cut the uncategorised **Other** bucket from ~29% to ~12% of items and
  broke up the over-stuffed **Product** bucket, fixing rule gaps along the way (e.g.
  "fundraising" and the plural "APIs" were previously missed).
- The **Top story** block now leads with model releases: the hero lead card and the
  "More top stories" rail are both filled from the most recent model releases (30-day
  window), falling back to the newest items only when there are too few. The rail may
  repeat a company, since the aim is to surface releases rather than spread across
  companies.

### Fixed
- Company cards in a grid row now share a common bottom edge. The cards already
  stretch to equal height, but the "Show more" button sat at the end of each card's
  content and floated at uneven heights, so the empty space below it read as a ragged
  bottom. The button is now pinned to the bottom of the card, so buttons and card
  bottoms line up across a row.
- Anthropic research-mirror titles that glued the date, section label and headline into
  one string (e.g. "Jun 18, 2026Frontier Red TeamProject Fetch: Phase two") are now
  cleaned at build time down to just the headline.

## [1.0.0] - 2026-06-16

First tagged release. AI Radar (formerly "Model Monitor") aggregates news from 11
AI companies into a single GitHub Pages dashboard, refreshed every two hours by a
scheduled GitHub Action.

### Added
- By-company grid and a chronological timeline view; the grid is ordered by how
  active each company has recently been in the news.
- Top-story hero with a "more top stories" rail of other recent headlines.
- Optional daily "Today in AI" briefing generated server-side with Claude Haiku,
  shown on the page and prepended to the RSS feed (requires the `ANTHROPIC_API_KEY`
  repository secret; dormant and harmless without it).
- Filters by category, company and period; free-text search; and a per-article
  save list with a "Saved only" filter.
- Light / dark / auto theme switcher; preferences stored locally, no tracking.
- "New since your last visit" markers that persist across sessions, "Show more" /
  "Show less" per feed, and "Load more" in the timeline.
- Email subscription via Blogtrottr from a combined RSS feed, plus a direct RSS link.

### Changed
- Rebranded from Model Monitor to AI Radar, including a new radar logo.
- Decluttered the header behind a "Filters" disclosure and added a mobile breakpoint.
- Footer text is generated from configuration (company count, official/community
  feed split, category list).

### Accessibility
- `aria-live` status line, `aria-pressed` on the view and category toggles, and
  "/" to focus search.

### Documentation
- English README, MIT license, `.gitignore`, and all code comments translated to
  English.

[Unreleased]: https://github.com/BenjaminNieuwenhuijzen/ai-updates-dashboard/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/BenjaminNieuwenhuijzen/ai-updates-dashboard/releases/tag/v1.0.0
