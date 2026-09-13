import { tool } from "@strands-agents/sdk";
import { getElevenLabsSignedUrl } from "../utils/getElevenLabsSignedUrl.js";

export const createMakeCallTool = (ws) =>
  tool({
    name: "make_call",

    description:
      "Calls a selected emergency responder using Lifeline's voice agent. Waits for the call to finish. Returns the call outcome.",

    inputSchema: {
      type: "object",

      properties: {
        emergency_context: {
          type: "string",
          description: "Description of the emergency.",
        },

        victim_name: {
          type: "string",
          description: "Name of the victim.",
        },

        line_name: {
          type: "string",
          description: "Name of the responder or emergency line being called.",
        },

        victim_location: {
          type: "string",
          description: "Location of the victim.",
        },

        responder_distance_km: {
          type: "number",
          description:
            "Distance between the responder and victim in kilometers.",
        },

        trigger_time: {
          type: "string",
          description:
            "The time when the emergency was triggered. Use an ISO 8601 timestamp.",
        },

        victim_relationship: {
          type: "string",
          description: "Relationship between the victim and responder, if any.",
        },
      },

      required: [
        "emergency_context",
        "victim_name",
        "line_name",
        "victim_location",
        "responder_distance_km",
        "trigger_time",
        "victim_relationship",
      ],
    },

    callback: async (data, context) => {
      try {
        const triggerTime = new Date(data.trigger_time);
        const now = new Date();

        if (Number.isNaN(triggerTime.getTime())) {
          throw new Error("Invalid trigger_time.");
        }

        const differenceMs = Math.max(0, now.getTime() - triggerTime.getTime());

        const differenceMinutes = Math.floor(differenceMs / 60000);

        let timeDifferential;

        if (differenceMinutes < 1) {
          timeDifferential = "just now";
        } else if (differenceMinutes === 1) {
          timeDifferential = "1 minute ago";
        } else {
          timeDifferential = `${differenceMinutes} minutes ago`;
        }

        const calledIndividualsCount =
          context.invocationState.calledIndividualsCount ?? 0;

        const callData = {
          emergency_context: data.emergency_context,
          victim_name: data.victim_name,
          line_name: data.line_name,
          victim_location: data.victim_location,
          responder_distance_km: data.responder_distance_km,
          time_differential: timeDifferential,
          victim_relationship: data.victim_relationship,
          called_individuals_count: calledIndividualsCount,
        };

        const signedUrl = await getElevenLabsSignedUrl();

        const callStartedAt = Date.now();

        ws.send(
          JSON.stringify({
            type: "START_CALL",
            session: signedUrl,
            data: callData,
          }),
        );

        context.invocationState.calledIndividualsCount =
          calledIndividualsCount + 1;

        return await new Promise((resolve) => {
          const handleMessage = (message) => {
            try {
              const response = JSON.parse(message.toString());

              if (response.type === "CALL_ENDED") {
                ws.off("message", handleMessage);

                const durationMs = Date.now() - callStartedAt;

                context.invocationState.totalCallDurationMs =
                  (context.invocationState.totalCallDurationMs ?? 0) +
                  durationMs;

                context.invocationState.pickedUp =
                  context.invocationState.pickedUp ?? [];

                context.invocationState.pickedUp.push({
                  name: data.line_name,
                  durationMs,
                });

                resolve({
                  success: true,
                  responder: data.line_name,
                  status: "completed",
                  durationMs,
                });

                return;
              }

              if (response.type === "CALL_DECLINED") {
                ws.off("message", handleMessage);

                const durationMs = Date.now() - callStartedAt;

                context.invocationState.totalCallDurationMs =
                  (context.invocationState.totalCallDurationMs ?? 0) +
                  durationMs;

                context.invocationState.declined =
                  context.invocationState.declined ?? [];

                context.invocationState.declined.push({
                  name: data.line_name,
                  durationMs,
                });

                resolve({
                  success: false,
                  responder: data.line_name,
                  status: "declined",
                  durationMs,
                });

                return;
              }
            } catch (error) {
              console.error("Invalid WebSocket message:", error);
            }
          };

          ws.on("message", handleMessage);
        });
      } catch (error) {
        console.error("Error initiating call:", error);

        context.invocationState.failed = context.invocationState.failed ?? [];

        context.invocationState.failed.push({
          name: data.line_name,
        });

        return {
          success: false,
          responder: data.line_name,
          status: "failed",
        };
      }
    },
  });
