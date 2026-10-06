import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export type MatchCandidate = {
  id: string;
  name: string;
  headline: string | null;
  role: string | null;
  country: string | null;
  skills: string[];
};

const resultSchema = z.object({
  recommendations: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
      score: z.number(),
    }),
  ),
});

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function rankPeople(interests: string, candidates: MatchCandidate[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new GatewayError(401, "AI is not configured for this app.");

  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const result = streamText({
    model: provider.responses(MODEL),
    instructions:
      "You match professionals on a career network. Given a member's career interests and a list of candidate profiles, pick up to 6 people most worth connecting with. Only use ids from the list. For each give a one-sentence reason addressed to the member (e.g. 'Works in fintech product design, the field you want to move into.') and a score 0-100. Return fewer if few are relevant.",
    messages: [
      {
        role: "user",
        content: `My career interests:\n${interests}\n\nCandidates:\n${JSON.stringify(candidates)}`,
      },
    ],
    output: Output.object({ schema: resultSchema }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  try {
    const output = await result.output;
    const known = new Set(candidates.map((c) => c.id));
    return output.recommendations
      .filter((r) => known.has(r.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    const body = (error as { responseBody?: string }).responseBody;
    console.error("People match failed", status, body ?? error);
    if (status === 402) throw new GatewayError(402, "AI credits have run out. Please try again later.");
    if (status === 429) throw new GatewayError(429, "Too many requests right now. Please wait a moment and try again.");
    throw new GatewayError(status, "Could not get recommendations right now.");
  }
}
