export default async function handler(req, res) {
  const username = req.query.username || process.env.LASTFM_USERNAME;
  const apiKey = req.query.api_key || process.env.LASTFM_API_KEY;

  if (!username || !apiKey) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(`
      <svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
        <rect width="480" height="120" fill="#121212" rx="12" />
        <text x="240" y="65" fill="#ff5555" font-family="sans-serif" font-size="14" text-anchor="middle" font-weight="bold">Errore: Username o API Key mancanti</text>
      </svg>
    `);
  }

  try {
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`);
    const data = await response.json();
    
    if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
      throw new Error("Nessuna traccia trovata");
    }

    const track = data.recenttracks.track[0];
    const trackName = track.name || "Sconosciuto";
    const artistName = track.artist['#text'] || "Artista sconosciuto";
    const albumArt = (track.image && track.image[2] && track.image[2]['#text']) || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80";
    
    const isPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';

    const safeTrack = trackName.length > 27 ? trackName.substring(0, 24) + '...' : trackName;
    const safeArtist = artistName.length > 32 ? artistName.substring(0, 29) + '...' : artistName;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    res.status(200).send(`
      <svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #121212; rx: 14px; }
          .title { fill: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; font-weight: 700; }
          .artist { fill: #9fadbd; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: 400; }
          .status { fill: ${isPlaying ? '#1db954' : '#6c757d'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10px; font-weight: 800; letter-spacing: 0.8px; }
          .cover { rx: 8px; }
          
          /* Animazione barre equalizzatore */
          .bar { fill: #1db954; width: 3px; rx: 1.5px; animation: bounce 1.2s infinite ease-in-out; }
          .bar:nth-child(2) { animation-delay: -0.4s; }
          .bar:nth-child(3) { animation-delay: -0.8s; }
          .bar:nth-child(4) { animation-delay: -0.2s; }
          @keyframes bounce {
            0%, 100% { height: 6px; y: 77px; }
            50% { height: 22px; y: 61px; }
          }
        </style>
        
        <!-- Sfondo con bordo sottile tech -->
        <rect width="480" height="120" class="bg" stroke="#2a2a2a" stroke-width="1" />
        
        <!-- Copertina Album -->
        <image href="${albumArt}" x="15" y="15" width="90" height="90" class="cover" preserveAspectRatio="xMidYMid slice" />
        
        <!-- Stato e Testi -->
        <text x="125" y="34" class="status">${isPlaying ? '▶ STASERA GIRA' : '⏱ ULTIMO ASCOLTO'}</text>
        <text x="125" y="62" class="title">${escapeXml(safeTrack)}</text>
        <text x="125" y="85" class="artist">${escapeXml(safeArtist)}</text>
        
        <!-- Equalizzatore animato (visibile solo se sta riproducendo ora) -->
        ${isPlaying ? `
          <g transform="translate(425, 0)">
            <rect x="0" y="77" class="bar" />
            <rect x="6" y="77" class="bar" />
            <rect x="12" y="77" class="bar" />
            <rect x="18" y="77" class="bar" />
          </g>
        ` : ''}
        
        <!-- Brand -->
        <text x="465" y="105" fill="#555" font-family="sans-serif" font-size="9" text-anchor="end">last.fm</text>
      </svg>
    `);
  } catch (err) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(`
      <svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
        <rect width="480" height="120" fill="#121212" rx="14" stroke="#2a2a2a" stroke-width="1" />
        <text x="240" y="65" fill="#9fadbd" font-family="sans-serif" font-size="13" text-anchor="middle">Nessun brano recente trovato</text>
      </svg>
    `);
  }
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
