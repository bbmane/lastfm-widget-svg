export default async function handler(req, res) {
  const username = req.query.username || process.env.LASTFM_USERNAME;
  const apiKey = req.query.api_key || process.env.LASTFM_API_KEY;

  // Parametri opzionali di personalizzazione, sullo stile di kittinan
  const backgroundColor = req.query.background_color || 'transparent';
  const borderRadius = req.query.border_radius || '12';
  const barColor = req.query.bar_color || 'B3B3B3'; // grigio, sempre lo stesso

  if (!username || !apiKey) {
    return sendErrorSvg(res, 'Parametri mancanti', backgroundColor, borderRadius);
  }

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`
    );
    const data = await response.json();

    if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
      throw new Error('Nessuna traccia');
    }

    const track = data.recenttracks.track[0];
    const trackName = escapeXml(track.name || 'Sconosciuto');
    const artistName = escapeXml(track.artist['#text'] || 'Artista sconosciuto');
    const trackUrl = track.url || '#';
    const albumArt =
      (track.image && track.image[2] && track.image[2]['#text']) ||
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80';

    const isPlaying = !!(track['@attr'] && track['@attr'].nowplaying === 'true');

    const width = 340;
    const height = 100;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    res.status(200).send(buildSvg({
      width,
      height,
      backgroundColor,
      borderRadius,
      barColor,
      albumArt,
      artistName,
      trackName,
      trackUrl,
      isPlaying,
    }));
  } catch (err) {
    sendErrorSvg(res, 'Nessuna traccia', backgroundColor, borderRadius);
  }
}

function toCssColor(value) {
  // Permette sia parole chiave css (transparent, white, ...) sia hex senza #
  return /^[0-9a-fA-F]{3,8}$/.test(value) ? `#${value}` : value;
}

function buildSvg({ width, height, backgroundColor, borderRadius, barColor, albumArt, artistName, trackName, trackUrl, isPlaying }) {
  const coverSize = 68;
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
            border-radius: 8px;
            object-fit: cover;
            margin-right: 14px;
          }

          .text-container {
            min-width: 0;
            flex: 1;
            overflow: hidden;
          }

          .artist {
            color: #6a6a6a;
            font-weight: 700;
            font-size: 15px;
            line-height: 1.2;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
          }

          .song-container {
            display: flex;
            white-space: nowrap;
            width: max-content;
            margin-bottom: 12px;
          }

          .song-container.animate {
            animation: marquee 9s linear infinite;
          }

          .song {
            color: #6a6a6a;
            font-size: 13px;
            flex: 0 0 auto;
            padding-right: 36px;
          }

          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-33.3333%); }
          }

          #bars {
            display: flex;
            align-items: flex-end;
            height: 14px;
            width: 100%;
            overflow: hidden;
            gap: 2px;
          }

          .bar {
            width: 3px;
            border-radius: 1.5px;
            background-color: ${toCssColor(barColor)};
            animation: sound 1.1s ease-in-out infinite alternate;
            animation-play-state: ${isPlaying ? 'running' : 'paused'};
          }

          @keyframes sound {
            0%   { height: 3px; }
            100% { height: 14px; }
          }
        </style>

        <div xmlns="http://www.w3.org/1999/xhtml" class="container">
          <a href="${trackUrl}" target="_blank" class="cover-link">
            <img src="${albumArt}" width="${coverSize}" height="${coverSize}" class="cover" />
          </a>

          <div class="text-container">
            <div class="artist">${artistName.toUpperCase()}</div>

            <div class="song-container animate">
              <div class="song">${trackName}</div>
              <div class="song" aria-hidden="true">${trackName}</div>
              <div class="song" aria-hidden="true">${trackName}</div>
            </div>

            <div id="bars">${barsHtml}</div>
          </div>
        </div>
      </foreignObject>
    </svg>
  `;
}

// Genera N barre con delay/durata leggermente randomizzati per un effetto
// equalizzatore naturale, invece delle 20 barre fisse dell'originale.
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
