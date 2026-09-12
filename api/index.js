export default async function handler(req, res) {
  const username = req.query.username || process.env.LASTFM_USERNAME;
  const apiKey = req.query.api_key || process.env.LASTFM_API_KEY;

  if (!username || !apiKey) {
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(`
      <svg width="500" height="130" viewBox="0 0 500 130" xmlns="http://www.w3.org/2000/svg">
        <text x="250" y="65" fill="#ff5555" font-family="sans-serif" font-size="14" text-anchor="middle">Parametri mancanti</text>
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

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

    res.status(200).send(`
      <svg width="500" height="130" viewBox="0 0 500 130" xmlns="http://www.w3.org/2000/svg">
        <style>
          .artist { fill: #121212; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; font-weight: 700; text-anchor: middle; }
          .track { fill: #121212; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; font-weight: 800; }
          .cover { rx: 8px; }
          
          .marquee {
            animation: scroll 8s linear infinite;
          }
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          .eq-bar { fill: ${isPlaying ? '#1db954' : '#121212'}; width: 3px; rx: 1.5px; animation: sound 1.2s infinite ease-in-out; }
          .eq-bar:nth-child(2) { animation-delay: -0.4s; }
          .eq-bar:nth-child(3) { animation-delay: -0.8s; }
          .eq-bar:nth-child(4) { animation-delay: -0.2s; }
          .eq-bar:nth-child(5) { animation-delay: -0.6s; }
          .eq-bar:nth-child(6) { animation-delay: -1.0s; }
          .eq-bar:nth-child(7) { animation-delay: -0.3s; }
          .eq-bar:nth-child(8) { animation-delay: -0.7s; }
          
          @keyframes sound {
            0%, 100% { height: 4px; y: 98px; }
            50% { height: 18px; y: 84px; }
          }
        </style>
        
        <image href="${albumArt}" x="12" y="12" width="106" height="106" class="cover" preserveAspectRatio="xMidYMid slice" />
        
        <text x="305" y="32" class="artist">${escapeXml(artistName.toUpperCase())}</text>
        
        <svg x="135" y="50" width="345" height="30">
          <clipPath id="text-clip">
            <rect width="345" height="30" rx="4" />
          </clipPath>
          <g clip-path="url(#text-clip)">
            <text x="0" y="22" class="track">
              <tspan class="marquee">${escapeXml(trackName)}&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;${escapeXml(trackName)}</tspan>
            </text>
          </g>
        </svg>
        
        <g transform="translate(135, 0)">
          <rect x="0" y="98" class="eq-bar" />
          <rect x="6" y="98" class="eq-bar" />
          <rect x="12" y="98" class="eq-bar" />
          <rect x="18" y="98" class="eq-bar" />
          <rect x="24" y="98" class="eq-bar" />
          <rect x="30" y="98" class="eq-bar" />
          <rect x="36" y="98" class="eq-bar" />
          <rect x="42" y="98" class="eq-bar" />
        </g>
        
        <text x="480" y="112" fill="${isPlaying ? '#1db954' : '#888'}" font-family="sans-serif" font-size="9" text-anchor="end">${isPlaying ? '● LIVE' : '○ RECENT'}</text>
      </svg>
    `);
  } catch (err) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(`
      <svg width="500" height="130" viewBox="0 0 500 130" xmlns="http://www.w3.org/2000/svg">
        <text x="250" y="65" fill="#121212" font-family="sans-serif" font-size="13" text-anchor="middle">Nessuna traccia</text>
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
