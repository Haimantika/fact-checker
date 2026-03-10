import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type ExaResult = {
  title: string;
  url: string;
  text: string;
};

type FactCheckVerdict = "true" | "false" | "hoax" | "unknown";

type FactCheckResponse = {
  verdict: FactCheckVerdict;
  explanation: string;
  confidence: number;
  sources: ExaResult[];
};

async function searchWithExa(query: string): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXA_API_KEY environment variable.");
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      query,
      numResults: 5,
      useAutoprompt: true
    })
  });

  if (!response.ok) {
    throw new Error(`Exa search failed with status ${response.status}.`);
  }

  const data = await response.json();
  if (!Array.isArray(data.results)) {
    return [];
  }

  return data.results.map((r: any) => ({
    title: r.title ?? "Untitled",
    url: r.url ?? "",
    text: r.text ?? r.snippet ?? ""
  }));
}

const DO_INFERENCE_API_KEY = process.env.DO_INFERENCE_API_KEY;
const DO_INFERENCE_BASE_URL =
  process.env.DO_INFERENCE_URL ?? "https://inference.do-ai.run/v1";
const DO_INFERENCE_MODEL = process.env.DO_INFERENCE_MODEL;

const doClient =
  DO_INFERENCE_API_KEY
    ? new OpenAI({
        apiKey: DO_INFERENCE_API_KEY,
        baseURL: DO_INFERENCE_BASE_URL,
        timeout: 30000,
        maxRetries: 3,
      })
    : null;

async function callDigitalOceanFactChecker(
  claim: string,
  sources: ExaResult[]
): Promise<FactCheckResponse> {
  if (!DO_INFERENCE_API_KEY || !DO_INFERENCE_MODEL || !doClient) {
    throw new Error(
      "Missing DigitalOcean serverless inference configuration (DO_INFERENCE_API_KEY, DO_INFERENCE_URL, DO_INFERENCE_MODEL)."
    );
  }

  const sourceSummary = sources
    .map(
      (s, index) =>
        `Source ${index + 1}:\nTitle: ${s.title}\nURL: ${s.url}\nText: ${s.text}`
    )
    .join("\n\n");

  const systemPrompt =
    "You are a rigorous fact-checking assistant. Your job is to determine whether a claim is true, false, an AI-generated hoax, or unknown based only on the provided web sources. You must never guess or fabricate evidence. If the sources do not clearly support or refute the claim, or if they do not contain the original content (for example, when the user only provided a URL that could not be read), you MUST respond with the verdict \"unknown\" and explain that the evidence is insufficient. Always base your verdict strictly on the provided sources. Respond in strict JSON.";

  const userPrompt = `
Claim:
${claim}

Web sources:
${sourceSummary || "No relevant sources were found."}

Return a JSON object with this exact shape:
{
  "verdict": "true" | "false" | "hoax" | "unknown",
  "explanation": string,
  "confidence": number, // from 0 to 1
  "usedSourceIndexes": number[] // indexes of sources you relied on (1-based)
}
`;

  try {
    const completion = await doClient.chat.completions.create({
      model: DO_INFERENCE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    });

    const content =
      completion.choices?.[0]?.message?.content ??
      (completion.choices?.[0] as any)?.message?.[0]?.text ??
      "";

    let parsed: {
      verdict: FactCheckVerdict;
      explanation: string;
      confidence: number;
      usedSourceIndexes?: number[];
    };

    try {
      parsed =
        typeof content === "string" ? JSON.parse(content) : JSON.parse("");
    } catch {
      throw new Error("Model response was not valid JSON.");
    }

    const usedSources =
      parsed.usedSourceIndexes
        ?.map((i) => sources[i - 1])
        .filter(Boolean) ?? sources;

    return {
      verdict: parsed.verdict,
      explanation: parsed.explanation,
      confidence: parsed.confidence,
      sources: usedSources,
    };
  } catch (error: any) {
    if (error?.status === 404) {
      throw new Error(
        "DigitalOcean inference returned 404. Check that DO_INFERENCE_URL is the base URL (e.g. https://inference.do-ai.run/v1) and that DO_INFERENCE_MODEL matches an available model."
      );
    }

    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = (body?.input as string | undefined)?.trim();

    if (!input) {
      return NextResponse.json(
        { error: "Missing 'input' in request body." },
        { status: 400 }
      );
    }

    const exaResults = await searchWithExa(input);

    // If we couldn't find any relevant sources, avoid sending the model a
    // completely ungrounded query, which can lead to made-up answers.
    if (!exaResults.length) {
      const isUrl = /^https?:\/\/\S+$/i.test(input);

      const explanation = isUrl
        ? "I couldn't retrieve the content for that link or find reliable coverage of the exact claim, so I can't determine whether it is true or false. Please paste the actual text of the post or article instead of only the URL."
        : "I couldn't find any reliable sources about this claim, so I can't determine whether it is true or false.";

      const fallback: FactCheckResponse = {
        verdict: "unknown",
        explanation,
        confidence: 0,
        sources: [],
      };

      return NextResponse.json(fallback);
    }

    const factCheck = await callDigitalOceanFactChecker(input, exaResults);

    return NextResponse.json(factCheck);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Unable to fact-check input.",
        details: error?.message ?? "Unknown error"
      },
      { status: 500 }
    );
  }
}

