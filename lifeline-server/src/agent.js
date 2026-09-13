import {
  Agent,
  BeforeToolCallEvent,
  AfterToolCallEvent,
  BeforeInvocationEvent,
} from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { getClosestContacts } from "./tools/contact.js";
import { createMakeCallTool } from "./tools/call.js";

const model = new OpenAIModel({
  api: "chat",
  apiKey: process.env.GROQ_API_KEY,
  modelId: "openai/gpt-oss-120b",

  clientConfig: {
    baseURL: "https://api.groq.com/openai/v1",
  },

  temperature: 1,
  maxTokens: 2048,
});

export function createLifelineAgent(ws) {
  const makeCall = createMakeCallTool(ws);

  const sendStatus = (status, message) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "AGENT_STATUS",
          status,
          message,
        }),
      );
    }
  };

  const agent = new Agent({
    model,

    systemPrompt: `
You are Lifeline, an emergency response coordination agent.

Your job is to analyze emergency reports and coordinate
the emergency response.

Never invent information.

When an emergency report is received:

1. Understand the emergency and identify the important information.
2. Identify the emergency location.
3. Use get_closest_contacts with the supplied latitude and longitude.
4. Review the returned contacts.
5. Contact every returned contact, one at a time, using make_call.
6. Wait for each make_call to finish before contacting the next person.
7. Record whether each contact picked up, declined, or the call failed.
8. Continue until every returned contact has been contacted.

Important:
- Do not call multiple responders simultaneously.
- Only make one call at a time.
- Always wait for make_call to return before starting another call.
- Do not stop after the first successful call.
- Contact every person returned by get_closest_contacts.
- Do not invent contact information or emergency details.
- Do not claim that someone accepted the emergency unless make_call returns success: true.
- Prioritize emergency services when professional assistance is appropriate.
- Consider distance when determining the order in which contacts should be called.
`,

    tools: [getClosestContacts, makeCall],
  });

  agent.addHook(BeforeInvocationEvent, () => {
    sendStatus("ANALYZING_EMERGENCY", "Analyzing the emergency report...");
  });

  agent.addHook(BeforeToolCallEvent, (event) => {
    const toolName = event.toolUse.name;

    if (toolName === "get_closest_contacts") {
      sendStatus(
        "FINDING_RESPONDERS",
        "Finding emergency responders near the reported location...",
      );
    }

    if (toolName === "make_call") {
      sendStatus(
        "CONTACTING_RESPONDER",
        "Contacting the selected emergency responder...",
      );
    }
  });

  agent.addHook(AfterToolCallEvent, (event) => {
    const toolName = event.toolUse.name;

    if (toolName === "get_closest_contacts") {
      sendStatus(
        "RESPONDERS_FOUND",
        "Nearby contacts identified. Beginning emergency calls...",
      );
    }

    if (toolName === "make_call") {
      sendStatus(
        "CALL_COMPLETED",
        "Responder call completed. Continuing to the next contact...",
      );
    }
  });

  return agent;
}
