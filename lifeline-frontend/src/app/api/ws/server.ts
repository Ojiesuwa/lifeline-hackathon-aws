import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  handle(req, res);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/api/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
});

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  ws.send(
    JSON.stringify({
      type: "CONNECTED",
      message: "Lifeline connected",
    }),
  );

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());

    console.log("Received:", data);

    ws.send(
      JSON.stringify({
        type: "RESPONSE",
        data,
      }),
    );
  });

  ws.on("close", () => {
    console.log("WebSocket disconnected");
  });
});

server.listen(3000, () => {
  console.log("http://localhost:3000");
});
