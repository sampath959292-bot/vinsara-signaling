const http = require('http');
const WebSocket = require('ws');

// 1. Create a basic HTTP server (Render requires an HTTP listener to assign a port)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Vinsara Signaling Server is active and running!\n');
});

// 2. Attach the WebSocket server to the HTTP server
const wss = new WebSocket.Server({ server });
const peers = new Map(); // Station ID -> WebSocket

// Use Render's dynamic port or default to 8080 locally
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`Vinsara Signaling Server running on port ${PORT}`);
});

wss.on('connection', (ws) => {
  let registeredId = null;

  ws.on('message', (rawMessage) => {
    let data;
    try {
      data = JSON.parse(rawMessage);
    } catch (e) {
      return;
    }

    if (data.type === 'register') {
      registeredId = data.stationId;
      peers.set(registeredId, ws);
      console.log(`[+] Station Registered: ${registeredId}`);
      ws.send(JSON.stringify({ type: 'registered', stationId: registeredId }));
      return;
    }

    const targetWs = peers.get(data.targetId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      data.senderId = registeredId;
      targetWs.send(JSON.stringify(data));
    } else if (data.targetId) {
      ws.send(JSON.stringify({
        type: 'peer-not-found',
        targetId: data.targetId
      }));
    }
  });

  ws.on('close', () => {
    if (registeredId) {
      peers.delete(registeredId);
      console.log(`[-] Station Disconnected: ${registeredId}`);
    }
  });
});