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
          .cover { rx: 8px; }
          
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          
          .bar {
            display: inline-block;
            width: 3px;
            margin-right: 2px;
            background-color: ${isPlaying ? '#1db954' : '#121212'};
            border-radius: 1.5px;
            animation: sound 1.2s infinite ease-in-out;
          }
          
          .bar:nth-child(2)  { animation-delay: -0.2s; }
          .bar:nth-child(3)  { animation-delay: -0.7s; }
          .bar:nth-child(4)  { animation-delay: -0.4s; }
          .bar:nth-child(5)  { animation-delay: -0.9s; }
          .bar:nth-child(6)  { animation-delay: -0.1s; }
          .bar:nth-child(7)  { animation-delay: -0.6s; }
          .bar:nth-child(8)  { animation-delay: -0.3s; }
          .bar:nth-child(9)  { animation-delay: -0.8s; }
          .bar:nth-child(10) { animation-delay: -0.5s; }
          .bar:nth-child(11) { animation-delay: -1.0s; }
          .bar:nth-child(12) { animation-delay: -0.3s; }
          .bar:nth-child(13) { animation-delay: -0.7s; }
          .bar:nth-child(14) { animation-delay: -0.2s; }
          .bar:nth-child(15) { animation-delay: -0.6s; }
          .bar:nth-child(16) { animation-delay: -0.4s; }
          .bar:nth-child(17) { animation-delay: -0.9s; }
          .bar:nth-child(18) { animation-delay: -0.5s; }
          .bar:nth-child(19) { animation-delay: -0.1s; }
          .bar:nth-child(20) { animation-delay: -0.8s; }

          @keyframes sound {
            0%, 100% { height: 4px; }
            50% { height: 14px; }
          }
        </style>

        <image href="${albumArt}" x="12" y="12" width="106" height="106" class="cover" preserveAspectRatio="xMidYMid slice" />

        <foreignObject x="130" y="15" width="355" height="105">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; position: relative; height: 100%;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; font-weight: 500; font-size: 16px; text-align: center; margin-bottom: 3px; color: #121212;">${escapeXml(artistName.toUpperCase())}</div>
            
            <div style="overflow: hidden; width: 100%; white-space: nowrap; margin-bottom: 28px;">
              <div style="display: inline-block; white-space: nowrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; font-size: 15px; color: #121212; animation: marquee 8s linear infinite; padding-right: 40px;">
                <span>${escapeXml(trackName)}</span><span style="display:inline-block; width: 40px;"></span><span>${escapeXml(trackName)}</span>
              </div>
            </div>

            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; position: absolute; height: 14px; width: 350px; overflow: hidden; bottom: 10px; left: 0px; white-space: nowrap;">
              <div class="bar" style="height: 14px;"></div>
              <div class="bar" style="height: 8px;"></div>
              <div class="bar" style="height: 12px;"></div>
              <div class="bar" style="height: 6px;"></div>
              <div class="bar" style="height: 14px;"></div>
              <div class="bar" style="height: 10px;"></div>
              <div class="bar" style="height: 4px;"></div>
              <div class="bar" style="height: 12px;"></div>
              <div class="bar" style="height: 14px;"></div>
              <div class="bar" style="height: 8px;"></div>
              <div class="bar" style="height: 10px;"></div>
              <div class="bar" style="height: 14px;"></div>
              <div class="bar" style="height: 6px;"></div>
              <div class="bar" style="height: 12px;"></div>
              <div class="bar" style="height: 9px;"></div>
              <div class="bar" style="height: 14px;"></div>
              <div class="bar" style="height: 5px;"></div>
              <div class="bar" style="height: 11px;"></div>
              <div class="bar" style="height: 13px;"></div>
              <div class="bar" style="height: 7px;"></div>
            </div>
          </div>
        </foreignObject>
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
