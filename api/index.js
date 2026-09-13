export default async function handler(req, res) {
  const username = req.query.username || process.env.LASTFM_USERNAME;
  const apiKey = req.query.api_key || process.env.LASTFM_API_KEY;

  // Optional customization parameters, kittinan-style
  const backgroundColor = req.query.background_color || 'transparent';
  const borderRadius = req.query.border_radius || '12';
  const barColor = req.query.bar_color || 'B3B3B3'; // grey, always the same

  if (!username || !apiKey) {
    return sendErrorSvg(res, 'Missing parameters', backgroundColor, borderRadius);
  }

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`
    );
    const data = await response.json();

    if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
      throw new Error('No track found');
    }

    const track = data.recenttracks.track[0];
    const rawTrackName = track.name || 'Unknown';
    const rawArtistName = track.artist['#text'] || 'Unknown artist';
    const rawAlbumName = (track.album && track.album['#text']) || '';
    const trackName = escapeXml(rawTrackName);
    const artistName = escapeXml(rawArtistName);
    const trackUrl = track.url || '#';

    const isPlaying = !!(track['@attr'] && track['@attr'].nowplaying === 'true');

    let albumArt = track.image && track.image[2] && track.image[2]['#text'];
    let albumArtBase64 = null;

    if (isPlaying) {
      if (!isLastfmPlaceholder(albumArt)) {
        albumArtBase64 = await toBase64DataUri(albumArt);
      }

      // Either Last.fm had no image at all, or it gave us a URL that looked
      // valid but failed to actually download (404, broken CDN entry, etc.)
      // — either way, try the search fallbacks before giving up.
      if (!albumArtBase64) {
        const foundArt = await findArtwork(rawArtistName, rawTrackName, rawAlbumName);
        if (foundArt) {
          albumArtBase64 = await toBase64DataUri(foundArt);
        }
      }
    }

    // Offline, or nothing worked: locally generated placeholder (no
    // network involved, can never fail).
    if (!albumArtBase64) {
      albumArtBase64 = fallbackCoverDataUri();
    }

    const displayArtist = isPlaying ? artistName : 'Offline';
    const displaySong = isPlaying ? trackName : 'Currently not playing';

    const width = 460;
    const height = 140;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    res.status(200).send(buildSvg({
      width,
      height,
      backgroundColor,
      borderRadius,
      barColor,
      albumArt: albumArtBase64,
      artistName: displayArtist,
      trackName: displaySong,
      trackUrl,
      isPlaying,
    }));
  } catch (err) {
    sendErrorSvg(res, 'No track found', backgroundColor, borderRadius);
  }
}

function toCssColor(value) {
  // Accepts both CSS keywords (transparent, white, ...) and hex without #
  return /^[0-9a-fA-F]{3,8}$/.test(value) ? `#${value}` : value;
}

// Last.fm often returns this exact hash as the "cover art" when the track
// actually has no image associated with it (very common with scrobbles
// from Bandcamp/SoundCloud/local files). It should be treated as "no
// image", not as a valid image to display.
const LASTFM_PLACEHOLDER_HASH = '2a96cbd8b46e442fc41c2b86b821562f';

function isLastfmPlaceholder(url) {
  return !url || url.includes(LASTFM_PLACEHOLDER_HASH);
}

// Store catalogs often list a track without the "(feat. X)" / "[Remix]"
// style annotations that Last.fm keeps, so searching with the raw title
// can miss an otherwise perfectly findable track. Stripping that out
// before searching noticeably improves the hit rate.
function cleanForSearch(title) {
  return title
    .replace(/[([][^)\]]*\b(feat\.?|ft\.?|with)\b[^)\]]*[)\]]/gi, '')
    .replace(/[([][^)\]]*\b(remix|remaster(ed)?|live|edit|version)\b[^)\]]*[)\]]/gi, '')
    .trim();
}

// Fallback: if Last.fm has no real cover, try to fetch one from the
// iTunes Search API (public, free, no API key required).
async function fetchItunesArtwork(query, entity = 'song') {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=${entity}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[iTunes] HTTP ${response.status} for "${query}" (${entity})`);
      return null;
    }

    const data = await response.json();
    const artworkUrl = data.results && data.results[0] && data.results[0].artworkUrl100;
    if (!artworkUrl) {
      console.warn(`[iTunes] No results for "${query}" (${entity})`);
      return null;
    }

    // artworkUrl100 is 100x100, ask for a bigger version
    return artworkUrl.replace('100x100bb', '400x400bb');
  } catch (err) {
    console.warn(`[iTunes] Error for "${query}" (${entity}):`, err.message);
    return null;
  }
}

// Second source: Deezer's search API (public, free, no API key required
// either). Its catalog doesn't fully overlap with iTunes, so it
// occasionally finds art for niche/underground artists that Apple's
// catalog is missing.
async function fetchDeezerArtwork(query, type = 'track') {
  try {
    const url = `https://api.deezer.com/search/${type}?q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Deezer] HTTP ${response.status} for "${query}" (${type})`);
      return null;
    }

    const data = await response.json();
    const result = data.data && data.data[0];
    if (!result) {
      console.warn(`[Deezer] No results for "${query}" (${type})`);
      return null;
    }

    const artworkUrl = type === 'album'
      ? result.cover_big || result.cover_medium
      : result.album && (result.album.cover_big || result.album.cover_medium);
    return artworkUrl || null;
  } catch (err) {
    console.warn(`[Deezer] Error for "${query}" (${type}):`, err.message);
    return null;
  }
}

// Tries, in order: iTunes and Deezer by track title, then — if the track
// itself has no match — iTunes and Deezer by album name (Last.fm often
// knows the album even when the track has no artwork, and album-level
// search succeeds more often for obscure/underground artists).
async function findArtwork(artist, track, album) {
  const cleanTrack = cleanForSearch(track);

  const byTrack =
    (await fetchItunesArtwork(`${artist} ${cleanTrack}`, 'song')) ||
    (await fetchDeezerArtwork(`${artist} ${cleanTrack}`, 'track'));
  if (byTrack) return byTrack;

  if (album) {
    const byAlbum =
      (await fetchItunesArtwork(`${artist} ${album}`, 'album')) ||
      (await fetchDeezerArtwork(`${artist} ${album}`, 'album'));
    if (byAlbum) return byAlbum;
  }

  return null;
}

// Downloads the image and converts it to a data URI, so it ends up
// embedded directly inside the SVG instead of being an external link
// (useful for sites like AniList that block images from third-party
// domains).
// Some CDNs (Bandcamp's included) occasionally respond with a
// content-type header that claims to be an image while the body is
// actually an error page or truncated data. Trusting the header alone
// can embed corrupt bytes that show up as a broken-image icon in the
// browser. Checking the real magic bytes at the start of the file is a
// much more reliable signal than the header.
function detectImageMimeType(buffer) {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') return 'image/png';
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';

  return null;
}

async function toBase64DataUri(url) {
  try {
    if (!url) throw new Error('Empty URL');

    const imgResponse = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LastfmWidget/1.0)' },
    });

    if (!imgResponse.ok) throw new Error(`HTTP ${imgResponse.status}`);

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const realMimeType = detectImageMimeType(buffer);
    if (!realMimeType) throw new Error('Response body is not a recognizable image (bad/corrupt data)');

    return `data:${realMimeType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn(`[Cover download] Failed for "${url}":`, err.message);
    return null;
  }
}

function fallbackCoverDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect width="200" height="200" fill="#e0e0e0"/>
    <g transform="translate(52,52) scale(4)">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#a3a3a3"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildSvg({ width, height, backgroundColor, borderRadius, barColor, albumArt, artistName, trackName, trackUrl, isPlaying }) {
  const coverSize = 100;
  const barsHtml = generateBars(60);
  const bgColor = toCssColor(backgroundColor);

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-labelledby="cardTitle" role="img">
      <title id="cardTitle">Now playing on Last.fm</title>
      <foreignObject width="${width}" height="${height}">
        <style>
          * { box-sizing: border-box; }

          .container {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
            display: flex;
            align-items: center;
            width: ${width}px;
            height: ${height}px;
            background-color: ${bgColor};
            border-radius: ${borderRadius}px;
            padding: 14px;
          }

          .cover-link {
            flex-shrink: 0;
            display: block;
            line-height: 0;
          }

          .cover {
            width: ${coverSize}px;
            height: ${coverSize}px;
            object-fit: cover;
            margin-right: 20px;
          }

          .text-container {
            min-width: 0;
            flex: 1;
            overflow: hidden;
          }

          .artist {
            color: #6a6a6a;
            font-weight: 700;
            font-size: 20px;
            line-height: 1.3;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
          }

          .song-container {
            display: flex;
            white-space: nowrap;
            width: max-content;
            margin-bottom: 18px;
          }

          .song-container.animate {
            animation: marquee 9s linear infinite;
          }

          .song {
            color: #6a6a6a;
            font-size: 17px;
            flex: 0 0 auto;
            padding-right: 48px;
          }

          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-33.3333%); }
          }

          #bars {
            display: flex;
            align-items: flex-end;
            height: 22px;
            width: 100%;
            overflow: hidden;
            gap: 3px;
          }

          .bar {
            width: 4px;
            border-radius: 2px;
            background-color: ${toCssColor(barColor)};
            animation: sound 1.1s ease-in-out infinite alternate;
            animation-play-state: ${isPlaying ? 'running' : 'paused'};
          }

          @keyframes sound {
            0%   { height: 4px; }
            100% { height: 22px; }
          }
        </style>

        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <a href="${trackUrl}" target="_blank" class="cover-link">
            <img src="${albumArt}" width="${coverSize}" height="${coverSize}" class="cover" />
          </a>

          <div class="text-container">
            <div class="artist">${artistName}</div>

            <div class="song-container animate">
              <div class="song">${trackName}</div>
              <div class="song" aria-hidden="true">${trackName}</div>
              <div class="song" aria-hidden="true">${trackName}</div>
            </div>

            ${isPlaying ? `<div id="bars">${barsHtml}</div>` : ''}
          </div>
        </div>
      </foreignObject>
    </svg>
  `;
}

// Generates N bars with slightly randomized delay/duration for a more
// natural-looking equalizer effect, instead of a fixed set of bars.
function generateBars(count) {
  let bars = '';
  for (let i = 0; i < count; i++) {
    const delay = (Math.random() * -1.2).toFixed(2);
    const duration = (0.8 + Math.random() * 0.6).toFixed(2);
    bars += `<div class="bar" style="animation-delay:${delay}s; animation-duration:${duration}s;"></div>`;
  }
  return bars;
}

function sendErrorSvg(res, message, backgroundColor, borderRadius) {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(`
    <svg width="340" height="100" viewBox="0 0 340 100" xmlns="http://www.w3.org/2000/svg">
      <foreignObject width="340" height="100">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          width: 340px; height: 100px; background-color: ${toCssColor(backgroundColor)};
          border-radius: ${borderRadius}px; display: flex; align-items: center;
          justify-content: center; color: #ff5555; font-size: 14px; box-sizing: border-box;">
          ${message}
        </div>
      </foreignObject>
    </svg>
  `);
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}
