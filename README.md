# Machine Decides Voting

Cloudflare Worker + D1 voting widget for the Machine Decides store at `machinedecides.com`.

## Endpoints

- `GET /api/current-week` returns the current `YY-WW` week, voting status, close time, designs, and winner when closed.
- `GET /api/designs` returns this week's designs.
- `GET /api/results` returns vote tallies for the current week, or `?week=YY-WW`.
- `POST /api/vote` records `{ "design_id": "..." }` using the client IP detected from Cloudflare headers.
- `GET /api/archive` returns past winners and past nominees for the embeddable widget.
- `GET /widget.js` serves the vanilla JS widget.
- `GET /vote` serves a minimal page with the widget mounted.

## Local Development

```bash
npm install
npm run dev
```

Apply the D1 schema after creating the database:

```bash
wrangler d1 create machine-decides-vote
wrangler d1 execute machine-decides-vote --file schema.sql
```

Replace the placeholder `database_id` in `wrangler.toml` with the ID returned by `wrangler d1 create`.

## Embed

```html
<div id="machine-decides-vote"></div>
<script src="https://YOUR_WORKER_DOMAIN/widget.js" data-api-base="https://YOUR_WORKER_DOMAIN" defer></script>
```

The widget is dependency-free, responsive, and themeable through CSS custom properties prefixed with `--mdv-`.
