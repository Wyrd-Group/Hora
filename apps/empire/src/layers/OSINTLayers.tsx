import React from 'react';
import { Entity, PointGraphics, EllipseGraphics, BillboardGraphics, LabelGraphics } from 'resium';
import { Cartesian3, Color, LabelStyle, VerticalOrigin, HorizontalOrigin, NearFarScalar, DistanceDisplayCondition } from 'cesium';

import type { Aircraft } from '../feeds/adsb';
import type {
  SatPositionWithMeta,
  Vessel,
  Earthquake,
  Fire,
  WeatherAlert,
  Conflict,
  NewsItem,
} from '../hooks/useOSINTFeeds';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FEET_TO_METERS = 0.3048;
const LABEL_FONT = '12px monospace';
const LABEL_OFFSET_Y = -20;
const DISPLAY_CONDITION = new DistanceDisplayCondition(0, 5_000_000);
const LABEL_SCALE = new NearFarScalar(1_000, 1.0, 5_000_000, 0.4);

// ═════════════════════════════════════════════════════════════════════════════
// 1. FlightLayer — ADS-B aircraft
// ═════════════════════════════════════════════════════════════════════════════

export const FlightLayer: React.FC<{ data: Aircraft[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((ac) => {
        const alt = (ac.alt_baro ?? 0) * FEET_TO_METERS;
        const position = Cartesian3.fromDegrees(ac.lon, ac.lat, alt);
        const label = ac.callsign || ac.icao;

        return (
          <Entity
            key={ac.icao}
            position={position}
            name={label}
            description={`Callsign: ${ac.callsign}<br/>Alt: ${ac.alt_baro} ft<br/>Speed: ${ac.speed} kts<br/>Heading: ${ac.heading}°`}
          >
            <PointGraphics
              pixelSize={6}
              color={Color.CYAN}
              outlineColor={Color.BLACK}
              outlineWidth={1}
              distanceDisplayCondition={DISPLAY_CONDITION}
            />
            <LabelGraphics
              text={label}
              font={LABEL_FONT}
              fillColor={Color.CYAN}
              style={LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              outlineColor={Color.BLACK}
              verticalOrigin={VerticalOrigin.BOTTOM}
              pixelOffset={{ x: 0, y: LABEL_OFFSET_Y } as any}
              scaleByDistance={LABEL_SCALE}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 500_000)}
            />
          </Entity>
        );
      })}
    </>
  );
});

FlightLayer.displayName = 'FlightLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 2. SatelliteLayer — orbiting satellites with path trails
// ═════════════════════════════════════════════════════════════════════════════

const ISS_NORAD = '25544';

export const SatelliteLayer: React.FC<{ data: SatPositionWithMeta[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((sat) => {
        const position = Cartesian3.fromDegrees(sat.lon, sat.lat, sat.alt * 1000); // km → m
        const isISS = sat.noradId === ISS_NORAD;
        const size = isISS ? 10 : 4;

        return (
          <Entity
            key={sat.noradId}
            position={position}
            name={sat.name}
            description={`NORAD: ${sat.noradId}<br/>Alt: ${sat.alt.toFixed(1)} km<br/>Lat: ${sat.lat.toFixed(3)}°<br/>Lon: ${sat.lon.toFixed(3)}°`}
          >
            <PointGraphics
              pixelSize={size}
              color={Color.YELLOW}
              outlineColor={Color.BLACK}
              outlineWidth={1}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 20_000_000)}
            />
            {isISS && (
              <LabelGraphics
                text={sat.name}
                font={'14px monospace'}
                fillColor={Color.YELLOW}
                style={LabelStyle.FILL_AND_OUTLINE}
                outlineWidth={2}
                outlineColor={Color.BLACK}
                verticalOrigin={VerticalOrigin.BOTTOM}
                pixelOffset={{ x: 0, y: LABEL_OFFSET_Y } as any}
                distanceDisplayCondition={new DistanceDisplayCondition(0, 10_000_000)}
              />
            )}
          </Entity>
        );
      })}
    </>
  );
});

SatelliteLayer.displayName = 'SatelliteLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 3. ShipLayer — AIS vessel tracking
// ═════════════════════════════════════════════════════════════════════════════

export const ShipLayer: React.FC<{ data: Vessel[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((v) => {
        const position = Cartesian3.fromDegrees(v.lon, v.lat, 0);
        const label = v.name || v.mmsi;

        return (
          <Entity
            key={v.mmsi}
            position={position}
            name={label}
            description={`MMSI: ${v.mmsi}<br/>Type: ${v.shipType}<br/>Speed: ${v.speed} kts<br/>Heading: ${v.heading}°<br/>Flag: ${v.flag}<br/>Dest: ${v.destination}`}
          >
            <PointGraphics
              pixelSize={7}
              color={Color.fromCssColorString('#00CED1')} // dark turquoise
              outlineColor={Color.BLACK}
              outlineWidth={1}
              distanceDisplayCondition={DISPLAY_CONDITION}
            />
            <LabelGraphics
              text={label}
              font={LABEL_FONT}
              fillColor={Color.fromCssColorString('#00CED1')}
              style={LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              outlineColor={Color.BLACK}
              verticalOrigin={VerticalOrigin.BOTTOM}
              pixelOffset={{ x: 0, y: LABEL_OFFSET_Y } as any}
              scaleByDistance={LABEL_SCALE}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 300_000)}
            />
          </Entity>
        );
      })}
    </>
  );
});

ShipLayer.displayName = 'ShipLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 4. EarthquakeLayer — USGS seismic events
// ═════════════════════════════════════════════════════════════════════════════

function quakeRadius(magnitude: number): number {
  // Exponential scaling: M3 → ~5 km, M5 → ~50 km, M7 → ~500 km
  return Math.pow(10, magnitude / 2) * 50;
}

function quakeColor(magnitude: number): Color {
  if (magnitude >= 7) return Color.RED;
  if (magnitude >= 5) return Color.fromCssColorString('#FF4500'); // orange-red
  if (magnitude >= 4) return Color.ORANGE;
  return Color.fromCssColorString('#FF6347'); // tomato
}

export const EarthquakeLayer: React.FC<{ data: Earthquake[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((eq) => {
        const position = Cartesian3.fromDegrees(eq.lon, eq.lat, 0);
        const radius = quakeRadius(eq.magnitude);
        const color = quakeColor(eq.magnitude);
        const fillColor = color.withAlpha(eq.magnitude >= 5 ? 0.5 : 0.3);

        return (
          <Entity
            key={eq.id}
            position={position}
            name={`M${eq.magnitude} — ${eq.place}`}
            description={`Magnitude: ${eq.magnitude}<br/>Depth: ${eq.depth} km<br/>Place: ${eq.place}<br/>Time: ${new Date(eq.time).toISOString()}`}
          >
            <EllipseGraphics
              semiMajorAxis={radius}
              semiMinorAxis={radius}
              material={fillColor}
              outline
              outlineColor={color}
              outlineWidth={2}
            />
            <LabelGraphics
              text={`M${eq.magnitude.toFixed(1)}`}
              font={'13px monospace'}
              fillColor={color}
              style={LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              outlineColor={Color.BLACK}
              verticalOrigin={VerticalOrigin.CENTER}
              horizontalOrigin={HorizontalOrigin.CENTER}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 3_000_000)}
            />
          </Entity>
        );
      })}
    </>
  );
});

EarthquakeLayer.displayName = 'EarthquakeLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 5. FireLayer — NASA FIRMS active fire detections
// ═════════════════════════════════════════════════════════════════════════════

function fireSize(frp: number): number {
  // FRP (MW): low ~10, medium ~100, high ~500+
  return Math.max(4, Math.min(16, Math.log2(frp + 1) * 2));
}

export const FireLayer: React.FC<{ data: Fire[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((f) => {
        const position = Cartesian3.fromDegrees(f.lon, f.lat, 0);
        const size = fireSize(f.frp);

        return (
          <Entity
            key={f.id}
            position={position}
            name={`Fire — ${f.acqDate}`}
            description={`FRP: ${f.frp} MW<br/>Brightness: ${f.brightness} K<br/>Confidence: ${f.confidence}<br/>Satellite: ${f.satellite}`}
          >
            <PointGraphics
              pixelSize={size}
              color={Color.fromCssColorString('#FF4500')} // orange-red
              outlineColor={Color.fromCssColorString('#FF8C00')}
              outlineWidth={1}
              distanceDisplayCondition={DISPLAY_CONDITION}
            />
          </Entity>
        );
      })}
    </>
  );
});

FireLayer.displayName = 'FireLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 6. WeatherLayer — severe weather alerts
// ═════════════════════════════════════════════════════════════════════════════

function weatherColor(severity: WeatherAlert['severity']): Color {
  switch (severity) {
    case 'extreme': return Color.RED;
    case 'severe': return Color.fromCssColorString('#FF4500');
    case 'moderate': return Color.ORANGE;
    case 'minor':
    default: return Color.YELLOW;
  }
}

function weatherRadius(severity: WeatherAlert['severity']): number {
  switch (severity) {
    case 'extreme': return 80_000;
    case 'severe': return 60_000;
    case 'moderate': return 40_000;
    case 'minor':
    default: return 25_000;
  }
}

export const WeatherLayer: React.FC<{ data: WeatherAlert[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((w) => {
        const position = Cartesian3.fromDegrees(w.lon, w.lat, 0);
        const color = weatherColor(w.severity);
        const radius = weatherRadius(w.severity);

        return (
          <Entity
            key={w.id}
            position={position}
            name={w.event}
            description={`Severity: ${w.severity}<br/>Headline: ${w.headline}<br/>Area: ${w.areaDesc}<br/>Onset: ${w.onset}<br/>Expires: ${w.expires}`}
          >
            <EllipseGraphics
              semiMajorAxis={radius}
              semiMinorAxis={radius}
              material={color.withAlpha(0.25)}
              outline
              outlineColor={color}
              outlineWidth={2}
            />
            <LabelGraphics
              text={w.event}
              font={LABEL_FONT}
              fillColor={color}
              style={LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              outlineColor={Color.BLACK}
              verticalOrigin={VerticalOrigin.CENTER}
              horizontalOrigin={HorizontalOrigin.CENTER}
              scaleByDistance={LABEL_SCALE}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 1_500_000)}
            />
          </Entity>
        );
      })}
    </>
  );
});

WeatherLayer.displayName = 'WeatherLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 7. ConflictLayer — ACLED conflict events (red pulsing)
// ═════════════════════════════════════════════════════════════════════════════

function conflictSize(numArticles: number): number {
  return Math.max(6, Math.min(18, Math.log2(numArticles + 1) * 3));
}

export const ConflictLayer: React.FC<{ data: Conflict[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.map((c) => {
        const position = Cartesian3.fromDegrees(c.lon, c.lat, 0);
        const size = conflictSize(c.numArticles);

        return (
          <Entity
            key={c.id}
            position={position}
            name={`${c.eventType} — ${c.country}`}
            description={`Type: ${c.eventType}<br/>Region: ${c.region}<br/>Fatalities: ${c.fatalities}<br/>Articles: ${c.numArticles}<br/>Date: ${c.date}<br/>Source: ${c.source}<br/>Notes: ${c.notes}`}
          >
            <PointGraphics
              pixelSize={size}
              color={Color.RED.withAlpha(0.85)}
              outlineColor={Color.fromCssColorString('#8B0000')}
              outlineWidth={2}
              distanceDisplayCondition={DISPLAY_CONDITION}
            />
            <LabelGraphics
              text={c.eventType}
              font={LABEL_FONT}
              fillColor={Color.RED}
              style={LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              outlineColor={Color.BLACK}
              verticalOrigin={VerticalOrigin.BOTTOM}
              pixelOffset={{ x: 0, y: LABEL_OFFSET_Y } as any}
              scaleByDistance={LABEL_SCALE}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 1_000_000)}
            />
          </Entity>
        );
      })}
    </>
  );
});

ConflictLayer.displayName = 'ConflictLayer';

// ═════════════════════════════════════════════════════════════════════════════
// 8. NewsLayer — geo-tagged news items with pin + headline
// ═════════════════════════════════════════════════════════════════════════════

const PIN_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#E8E0D0"/><circle cx="12" cy="12" r="5" fill="#0C0B0A"/></svg>`)}`;

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '\u2026';
}

export const NewsLayer: React.FC<{ data: NewsItem[] }> = React.memo(({ data }) => {
  return (
    <>
      {data.filter((n): n is NewsItem & { lat: number; lon: number } => n.lat != null && n.lon != null).map((n) => {
        const position = Cartesian3.fromDegrees(n.lon, n.lat, 0);

        return (
          <Entity
            key={n.id}
            position={position}
            name={n.title}
            description={`Source: ${n.source}<br/>Category: ${n.category}<br/>Published: ${n.publishedAt}<br/>Sentiment: ${n.sentiment}<br/><a href="${n.url}" target="_blank">Read article</a>`}
          >
            <BillboardGraphics
              image={PIN_SVG}
              width={20}
              height={30}
              verticalOrigin={VerticalOrigin.BOTTOM}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 2_000_000)}
            />
            <LabelGraphics
              text={truncate(n.title, 40)}
              font={LABEL_FONT}
              fillColor={Color.fromCssColorString('#E8E0D0')}
              style={LabelStyle.FILL_AND_OUTLINE}
              outlineWidth={2}
              outlineColor={Color.BLACK}
              verticalOrigin={VerticalOrigin.BOTTOM}
              pixelOffset={{ x: 14, y: -10 } as any}
              scaleByDistance={LABEL_SCALE}
              distanceDisplayCondition={new DistanceDisplayCondition(0, 800_000)}
            />
          </Entity>
        );
      })}
    </>
  );
});

NewsLayer.displayName = 'NewsLayer';
