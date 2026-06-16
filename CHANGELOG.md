# Changelog

All notable changes to AI Radar are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/).

Each released version below links to a comparison with the previous one, so you
can see exactly what changed between any two versions.

## [Unreleased]

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
