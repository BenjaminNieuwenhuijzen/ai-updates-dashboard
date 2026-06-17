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
