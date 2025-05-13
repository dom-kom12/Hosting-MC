require('dotenv').config();
const fs = require('fs');
const fetch = require('node-fetch');

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1369048677657608282/XglAIq5EStYy9_wIjz61475_jAAi1qJHf9wZBoTN_gkBuRuu2uZX8swzwxxK3C9ljpJz'; // Zamień na swój URL webhooka
const LOG_FILE = 'C:/Users/domru/Desktop/NebulaHostMC/serwery/dom_kom/logs/latest.log';
let lastSize = 0;

function sendToDiscord(message) {
  const payload = {
    content: message,
  };

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(err => console.error('Błąd wysyłania do webhooka:', err));
}

function extractPlayer(logLine) {
  const match = logLine.match(/\]:\s(.*?)(\sjoined|\sleft)/);
  return match ? match[1] : 'Nieznany';
}

function processLogs() {
  fs.stat(LOG_FILE, (err, stats) => {
    if (err) return console.error(err);

    if (stats.size > lastSize) {
      const stream = fs.createReadStream(LOG_FILE, {
        start: lastSize,
        end: stats.size,
      });

      let buffer = '';
      stream.on('data', chunk => {
        buffer += chunk.toString();
      });

      stream.on('end', () => {
        const lines = buffer.split('\n');
        lines.forEach(line => {
          if (line.includes('joined the game')) {
            sendToDiscord(`✅ **${extractPlayer(line)}** dołączył do gry`);
          } else if (line.includes('left the game')) {
            sendToDiscord(`❌ **${extractPlayer(line)}** opuścił grę`);
          } else if (line.includes('<')) {
            sendToDiscord(`💬 ${line}`);
          }
        });
      });

      lastSize = stats.size;
    }
  });
}

// Sprawdzanie logów co 1 sekundę
setInterval(processLogs, 1000);
