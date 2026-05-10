/**
 * Node built-in test runner: `node --test tests/parser.test.mjs`
 * No external test framework required.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoT, parseCoTBatch } from '../dist/index.js';

const FIXTURE_SINGLE = `
<event version="2.0"
       uid="GHOST-7"
       type="a-f-A-C-F"
       time="2026-03-31T12:00:00Z"
       start="2026-03-31T12:00:00Z"
       stale="2026-03-31T12:05:00Z"
       how="m-g">
  <point lat="26.123" lon="55.456" hae="9144.0" ce="10.0" le="10.0"/>
  <detail>
    <contact callsign="GHOST-7"/>
    <track speed="220.0" course="270.0"/>
    <status battery="85"/>
  </detail>
</event>`.trim();

const FIXTURE_BATCH = `
<events>
  <event version="2.0" uid="BANDIT-1" type="a-h-A" time="2026-03-31T12:00:00Z"
         start="2026-03-31T12:00:00Z" stale="2026-03-31T12:05:00Z" how="m-g">
    <point lat="25.0" lon="54.0" hae="3000.0" ce="50.0" le="50.0"/>
    <detail><contact callsign="BANDIT-1"/></detail>
  </event>
  <event version="2.0" uid="VESSEL-42" type="a-n-S" time="2026-03-31T12:00:00Z"
         start="2026-03-31T12:00:00Z" stale="2026-03-31T12:30:00Z" how="m-s-s-s">
    <point lat="24.5" lon="56.2" hae="0.0" ce="100.0" le="100.0"/>
    <detail><contact callsign="MV-PROSPERITY"/></detail>
  </event>
</events>`.trim();

test('parseCoT — single friendly air entity', () => {
    const result = parseCoT(FIXTURE_SINGLE);

    assert.equal(result.uid, 'GHOST-7');
    assert.equal(result.typeString, 'a-f-A-C-F');
    assert.equal(result.affiliation, 'friendly');
    assert.equal(result.domain, 'air');
    assert.equal(result.callsign, 'GHOST-7');
    assert.equal(result.lat, 26.123);
    assert.equal(result.lon, 55.456);
    assert.equal(result.altitude, 9144.0);
    assert.equal(result.speed, 220.0);
    assert.equal(result.heading, 270.0);
    assert.equal(result.battery, 85);
    assert.ok(result.staleAt instanceof Date);
    assert.equal(result.raw, FIXTURE_SINGLE);
});

test('parseCoTBatch — batch wrapper with 2 events', () => {
    const results = parseCoTBatch(FIXTURE_BATCH);

    assert.equal(results.length, 2);

    const [bandit, vessel] = results;
    assert.equal(bandit.uid, 'BANDIT-1');
    assert.equal(bandit.affiliation, 'hostile');
    assert.equal(bandit.domain, 'air');

    assert.equal(vessel.uid, 'VESSEL-42');
    assert.equal(vessel.affiliation, 'neutral');
    assert.equal(vessel.domain, 'sea');
});

test('parseCoTBatch — single event passed as batch', () => {
    const results = parseCoTBatch(FIXTURE_SINGLE);
    assert.equal(results.length, 1);
    assert.equal(results[0].uid, 'GHOST-7');
});

test('parseCoT — invalid lat/lon throws', () => {
    const bad = FIXTURE_SINGLE.replace('lat="26.123"', 'lat="NaN"');
    assert.throws(() => parseCoT(bad), /invalid lat\/lon/);
});
