"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FactCheckVerdict = "true" | "false" | "hoax" | "unknown";

type FactCheckResult = {
  verdict: FactCheckVerdict;
  explanation: string;
  confidence: number;
  sources: {
    title: string;
    url: string;
    text: string;
  }[];
};

export default function HomePage() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FactCheckResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const payload = input.trim() || url.trim();
    if (!payload) {
      setError("Please enter text or a link to fact-check.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ input: payload })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.details || data?.error || "Request failed.");
      }

      const data = (await response.json()) as FactCheckResult;
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const verdictVariant: Record<FactCheckVerdict, "success" | "destructive" | "warning" | "default"> =
    {
      true: "success",
      false: "destructive",
      hoax: "warning",
      unknown: "default"
    };

  const verdictLabel: Record<FactCheckVerdict, string> = {
    true: "Likely True",
    false: "Likely False",
    hoax: "AI-Generated Hoax",
    unknown: "Unknown"
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Fact Checker
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste text or a link and get a source-backed assessment: true, false,
          or AI-generated hoax.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check a claim</CardTitle>
          <CardDescription>
            Provide a short statement, paragraph, or URL. We will search the
            web and run a fact-checking model on top of the retrieved sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Text</label>
              <Textarea
                placeholder="Paste the text you want to verify..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">or Link</label>
              <Input
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground">
                We use Exa for search and DigitalOcean serverless inference for
                fact-checking.
              </p>
              <Button type="submit" disabled={loading}>
                {loading ? "Checking..." : "Fact-check"}
              </Button>
            </div>
          </form>

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Model verdict with a confidence estimate and supporting sources.
              </CardDescription>
            </div>
            <Badge variant={verdictVariant[result.verdict]}>
              {verdictLabel[result.verdict]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Explanation</p>
              <p className="text-sm text-muted-foreground">
                {result.explanation}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">
                Confidence:{" "}
                <span className="font-normal text-muted-foreground">
                  {(result.confidence * 100).toFixed(0)}%
                </span>
              </p>
            </div>

            {result.sources?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Sources</p>
                <ul className="space-y-2 text-sm">
                  {result.sources.map((source, index) => (
                    <li
                      key={`${source.url}-${index}`}
                      className="rounded-md border bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{source.title}</span>
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            Open
                          </a>
                        )}
                      </div>
                      {source.text && (
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                          {source.text}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

