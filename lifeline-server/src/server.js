import "dotenv/config";

import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import { createLifelineAgent } from "./agent.js";

const app = express();
const server = createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send(
    JSON.stringify({
      type: "CONNECTED",
    }),
  );

  ws.on("message", async (message) => {
    console.log("messageggg");

    const data = JSON.parse(message.toString());

    console.log(data);

    if (data.type === "START_INCIDENT") {
      const latitude = 6.4429 + Math.random() * (6.4682 - 6.4429);

      const longitude = 3.3849 + Math.random() * (3.3972 - 3.3849);

      const triggerTime = new Date().toISOString();

      const message = `
EMERGENCY REPORT

Situation:
${data.emergency}

Victim name:
Patrick Jane

Victim location:
15 Marina Road, Lagos Island

Latitude:
${latitude}

Longitude:
${longitude}

Trigger time:
${triggerTime}

Use the emergency information above to coordinate the response.
Do not ask the user for more emergency details unless information
required by a tool is genuinely missing.

You are to call every body in the contact regardless of whether
the call was picked or not.

Begin by calling get_closest_contacts using the supplied latitude
and longitude.
`;

      const lifelineAgent = createLifelineAgent(ws);

      const result = await lifelineAgent.invoke(message, {
        invocationState: {
          calledIndividualsCount: 0,
          pickedUp: [],
          declined: [],
          failed: [],
          totalCallDurationMs: 0,
        },
      });

      const state = result.invocationState;

      const summary = {
        totalPeopleCalled: state.calledIndividualsCount ?? 0,
        pickedUp: state.pickedUp ?? [],
        declined: state.declined ?? [],
        failed: state.failed ?? [],
        totalCallDurationMs: state.totalCallDurationMs ?? 0,
      };

      console.log("Operation complete:");
      console.log(summary);

      ws.send(
        JSON.stringify({
          type: "OPERATION_COMPLETE",
          summary,
        }),
      );
    }
  });
});

server.listen(4000, () => {
  console.log("WebSocket server running on :4000");
});
