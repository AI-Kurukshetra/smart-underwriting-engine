type ExtractionResult = {
  summary: string;
  extractedText: string;
  documentType: string;
  keyFacts: string[];
  confidence: "low" | "medium" | "high";
};

export async function extractDocumentWithOpenAI(input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<ExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      summary: "OpenAI API key is not configured, so extraction was skipped.",
      extractedText: "",
      documentType: "unknown",
      keyFacts: [],
      confidence: "low",
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You extract structured underwriting document information. Return concise JSON only.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract the document type, a concise summary, key underwriting facts, OCR text, and confidence. Be conservative if the document is unclear.",
            },
            {
              type: "input_file",
              filename: input.filename,
              file_data: input.buffer.toString("base64"),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "document_extraction",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              extractedText: { type: "string" },
              documentType: { type: "string" },
              keyFacts: {
                type: "array",
                items: { type: "string" },
              },
              confidence: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
            },
            required: ["summary", "extractedText", "documentType", "keyFacts", "confidence"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed with status ${response.status}`);
  }

  const payload = await response.json();
  const content = payload.output?.[0]?.content?.[0]?.text;

  if (!content) {
    throw new Error("OpenAI extraction did not return structured output.");
  }

  return JSON.parse(content) as ExtractionResult;
}
