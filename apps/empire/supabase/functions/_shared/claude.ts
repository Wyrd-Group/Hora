// Shared Claude API client for Edge Functions.
// Uses Anthropic's Messages API with strict JSON output.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface ClaudeExtractionOptions {
  apiKey: string;
  model?: string;         // default: claude-haiku-4-5 for extraction (cheap + fast)
  maxTokens?: number;
  temperature?: number;
  systemPrompt: string;
  userPrompt: string;
}

export interface ClaudeResponse {
  content: string;
  usage: { input_tokens: number; output_tokens: number };
  stopReason: string;
}

export async function callClaude(opts: ClaudeExtractionOptions): Promise<ClaudeResponse> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-haiku-4-5',
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0,
      system: opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  return {
    content: text,
    usage: {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    },
    stopReason: data.stop_reason ?? 'unknown',
  };
}

/**
 * Extract a JSON object from Claude's response.
 * Handles both plain JSON and markdown-fenced JSON.
 */
export function parseClaudeJson<T>(text: string): T {
  // Strip markdown fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Find the first { or [ and last matching } or ]
  const firstBrace = Math.min(
    ...[cleaned.indexOf('{'), cleaned.indexOf('[')].filter((i) => i !== -1),
  );
  const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  if (!Number.isFinite(firstBrace) || lastBrace === -1) {
    throw new Error(`No JSON object found in Claude response. Got: ${cleaned.slice(0, 200)}`);
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(`Failed to parse Claude JSON: ${(err as Error).message}. Raw: ${jsonStr.slice(0, 300)}`);
  }
}
