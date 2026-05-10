/**
 * substrate-telemetry — stub Netlify function for the Phase 1 telemetry
 * batch ship-up.
 *
 * Per AEGIS_BUILD_SPEC.md §12.2 + Phase 1 build brief task J. The
 * Quadratic backend doesn't exist locally yet; this function logs the
 * incoming ciphertext + count, replies 200, and records a server-side
 * counter. Phase 2/3 swaps the body for a real forwarding handler.
 *
 * British English. No academy_*.
 */

interface TelemetryPayload {
  ciphertext: string;
  count: number;
}

let totalReceived = 0;
let totalEvents = 0;

export async function handler(event: { httpMethod: string; body?: string }): Promise<{
  statusCode: number;
  body: string;
}> {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'POST only' }) };
  }
  try {
    const body: TelemetryPayload = JSON.parse(event.body ?? '{}');
    const count = Number(body.count ?? 0) || 0;
    totalReceived++;
    totalEvents += count;
    // eslint-disable-next-line no-console
    console.log(
      `[substrate-telemetry] batch #${totalReceived} accepted: ${count} events ` +
        `(${(body.ciphertext ?? '').slice(0, 24)}…). Lifetime totals: ` +
        `${totalReceived} batches / ${totalEvents} events.`,
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        accepted_count: count,
        lifetime_batches: totalReceived,
        lifetime_events: totalEvents,
      }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid payload', detail: (err as Error)?.message }),
    };
  }
}

export default handler;
