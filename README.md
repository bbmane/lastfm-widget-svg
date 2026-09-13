# Now Playing Widget Based on Last.fm

A lightweight widget, powered by a tiny serverless function, that shows
your current Last.fm track as an SVG card — drop it straight into a GitHub
profile README, a personal site, or anywhere else that accepts an
image URL (e.g. AniList).

Inspired by [kittinan/spotify-github-profile](https://github.com/kittinan/spotify-github-profile),
but built for Last.fm, so it can catch and show music playing from Spotify, Bandcamp, Youtube, etc.

## Features

- The style is entirely based on the Novatorem theme made by [kittinan](https://github.com/kittinan): the widget shows artist, track title (scrolling marquee) and an animated equalizer
- Falls back to a clean "Offline / Currently not playing" state when
  nothing is playing
- Album art is embedded as base64 directly inside the SVG, so it still
  loads on sites that block external image domains (e.g. AniList)
- Automatically falls back to iTunes and Deezer artwork (searching by
  track, then by album) when Last.fm has no usable cover — common with
  scrobbles from Bandcamp/SoundCloud, or for niche/underground artists
- Fully self-hosted on your own free Vercel account — no third-party
  service holding your data

## Live example
 
[<img src='https://lastfm-widget-svg.vercel.app/api'> ](https://www.last.fm/user/bbmane)

## Prerequisites
 
Before you start, you need:
 
- A [Last.fm](https://www.last.fm/) account
- A scrobbler connected to it, so it actually knows what you're
  listening to — e.g. the [official Last.fm web/desktop app](https://www.last.fm/about/trackmymusic),
  the great [web browser extension](https://github.com/web-scrobbler), a mobile scrobbler app, or all of these lol
- A Last.fm API key — create one for free at
   [last.fm/api/account/create](https://www.last.fm/api/account/create)
- A [GitHub](https://github.com) account, to fork this repo
- A free [Vercel](https://vercel.com/signup) account, to host the widget
- (Optional, for local development only) [Node.js](https://nodejs.org/) and the [Vercel CLI](https://vercel.com/docs/cli)

## Setup

1. **Deploy this repo to Vercel**:
   - Fork this repository
   - Go to [vercel.com/new](https://vercel.com/new) and import your fork
   - No build settings needed — Vercel auto-detects the `/api` folder
2. **Add 2 environment variables** in your Vercel project settings
   (Project → Settings → Environment Variables):

   | Name              | Value                        |
   |-------------------|------------------------------|
   | `LASTFM_USERNAME` | your Last.fm username        |
   | `LASTFM_API_KEY`  | the API key from step 1      |

3. Redeploy, then embed the widget URL anywhere:

   ```md
   ![Now playing](https://your-project.vercel.app/api)
   ```
   or
   ```md
   [<img src='https://your-project.vercel.app/api'> ](https://www.last.fm/user/your-username)
   ```

## (Optional) Query parameters

All of these are optional — set the env vars above and you're done.
These are only useful if you want to override something on the fly.

| Parameter          | Default       | Description                                            |
|---------------------|---------------|--------------------------------------------------------|
| `username`          | env var       | Last.fm username to look up                             |
| `background_color`  | `transparent` | Hex without `#` (e.g. `121212`) or a CSS keyword         |
| `border_radius`     | `12`          | Card corner radius in px                                 |
| `bar_color`         | `B3B3B3`      | Hex without `#` for the equalizer bars                   |

   ```md
   e.g. ![Now playing](https://lastfm-widget-svg.vercel.app/api?background_color=1a1a1a&border_radius=20&bar_color=ff5555)
   ```

[<img src='https://lastfm-widget-svg.vercel.app/api?background_color=1a1a1a&border_radius=20&bar_color=ff5555'> ](https://www.last.fm/user/bbmane)

## (Optional) Local development

```bash
npm i -g vercel
vercel dev
```

Then create a `.env.local` file with `LASTFM_USERNAME` and `LASTFM_API_KEY`,
and open `http://localhost:3000/api` in your browser.
