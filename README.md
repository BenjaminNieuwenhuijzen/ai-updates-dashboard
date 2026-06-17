# AI Radar

A live dashboard of the latest news from the leading AI companies, aggregated from their official and community feeds into one page. AI Radar is a single static page published with GitHub Pages and refreshed by a scheduled GitHub Action.

**Live:** https://benjaminnieuwenhuijzen.github.io/ai-updates-dashboard/

## What it does

AI Radar follows 12 companies (OpenAI, Anthropic, Google AI & DeepMind, Meta AI, Microsoft AI, NVIDIA, Hugging Face, xAI, Perplexity, Mistral, Cohere, DeepSeek) and brings their updates together:

- **By company** grid, ordered by how active each company has recently been in the news.
- **Timeline** view of every update in chronological order, with a "Load more" control.
- A **top story** hero with a "more top stories" rail of other recent headlines.
- An optional daily **"Today in AI"** briefing generated during the build (see below).
- Filters by category, company and period, plus free-text search and a per-article **save** list.
- Light / dark / auto theme. No analytics, no tracking, no cookies; preferences are stored only locally in the browser.

## How it works

A GitHub Action (`.github/workflows/build-feed.yml` running `scripts/build-feed.mjs`) runs every two hours and writes three files to the repository root:

- `data.json` — structured items (title, link, date, summary, image, company); the dashboard's primary data source.
- `feed.xml` — a combined RSS feed used for the email subscription via Blogtrottr.
- `digest.json` — the optional daily briefing (only when enabled; see below).

`index.html` reads `data.json` from its own domain. If that is unreachable (for example when the file is opened locally) it falls back to fetching each feed live through public CORS proxies. Missing thumbnails and summaries are backfilled from each article's Open Graph tags during the build, cached across runs.

## Daily briefing (optional)

When the repository secret `ANTHROPIC_API_KEY` is set, the build generates a five-item "Today in AI" briefing once per UTC day with the Anthropic Messages API (Claude Haiku), writes it to `digest.json`, and prepends it to `feed.xml` for email subscribers. Without the secret the feature stays dormant and the rest of the build is unaffected.

To enable it: add the secret under **Settings → Secrets and variables → Actions**, then run the workflow (it also runs on the two-hour schedule).

## Local preview

The dashboard is a single self-contained file. Serve the repository folder with any static web server and open `index.html`. The build script needs Node 20+, but it only runs in CI.

## Versioning and releases

The project follows [Semantic Versioning](https://semver.org/), and every notable change is recorded in [CHANGELOG.md](CHANGELOG.md).

Tagged releases (`vX.Y.Z`) automatically create a GitHub Release: pushing a tag runs `.github/workflows/release.yml`, which generates release notes and a "Full Changelog" link comparing the tag to the previous release. So each release shows exactly what changed since the last version and links back through the whole history. Routine feed-data commits made by the build bot are excluded from the notes.

To make per-change history easy to review, prefer pull requests over direct pushes: create a branch, open a PR (a template is provided), review the diff, then merge. Merged PRs are grouped into the next release's notes.

```
# cut a release once changes are on main
git tag -a v1.1.0 -m "AI Radar 1.1.0"
git push origin v1.1.0
```

## Sources and disclaimer

AI Radar reads publicly available feeds and displays them unchanged. Some companies are read from an official feed; the others from a community feed that may lag behind. No rights can be derived from the information shown, and no guarantee is made as to its accuracy, completeness or timeliness. All rights to the posts remain with the original sources. Brand names and logos are the property of their respective owners and are used for identification only; this project is not affiliated with or endorsed by any of the companies listed.

## License

The code in this repository is released under the MIT License (see [LICENSE](LICENSE)). The license covers the code only, not the aggregated third-party content.

Made by Benjamin Nieuwenhuijzen.
