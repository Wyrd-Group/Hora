import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load API keys from project root .env if not already set
const __dirname = dirname(fileURLToPath(import.meta.url))
const envVars = {}
try {
  const envPath = resolve(__dirname, '../../.env')
  const envContent = readFileSync(envPath, 'utf8')
  const keyNames = [
    'ANTHROPIC_API_KEY', 'BLACKBOX_API_KEY', 'BLACKBOX_API_BASE_URL', 'BLACKBOX_API_MODEL',
    'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_MODEL',
    'OLLAMA_URL', 'OLLAMA_BASE_URL', 'OLLAMA_CHAT_MODEL', 'OLLAMA_EMBED_MODEL',
    'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  ]
  envContent.split('\n').forEach(line => {
    for (const key of keyNames) {
      const match = line.match(new RegExp(`^${key}=(.+)$`))
      if (match && !process.env[key]) {
        process.env[key] = match[1].trim()
        envVars[key] = match[1].trim()
      } else if (process.env[key]) {
        envVars[key] = process.env[key]
      }
    }
  })
} catch {}

// Also capture already-set env vars
for (const key of ['OLLAMA_URL', 'OLLAMA_CHAT_MODEL', 'ANTHROPIC_API_KEY', 'BLACKBOX_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY']) {
  if (process.env[key] && !envVars[key]) envVars[key] = process.env[key]
}

// ── Blackbox Bridge — Unified AI provider routing ───────────────────
// Priority: Ollama (free local) → Blackbox free → Gemini free → Anthropic (paid)

function athenaPlugin() {
  return {
    name: 'athena-proxy',
    configureServer(server) {
      const readBody = (req) => new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); } });
        req.on('error', reject);
      });

      // ── Detect best provider ──
      function getProvider() {
        const env = process.env;
        const ollamaUrl = env.OLLAMA_URL || env.OLLAMA_BASE_URL;

        // 1. Ollama — local, free
        if (ollamaUrl) {
          return {
            name: 'ollama',
            chat: async (body, tools) => callOllamaOpenAI(ollamaUrl, env.OLLAMA_CHAT_MODEL || 'llama3:8b', body, tools),
          };
        }
        // 2. Blackbox API
        if (env.BLACKBOX_API_KEY) {
          return {
            name: 'blackbox',
            chat: async (body, tools) => callBlackbox(body, tools, env.BLACKBOX_API_KEY),
          };
        }
        // 3. Gemini free
        if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) {
          return {
            name: 'gemini',
            chat: async (body, tools) => callGemini(body, tools, env.GEMINI_API_KEY || env.GOOGLE_API_KEY),
          };
        }
        // 4. Anthropic (paid fallback)
        if (env.ANTHROPIC_API_KEY) {
          return {
            name: 'anthropic',
            chat: async (body, tools) => callAnthropic(body, tools, env.ANTHROPIC_API_KEY),
          };
        }
        return null;
      }

      // ── Ollama via OpenAI-compatible endpoint (FREE) ──
      async function callOllamaOpenAI(ollamaUrl, model, body, tools) {
        // Filter out tool-role messages that Ollama can't handle on follow-up turns
        const cleanMessages = body.messages.filter(m => m.role !== 'tool');
        const payload = {
          model,
          messages: [{ role: 'system', content: body.system }, ...cleanMessages],
          max_tokens: body.max_tokens || 1024,
        };
        if (tools && tools.length > 0) {
          payload.tools = tools;
          payload.tool_choice = 'auto';
        }

        const resp = await fetch(`${ollamaUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || `Ollama ${resp.status}`);

        const choice = data.choices?.[0]?.message || {};
        return {
          text: choice.content || '',
          tool_calls: choice.tool_calls || [],
          usage: data.usage || { input_tokens: data.prompt_eval_count || 0, output_tokens: data.eval_count || 0 },
          provider: 'ollama',
        };
      }

      // ── Blackbox API ──
      async function callBlackbox(body, tools, apiKey) {
        const cleanMessages = body.messages.filter(m => m.role !== 'tool');
        const payload = {
          model: process.env.BLACKBOX_API_MODEL || 'blackboxai',
          messages: [{ role: 'system', content: body.system }, ...cleanMessages],
          max_tokens: body.max_tokens || 1024,
        };
        if (tools && tools.length > 0) {
          payload.tools = tools;
          payload.tool_choice = 'auto';
        }

        const resp = await fetch('https://api.blackbox.ai/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || `Blackbox ${resp.status}`);

        const choice = data.choices?.[0]?.message || {};
        return {
          text: choice.content || data.text || '',
          tool_calls: choice.tool_calls || data.tool_calls || [],
          usage: data.usage || {},
          provider: 'blackbox',
        };
      }

      // ── Gemini API (free tier) ──
      async function callGemini(body, tools, apiKey) {
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        // Filter out tool-role messages and map roles for Gemini
        const contents = body.messages
          .filter(m => m.role !== 'tool')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '...' }],
          }));

        const payload = {
          contents,
          systemInstruction: { parts: [{ text: body.system }] },
          generationConfig: { maxOutputTokens: body.max_tokens || 1024 },
        };
        if (tools && tools.length > 0) {
          payload.tools = [{ functionDeclarations: tools.map(t => ({ name: t.function.name, description: t.function.description, parameters: t.function.parameters })) }];
        }

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || `Gemini ${resp.status}`);

        const parts = data.candidates?.[0]?.content?.parts || [];
        const textParts = []; const toolCalls = [];
        for (const part of parts) {
          if (part.text) textParts.push(part.text);
          if (part.functionCall) toolCalls.push({ id: `gem_${Date.now()}_${toolCalls.length}`, type: 'function', function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args || {}) } });
        }
        return {
          text: textParts.join('\n'),
          tool_calls: toolCalls,
          usage: { input_tokens: data.usageMetadata?.promptTokenCount || 0, output_tokens: data.usageMetadata?.candidatesTokenCount || 0 },
          provider: 'gemini',
        };
      }

      // ── Anthropic (paid fallback) ──
      async function callAnthropic(body, tools, apiKey) {
        // Filter out tool-role messages; keep only user/assistant for clean API call
        const cleanMessages = body.messages
          .filter(m => m.role !== 'tool')
          .map(m => ({ role: m.role, content: m.content || '' }));
        const anthropicBody = {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: body.max_tokens || 1024,
          system: body.system,
          messages: cleanMessages,
        };
        if (tools && tools.length > 0) {
          anthropicBody.tools = tools.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters }));
        }

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify(anthropicBody),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || `Anthropic ${resp.status}`);

        const textParts = []; const toolCalls = [];
        for (const block of data.content || []) {
          if (block.type === 'text') textParts.push(block.text);
          else if (block.type === 'tool_use') toolCalls.push({ id: block.id, type: 'function', function: { name: block.name, arguments: JSON.stringify(block.input) } });
        }
        return {
          text: textParts.join('\n'),
          tool_calls: toolCalls,
          usage: data.usage || {},
          provider: 'anthropic',
        };
      }

      // ── Fallback wrapper ──
      async function callWithFallback(body, tools) {
        const provider = getProvider();
        if (!provider) return null;

        try {
          const result = await provider.chat(body, tools);
          console.log(`[ATHENA] Provider: ${result.provider} | Tokens: ${result.usage.input_tokens || 0}+${result.usage.output_tokens || 0}`);
          return result;
        } catch (err) {
          console.log(`[ATHENA] ${provider.name} failed: ${err.message}`);
          // If primary failed and it wasn't Anthropic, try Anthropic as last resort
          if (provider.name !== 'anthropic' && process.env.ANTHROPIC_API_KEY) {
            console.log('[ATHENA] Falling back to Anthropic (paid)...');
            const result = await callAnthropic(body, tools, process.env.ANTHROPIC_API_KEY);
            console.log(`[ATHENA] Fallback provider: anthropic | Tokens: ${result.usage.input_tokens || 0}+${result.usage.output_tokens || 0}`);
            return result;
          }
          throw err;
        }
      }

      // POST /api/v1/athena/chat
      server.middlewares.use('/api/v1/athena/chat', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
        try {
          const body = await readBody(req);
          const result = await callWithFallback(body, null);
          if (!result) { res.writeHead(503); res.end(JSON.stringify({ detail: 'ATHENA_OFFLINE: No AI provider configured.' })); return; }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text: result.text, usage: result.usage, provider: result.provider }));
        } catch (e) { res.writeHead(500); res.end(JSON.stringify({ detail: `ATHENA_ERROR: ${e.message}` })); }
      });

      // POST /api/v1/athena/tools
      server.middlewares.use('/api/v1/athena/tools', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
        try {
          const body = await readBody(req);
          const result = await callWithFallback(body, body.tools || null);
          if (!result) { res.writeHead(503); res.end(JSON.stringify({ detail: 'ATHENA_OFFLINE: No AI provider configured.' })); return; }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text: result.text, tool_calls: result.tool_calls, usage: result.usage, provider: result.provider }));
        } catch (e) { res.writeHead(500); res.end(JSON.stringify({ detail: `ATHENA_TOOLS_ERROR: ${e.message}` })); }
      });

      // POST /api/v1/athena/brief
      server.middlewares.use('/api/v1/athena/brief', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
        try {
          const body = await readBody(req);
          const chatBody = { system: body.system, messages: [{ role: 'user', content: body.prompt }], max_tokens: 600 };
          const result = await callWithFallback(chatBody, null);
          if (!result) { res.writeHead(503); res.end(JSON.stringify({ detail: 'ATHENA_OFFLINE: No AI provider configured.' })); return; }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text: result.text, usage: result.usage, provider: result.provider }));
        } catch (e) { res.writeHead(500); res.end(JSON.stringify({ detail: `BRIEF_ERROR: ${e.message}` })); }
      });

      // Log active provider on startup
      const provider = getProvider();
      console.log(`\n  [ATHENA] AI Provider: ${provider ? `${provider.name.toUpperCase()} (${provider.name === 'ollama' ? 'FREE - local' : provider.name === 'anthropic' ? 'PAID' : 'FREE/low-cost'})` : 'NONE — Athena offline'}\n`);
    }
  };
}

// ── Stripe dev-proxy plugin ───────────────────────────────────────
// In production these endpoints should run on a real server (Vercel
// function, Supabase Edge Function, etc). This dev plugin lets the
// client integrate against the same POST /api/v1/create-checkout-session
// contract without spinning up a separate process.
function stripePlugin() {
  return {
    name: 'stripe-proxy',
    async configureServer(server) {
      const secret = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        console.log('  [STRIPE] No STRIPE_SECRET_KEY — checkout endpoints will 503');
      } else {
        console.log('  [STRIPE] Checkout endpoints active');
      }

      let stripe = null;
      async function getStripe() {
        if (stripe) return stripe;
        if (!secret) return null;
        // Lazy import so the dep isn't required when the key is absent.
        const mod = await import('stripe');
        stripe = new mod.default(secret, { apiVersion: '2024-06-20' });
        return stripe;
      }

      const readBody = (req) => new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
          try { resolve(data ? JSON.parse(data) : {}); }
          catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
      });

      const readRawBody = (req) => new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });

      // POST /api/v1/create-checkout-session
      server.middlewares.use('/api/v1/create-checkout-session', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
        const s = await getStripe();
        if (!s) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'STRIPE_NOT_CONFIGURED' }));
          return;
        }
        try {
          const body = await readBody(req);
          const origin = req.headers.origin || 'http://localhost:9999';
          const session = await s.checkout.sessions.create({
            mode: body.mode || 'payment',
            line_items: [{ price: body.priceId, quantity: body.quantity || 1 }],
            success_url: `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?stripe=cancel`,
            client_reference_id: body.userId || undefined,
            metadata: { bundleId: body.bundleId || '', ...(body.metadata || {}) },
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sessionId: session.id, url: session.url }));
        } catch (e) {
          console.error('[STRIPE] checkout error', e.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // POST /api/v1/stripe/webhook — verifies signature and logs events.
      // Real user-crediting (AP balance / tier upgrade) should happen here
      // against the Supabase service-role client. Left as a dev stub with
      // signature verification wired so we get an alarm on shape mismatch.
      server.middlewares.use('/api/v1/stripe/webhook', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
        const s = await getStripe();
        if (!s || !webhookSecret) {
          res.writeHead(503); res.end(); return;
        }
        try {
          const raw = await readRawBody(req);
          const sig = req.headers['stripe-signature'];
          const event = s.webhooks.constructEvent(raw, sig, webhookSecret);
          console.log(`[STRIPE] webhook ${event.type}`);
          // TODO(backend): fan out event.type to Supabase — e.g.
          //   checkout.session.completed → credit AP / upgrade tier.
          // Intentionally not implemented in the dev proxy; a real server
          // must own user-state mutation to prevent client tampering.
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        } catch (e) {
          console.error('[STRIPE] webhook verify failed', e.message);
          res.writeHead(400); res.end(`Webhook Error: ${e.message}`);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), athenaPlugin(), stripePlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'node',
  },
  server: {
    port: 9999,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
          'engine-ai': [
            './src/lib/engines/aiController.ts',
            './src/lib/engines/macroEngine.ts',
            './src/lib/engines/gnnEngine.ts',
            './src/lib/engines/predictionEngine.ts',
          ],
          'engine-world': [
            './src/store/worldSimStore.ts',
            './src/store/worldIntelStore.ts',
          ],
          'athena': [
            './src/store/athenaStore.ts',
            './src/data/athenaTools.ts',
          ],
        },
      },
    },
  },
})
