const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '../server-data');

function createServer() {
  if (!fs.existsSync(SERVER_DIR)) fs.mkdirSync(SERVER_DIR);

  return new Promise((resolve) => {
    exec(`
      docker run -d --name minecraft-server \
      -v ${SERVER_DIR}:/data \
      -e EULA=TRUE -p 25565:25565 \
      itzg/minecraft-server
    `, (err, stdout, stderr) => {
      if (err) console.error(err);
      resolve();
    });
  });
}

function sendCommand(cmd) {
  return new Promise((resolve) => {
    exec(`docker exec minecraft-server rcon-cli ${cmd}`, (err, stdout, stderr) => {
      if (err) console.error(err);
      resolve();
    });
  });
}

module.exports = { createServer, sendCommand };
