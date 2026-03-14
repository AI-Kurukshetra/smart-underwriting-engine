import { calculateRealtimeScore } from "@/lib/scoring/realtime-engine";
import { UnderwritingApplication } from "@/lib/domain";
import { evaluateDecision } from "@/lib/workflows/decisioning";

export async function generateDecisionExplanation(application: UnderwritingApplication) {
  const score = calculateRealtimeScore(application);
  const decision = evaluateDecision(application, score);

  const fallback = {
    narrative: `${application.applicantName} is currently assessed as ${decision.status}. ${score.summary}`,
    highlights: score.reasonCodes,
    source: "rule-based" as const,
  };

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are an underwriting assistant. Explain deterministic lending decisions in concise, compliance-safe language.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({ application, score, decision, sources: score.sources }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "decision_explanation",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                narrative: { type: "string" },
                highlights: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["narrative", "highlights"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const statusLabel = response.status === 429 ? "rate limited" : `status ${response.status}`;
      console.warn(`[AI explanation] OpenAI ${statusLabel} — falling back to rule-based explanation`);
      return fallback;
    }

    const payload = await response.json();
    const content = payload.output?.[0]?.content?.[0]?.text;

    if (!content) {
      console.warn("[AI explanation] OpenAI response missing structured output — using fallback");
      return fallback;
    }

    const parsed = JSON.parse(content);

    return {
      narrative: parsed.narrative,
      highlights: parsed.highlights,
      source: "openai",
    };
  } catch {
    console.warn("[AI explanation] OpenAI unavailable — using rule-based fallback");
    return fallback;
  }
}
