# Now Playing Widget Based on Last.fm

A tiny serverless function that renders your current (or most recently
played) Last.fm track as an SVG card — drop it straight into a GitHub
profile README, a personal site, or anywhere else that accepts an
image URL.

Inspired by [kittinan/spotify-github-profile](https://github.com/kittinan/spotify-github-profile),
but built for Last.fm, so I can catch and show music playing from Spotify, Bandcamp, Youtube, etc.

## Features

- The style is entirely based on the Novatorem theme made by [kittinan](https://github.com/kittinan): the widget shows artist, track title (scrolling marquee) and an animated equalizer
- Falls back to a clean "Offline / Currently not playing" state when
  nothing is playing
- Album art is embedded as base64 directly inside the SVG, so it still
  loads on sites that block external image domains (e.g. AniList)
- Automatically falls back to iTunes artwork when Last.fm has no real
  cover for a track (common with Bandcamp/SoundCloud scrobbles)
- Fully self-hosted on your own free Vercel account — no third-party
  service holding your data

## Live example
 
![Now playing](https://lastfm-widget-svg.vercel.app/api)

## Setup

1. **Get a Last.fm API key** — create one for free at
   [last.fm/api/account/create](https://www.last.fm/api/account/create).
2. **Deploy this repo to Vercel**:
   - Fork this repository
   - Go to [vercel.com/new](https://vercel.com/new) and import your fork
   - No build settings needed — Vercel auto-detects the `/api` folder
3. **Add 2 environment variables** in your Vercel project settings
   (Project → Settings → Environment Variables):

   | Name              | Value                        |
   |-------------------|------------------------------|
   | `LASTFM_USERNAME` | your Last.fm username        |
   | `LASTFM_API_KEY`  | the API key from step 1      |

4. Redeploy, then embed the widget URL anywhere:

   ```md
   ![Now playing](https://your-project.vercel.app/api)
   ```

## Query parameters (optional)

All of these are optional — set the env vars above and you're done.
These are only useful if you want to override something on the fly.

| Parameter          | Default       | Description                                            |
|---------------------|---------------|--------------------------------------------------------|
| `username`          | env var       | Last.fm username to look up                             |
| `background_color`  | `transparent` | Hex without `#` (e.g. `121212`) or a CSS keyword         |
| `border_radius`     | `12`          | Card corner radius in px                                 |
| `bar_color`         | `B3B3B3`      | Hex without `#` for the equalizer bars                   |

## Local development

```bash
npm i -g vercel
vercel dev
```

Then create a `.env.local` file with `LASTFM_USERNAME` and `LASTFM_API_KEY`,
and open `http://localhost:3000/api` in your browser.

## License

GPL-3.0 — see [LICENSE](./LICENSE).
