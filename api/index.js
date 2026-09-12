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
          
          /* Marquee SVG nativo pulito */
          .marquee-group {
            animation: marquee 10s linear infinite;
          }
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          
          /* Equalizzatore esteso su tutta la larghezza */
          .eq-bar { fill: ${isPlaying ? '#1db954' : '#121212'}; width: 3px; rx: 1.5px; animation: sound 1.2s infinite ease-in-out; }
          .eq-bar:nth-child(2)  { animation-delay: -0.2s; }
          .eq-bar:nth-child(3)  { animation-delay: -0.7s; }
          .eq-bar:nth-child(4)  { animation-delay: -0.4s; }
          .eq-bar:nth-child(5)  { animation-delay: -0.9s; }
          .eq-bar:nth-child(6)  { animation-delay: -0.1s; }
          .eq-bar:nth-child(7)  { animation-delay: -0.6s; }
          .eq-bar:nth-child(8)  { animation-delay: -0.3s; }
          .eq-bar:nth-child(9)  { animation-delay: -0.8s; }
          .eq-bar:nth-child(10) { animation-delay: -0.5s; }
          .eq-bar:nth-child(11) { animation-delay: -1.0s; }
          .eq-bar:nth-child(12) { animation-delay: -0.3s; }
          .eq-bar:nth-child(13) { animation-delay: -0.7s; }
          .eq-bar:nth-child(14) { animation-delay: -0.2s; }
          .eq-bar:nth-child(15) { animation-delay: -0.6s; }
          .eq-bar:nth-child(16) { animation-delay: -0.4s; }
          .eq-bar:nth-child(17) { animation-delay: -0.9s; }
          
          @keyframes sound {
            0%, 100% { height: 4px; y: 104px; }
            50% { height: 18px; y: 90px; }
          }
        </style>
        
        <!-- Sfondo trasparente -->
        
        <!-- Copertina Album a sinistra -->
        <image href="${albumArt}" x="12" y="12" width="106" height="106" class="cover" preserveAspectRatio="xMidYMid slice" />
        
        <!-- PRIMA RIGA: Nome band al centro (x=305) -->
        <text x="305" y="32" class="artist">${escapeXml(artistName.toUpperCase())}</text>
        
        <!-- SECONDA RIGA: Nome brano che scorre con ClipPath SVG puro -->
        <svg x="132" y="46" width="355" height="30" overflow="hidden">
          <g class="marquee-group">
            <text x="0" y="20" class="track">${escapeXml(trackName)}&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;${escapeXml(trackName)}</text>
          </g>
        </svg>
        
        <!-- TERZA RIGA: Equalizzatore esteso su tutta la larghezza -->
        <g transform="translate(132, 0)">
          <rect x="0"   y="104" class="eq-bar" />
          <rect x="21"  y="104" class="eq-bar" />
          <rect x="42"  y="104" class="eq-bar" />
          <rect x="63"  y="104" class="eq-bar" />
          <rect x="84"  y="104" class="eq-bar" />
          <rect x="105" y="104" class="eq-bar" />
          <rect x="126" y="104" class="eq-bar" />
          <rect x="147" y="104" class="eq-bar" />
          <rect x="168" y="104" class="eq-bar" />
          <rect x="189" y="104" class="eq-bar" />
          <rect x="210" y="104" class="eq-bar" />
          <rect x="231" y="104" class="eq-bar" />
          <rect x="252" y="104" class="eq-bar" />
          <rect x="273" y="104" class="eq-bar" />
          <rect x="294" y="104" class="eq-bar" />
          <rect x="315" y="104" class="eq-bar" />
          <rect x="336" y="104" class="eq-bar" />
        </g>
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
