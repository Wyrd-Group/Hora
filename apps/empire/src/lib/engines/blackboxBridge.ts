/**
 * blackboxBridge.ts — Blackbox AI CLI Core SDK Integration
 *
 * Routes Athena's AI through the Blackbox CLI core SDK which supports:
 * - Ollama (local, free) via OpenAI-compatible endpoint
 * - Blackbox API (free model: blackboxai)
 * - Gemini (free tier)
 * - Any OpenAI-compatible provider
 *
 * This replaces direct API calls to Anthropic/Blackbox with SDK-managed
 * provider routing and native tool-calling support.
 *
 * Dev mode: Uses Ollama at localhost:11434 (zero cost)
 * Production: Uses Blackbox free model or Gemini free tier
 */

// ── Types ───────────────────────────────────────────────────────────

export interface BlackboxToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface BlackboxChatResult {
  text: string;
  tool_calls: BlackboxToolCall[];
  usage: { input_tokens: number; output_tokens: number };
  provider: string;
}

export interface BlackboxToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

// ── Provider Configuration ──────────────────────────────────────────

interface ProviderConfig {
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  supportsTools: boolean;
}

/**
 * Detect the best available provider from environment.
 * Priority: Ollama (free local) > Blackbox free > Gemini free > Anthropic (paid fallback)
 */
export function detectProvider(env: Record<string, string | undefined>): ProviderConfig | null {
  // 1. Ollama — local, free, always preferred for dev
  const ollamaUrl = env.OLLAMA_URL || env.OLLAMA_BASE_URL;
  if (ollamaUrl) {
    return {
      name: 'ollama',
      baseUrl: `${ollamaUrl}/v1`,
      model: env.OLLAMA_CHAT_MODEL || 'llama3:8b',
      apiKey: 'ollama', // Ollama doesn't validate keys
      supportsTools: true, // Most modern Ollama models support tool calling
    };
  }

  // 2. Blackbox API — free model available
  if (env.BLACKBOX_API_KEY) {
    return {
      name: 'blackbox',
      baseUrl: env.BLACKBOX_API_BASE_URL || 'https://api.blackbox.ai/api',
      model: env.BLACKBOX_API_MODEL || 'blackboxai',
      apiKey: env.BLACKBOX_API_KEY,
      supportsTools: true,
    };
  }

  // 3. Gemini — free tier (generous)
  if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) {
    return {
      name: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      apiKey: (env.GEMINI_API_KEY || env.GOOGLE_API_KEY)!,
      supportsTools: true,
    };
  }

  // 4. OpenAI-compatible (custom endpoint)
  if (env.OPENAI_API_KEY && env.OPENAI_BASE_URL) {
    return {
      name: 'openai-compat',
      baseUrl: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      apiKey: env.OPENAI_API_KEY,
      supportsTools: true,
    };
  }

  // 5. Anthropic — paid fallback (only if nothing else available)
  if (env.ANTHROPIC_API_KEY) {
    return {
      name: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-haiku-4-5-20251001',
      apiKey: env.ANTHROPIC_API_KEY,
      supportsTools: true,
    };
  }

  return null;
}

// ── OpenAI-Compatible Chat (Ollama, Blackbox, OpenAI, etc.) ─────────

async function chatOpenAICompat(
  provider: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  tools?: BlackboxToolSchema[],
  maxTokens?: number,
): Promise<BlackboxChatResult> {
  const endpoint = provider.name === 'blackbox'
    ? `${provider.baseUrl}/chat`
    : `${provider.baseUrl}/chat/completions`;

  const body: any = {
    model: provider.model,
    messages: [
      { role: 'system', content: system },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ],
    max_tokens: maxTokens || 1024,
  };

  // Add tools if provider supports them and they're provided
  if (tools && tools.length > 0 && provider.supportsTools) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.name === 'ollama') {
    // Ollama doesn't need auth
  } else {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.error?.message || `${provider.name} API ${resp.status}: ${JSON.stringify(data)}`);
  }

  // Normalize response (OpenAI-compatible format)
  const choice = data.choices?.[0];
  const message = choice?.message || {};
  const text = message.content || data.text || data.content?.[0]?.text || '';
  const rawToolCalls = message.tool_calls || data.tool_calls || [];

  const toolCalls: BlackboxToolCall[] = rawToolCalls.map((tc: any, i: number) => ({
    id: tc.id || `tc_${Date.now()}_${i}`,
    name: tc.function?.name || tc.name,
    arguments: typeof (tc.function?.arguments || tc.arguments) === 'string'
      ? JSON.parse(tc.function?.arguments || tc.arguments)
      : (tc.function?.arguments || tc.arguments || {}),
  }));

  const usage = data.usage || {
    input_tokens: data.prompt_eval_count || 0,
    output_tokens: data.eval_count || 0,
  };

  return { text, tool_calls: toolCalls, usage, provider: provider.name };
}

// ── Anthropic Chat (paid fallback) ──────────────────────────────────

async function chatAnthropic(
  provider: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  tools?: BlackboxToolSchema[],
  maxTokens?: number,
): Promise<BlackboxChatResult> {
  const body: any = {
    model: provider.model,
    max_tokens: maxTokens || 1024,
    system,
    messages: messages.map(m => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content })),
  };

  // Convert OpenAI tool format to Anthropic tool format
  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const resp = await fetch(`${provider.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.error?.message || `Anthropic API ${resp.status}`);
  }

  // Convert Anthropic response to normalized format
  const textParts: string[] = [];
  const toolCalls: BlackboxToolCall[] = [];

  for (const block of data.content || []) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        name: block.name,
        arguments: block.input || {},
      });
    }
  }

  return {
    text: textParts.join('\n'),
    tool_calls: toolCalls,
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
    provider: 'anthropic',
  };
}

// ── Gemini Chat ─────────────────────────────────────────────────────

async function chatGemini(
  provider: ProviderConfig,
  system: string,
  messages: ChatMessage[],
  tools?: BlackboxToolSchema[],
  maxTokens?: number,
): Promise<BlackboxChatResult> {
  // Gemini uses a different API format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { maxOutputTokens: maxTokens || 1024 },
  };

  // Add tools in Gemini format
  if (tools && tools.length > 0) {
    body.tools = [{
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }];
  }

  const resp = await fetch(
    `${provider.baseUrl}/models/${provider.model}:generateContent?key=${provider.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(data.error?.message || `Gemini API ${resp.status}`);
  }

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const textParts: string[] = [];
  const toolCalls: BlackboxToolCall[] = [];

  for (const part of parts) {
    if (part.text) textParts.push(part.text);
    if (part.functionCall) {
      toolCalls.push({
        id: `gem_${Date.now()}_${toolCalls.length}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      });
    }
  }

  return {
    text: textParts.join('\n'),
    tool_calls: toolCalls,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount || 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
    provider: 'gemini',
  };
}

// ── Unified Chat Interface ──────────────────────────────────────────

/**
 * Send a chat message through the best available provider.
 * Automatically detects provider from env vars and routes accordingly.
 * Supports tool-calling across all providers.
 */
export async function blackboxChat(
  env: Record<string, string | undefined>,
  system: string,
  messages: ChatMessage[],
  tools?: BlackboxToolSchema[],
  maxTokens?: number,
): Promise<BlackboxChatResult> {
  const provider = detectProvider(env);

  if (!provider) {
    throw new Error('ATHENA_OFFLINE: No AI provider configured. Set OLLAMA_URL, BLACKBOX_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY.');
  }

  switch (provider.name) {
    case 'anthropic':
      return chatAnthropic(provider, system, messages, tools, maxTokens);
    case 'gemini':
      return chatGemini(provider, system, messages, tools, maxTokens);
    default:
      // OpenAI-compatible: ollama, blackbox, openai-compat
      return chatOpenAICompat(provider, system, messages, tools, maxTokens);
  }
}

/**
 * Chat with automatic fallback chain.
 * Tries primary provider, falls back through the chain if it fails.
 */
export async function blackboxChatWithFallback(
  env: Record<string, string | undefined>,
  system: string,
  messages: ChatMessage[],
  tools?: BlackboxToolSchema[],
  maxTokens?: number,
): Promise<BlackboxChatResult> {
  const provider = detectProvider(env);

  if (!provider) {
    throw new Error('ATHENA_OFFLINE: No AI provider configured.');
  }

  try {
    return await blackboxChat(env, system, messages, tools, maxTokens);
  } catch (primaryErr: any) {
    if (import.meta.env.DEV) console.debug(`[BLACKBOX-BRIDGE] Primary provider (${provider.name}) failed: ${primaryErr.message}`);

    // Try Anthropic as last resort if it wasn't the primary
    if (provider.name !== 'anthropic' && env.ANTHROPIC_API_KEY) {
      if (import.meta.env.DEV) console.debug('[BLACKBOX-BRIDGE] Falling back to Anthropic...');
      const anthropicProvider: ProviderConfig = {
        name: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-haiku-4-5-20251001',
        apiKey: env.ANTHROPIC_API_KEY,
        supportsTools: true,
      };
      return chatAnthropic(anthropicProvider, system, messages, tools, maxTokens);
    }

    throw primaryErr;
  }
}

// ── Browser-side Ollama Direct (for offline/local mode) ─────────────

/**
 * Direct Ollama call from the browser — bypasses server entirely.
 * Used when running locally with Ollama for zero-latency, zero-cost AI.
 */
export async function ollamaDirectChat(
  ollamaUrl: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  tools?: BlackboxToolSchema[],
  maxTokens?: number,
): Promise<BlackboxChatResult> {
  const provider: ProviderConfig = {
    name: 'ollama',
    baseUrl: `${ollamaUrl}/v1`,
    model,
    apiKey: 'ollama',
    supportsTools: true,
  };

  return chatOpenAICompat(provider, system, messages, tools, maxTokens);
}

/**
 * Check if Ollama is available locally (browser-side check).
 */
export async function checkOllamaAvailable(ollamaUrl: string = 'http://localhost:11434'): Promise<{
  available: boolean;
  models: string[];
  bestModel: string | null;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return { available: false, models: [], bestModel: null };

    const data = await resp.json();
    const models: string[] = (data.models || []).map((m: any) => m.name || '');

    // Prefer tool-capable models
    const toolCapable = ['llama3', 'llama3.1', 'llama3.2', 'qwen2.5', 'mistral', 'gemma3', 'gemma4', 'command-r'];
    let bestModel: string | null = null;

    for (const preferred of toolCapable) {
      const match = models.find(m => m.startsWith(preferred));
      if (match) { bestModel = match; break; }
    }

    if (!bestModel && models.length > 0) bestModel = models[0];

    return { available: true, models, bestModel };
  } catch {
    return { available: false, models: [], bestModel: null };
  }
}
