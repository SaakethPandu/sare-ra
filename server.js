const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let bullets = [];

wss.on("connection", (ws) => {
  const playerId = Date.now();
  players[playerId] = { x: 100, y: 100, color: getRandomColor(), health: 100, alive: true };

  ws.send(JSON.stringify({ type: "init", id: playerId, players, bullets }));
  broadcast({ type: "update", players, bullets });

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (!players[playerId]?.alive) return; // Dead players can’t move/shoot

    if (data.type === "move") {
      players[playerId].x = data.x;
      players[playerId].y = data.y;
    }

    if (data.type === "shoot") {
      bullets.push({
        x: data.x,
        y: data.y,
        dx: data.dx,
        dy: data.dy,
        owner: playerId
      });
    }

    broadcast({ type: "update", players, bullets });
  });

  ws.on("close", () => {
    delete players[playerId];
    broadcast({ type: "update", players, bullets });
  });
});

function broadcast(data) {
  const json = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

// Bullet movement and damage check
setInterval(() => {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;

    for (let id in players) {
      if (id != bullet.owner && players[id].alive) {
        let p = players[id];
        if (bullet.x > p.x && bullet.x < p.x + 50 && bullet.y > p.y && bullet.y < p.y + 50) {
          p.health -= 10;
          if (p.health <= 0) {
            p.health = 0;
            p.alive = false;
          }
          bullets.splice(index, 1);
          break;
        }
      }
    }

    if (bullet.x < 0 || bullet.y < 0 || bullet.x > 2000 || bullet.y > 2000) {
      bullets.splice(index, 1);
    }
  });

  broadcast({ type: "update", players, bullets });
}, 30);

console.log("Server running on ws://localhost:8080");
