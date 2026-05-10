/**
 * Web Worker entry point for CoT parsing.
 * This bundle is self-contained (xmldom bundled in) — drop it in aegis/public/
 * and load with: new Worker('/cot-parser.worker.js')
 *
 * CLAUDE-OWNED: Gemini should extend, not replace.
 *
 * Message protocol:
 *   → { id: string, data: string | ArrayBuffer }
 *   ← { id: string, ok: true,  parsed: CoTParsed[] }
 *   ← { id: string, ok: false, error: string }
 */

import { parseCoTBatch } from './parser';

self.onmessage = (e: MessageEvent<{ id: string; data: string | ArrayBuffer }>) => {
    const { id, data } = e.data;
    try {
        const xml    = data instanceof ArrayBuffer
            ? new TextDecoder().decode(data)
            : data;
        const parsed = parseCoTBatch(xml);
        self.postMessage({ id, ok: true, parsed });
    } catch (err) {
        self.postMessage({ id, ok: false, error: String(err) });
    }
};
