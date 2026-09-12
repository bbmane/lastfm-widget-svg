export default async function handler(req, res) {
  const username = req.query.username || process.env.LASTFM_USERNAME;
  const apiKey = req.query.api_key || process.env.LASTFM_API_KEY;

  if (!username || !apiKey) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(`
      <svg width="540" height="130" viewBox="0 0 540 130" xmlns="http://www.w3.org/2000/svg">
        <rect width="540" height="130" fill="#181818" rx="12" />
        <text x="270" y="65" fill="#ff5555" font-family="sans-serif" font-size="14" text-anchor="middle" font-weight="bold">Parametri mancanti</text>
      </svg>
    `);
  }

  try {
    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`);
    const data = await response.json();
    
    if (!data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
      throw new Error("Nessuna traccia");
    }

    const track = data.recenttracks.track[0];
    const trackName = track.name || "Sconosciuto";
    const artistName = track.artist['#text'] || "Artista sconosciuto";
    const albumArt = (track.image && track.image[2] && track.image[2]['#text']) || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80";
    
    const isPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';

    const safeTrack = trackName.length > 32 ? trackName.substring(0, 29) + '...' : trackName;
    const safeArtist = artistName.length > 35 ? artistName.substring(0, 32) + '...' : artistName;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    res.status(200).send(`
      <svg width="540" height="130" viewBox="0 0 540 130" xmlns="http://www.w3.org/2000/svg">
        <style>
          .bg { fill: #181818; rx: 10px; }
          .title { fill: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; font-weight: 700; }
          .artist { fill: #9fadbd; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: 400; }
          .status { fill: ${isPlaying ? '#1db954' : '#777'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
          .cover { rx: 6px; }
          
          /* Equalizzatore stile Kittinanx */
          .eq-bar { fill: ${isPlaying ? '#1db954' : '#555'}; width: 3px; rx: 1.5px; animation: sound 1.2s infinite ease-in-out; }
          .eq-bar:nth-child(1) { animation-delay: -1.2s; }
          .eq-bar:nth-child(2) { animation-delay: -0.3s; }
          .eq-bar:nth-child(3) { animation-delay: -0.6s; }
          .eq-bar:nth-child(4) { animation-delay: -0.9s; }
          .eq-bar:nth-child(5) { animation-delay: -0.4s; }
          .eq-bar:nth-child(6) { animation-delay: -0.8s; }
          .eq-bar:nth-child(7) { animation-delay: -0.2s; }
          .eq-bar:nth-child(8) { animation-delay: -1.0s; }
          .eq-bar:nth-child(9) { animation-delay: -0.5s; }
          .eq-bar:nth-child(10) { animation-delay: -0.7s; }
          .eq-bar:nth-child(11) { animation-delay: -0.1s; }
          .eq-bar:nth-child(12) { animation-delay: -0.5s; }
          .eq-bar:nth-child(13) { animation-delay: -0.9s; }
          .eq-bar:nth-child(14) { animation-delay: -0.3s; }
          .eq-bar:nth-child(15) { animation-delay: -0.7s; }
          
          @keyframes sound {
            0% { height: 4px; y: 100px; }
            50% { height: 22px; y: 82px; }
            100% { height: 4px; y: 100px; }
          }
        </style>
        
        <!-- Sfondo della card -->
        <rect width="540" height="130" class="bg" stroke="#282828" stroke-width="1" />
        
        <!-- Copertina Album quadrata a sinistra -->
        <image href="${albumArt}" x="16" y="16" width="98" height="98" class="cover" preserveAspectRatio="xMidYMid slice" />
        
        <!-- Testi posizionati con precisione geometrica -->
        <text x="134" y="38" class="status">${isPlaying ? '▶ LISTENING TO' : '⏱ LAST LISTEN'}</text>
        <text x="134" y="66" class="title">${escapeXml(safeTrack)}</text>
        <text x="134" y="90" class="artist">${escapeXml(safeArtist)}</text>
        
        <!-- Finta barra di progresso / Equalizzatore esteso in basso a destra -->
        <g transform="translate(134, 0)">
          <rect x="0" y="100" class="eq-bar" />
          <rect x="6" y="100" class="eq-bar" />
          <rect x="12" y="100" class="eq-bar" />
          <rect x="18" y="100" class="eq-bar" />
          <rect x="24" y="100" class="eq-bar" />
          <rect x="30" y="100" class="eq-bar" />
          <rect x="36" y="100" class="eq-bar" />
          <rect x="42" y="100" class="eq-bar" />
          <rect x="48" y="100" class="eq-bar" />
          <rect x="54" y="100" class="eq-bar" />
          <rect x="60" y="100" class="eq-bar" />
          <rect x="66" y="100" class="eq-bar" />
          <rect x="72" y="100" class="eq-bar" />
          <rect x="78" y="100" class="eq-bar" />
          <rect x="80" y="100" class="eq-bar" />
        </g>
        
        <!-- Logo Last.fm in piccolo -->
        <text x="520" y="112" fill="#555" font-family="sans-serif" font-size="9" text-anchor="end">last.fm</text>
      </svg>
    `);
  } catch (err) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(`
      <svg width="540" height="130" viewBox="0 0 540 130" xmlns="http://www.w3.org/2000/svg">
        <rect width="540" height="130" fill="#181818" rx="10" stroke="#282828" stroke-width="1" />
        <text x="270" y="70" fill="#888" font-family="sans-serif" font-size="13" text-anchor="middle">Nessuna traccia recente</text>
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
