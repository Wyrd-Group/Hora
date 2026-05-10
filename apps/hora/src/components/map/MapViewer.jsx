import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePerformanceStore } from '../../store/performanceStore';
import Map from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, TextLayer, ColumnLayer, IconLayer, PathLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import { polygonToCells } from 'h3-js';
import { useEmpireStore } from '../../store/empireStore';
import { useMatchStore } from '../../store/matchStore';
import { useLivingWorldStore } from '../../store/livingWorldStore';
import VentureFounderPanel from './VentureFounderPanel';
import VentureCard from './VentureCard';
import TrendingVentures from './TrendingVentures';
import { useGovernmentLayers } from './GovernmentLayer';
import { analyzeMapVision, isOllamaAvailable, isVisionCapable } from '../../lib/engines/gemmaOllamaBridge';
import MapIntelFeed from './MapIntelFeed';
import { WorldTrafficSimulator, VEHICLE_EMOJI, VEHICLE_COLORS, getFullRoutePath, getRouteSplit, ALL_CORRIDORS } from '../../lib/worldTrafficSimulator';
import { useSportsMapLayers, SportsMapOverlay } from './SportsMapLayer';
import { useWorldSportsStore } from '../../store/worldSportsStore';
import MapMatchViewer from './MapMatchViewer';

// HTML-safe emoji for the vehicle inspection popup (DeckGL uses ASCII glyphs on the map)
const VEHICLE_POPUP_EMOJI = { ship: '🚢', plane: '✈️', truck: '🚛', train: '🚂', car: '🚗' };

// ── Vehicle SVG Icons as data URIs (works with deck.gl IconLayer) ──
function makeSvgDataUri(svgBody, size = 64) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${svgBody}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// All shapes drawn white, pointing UP — mask:true tints them with getColor
const VEHICLE_SVG_URIS = {
  plane: makeSvgDataUri(`<path d="M32 4 L29 14 L29 26 L10 36 L10 40 L29 34 L29 46 L22 52 L22 56 L29 51 L32 54 L35 51 L42 56 L42 52 L35 46 L35 34 L54 40 L54 36 L35 26 L35 14 Z" fill="white"/>`),
  ship: makeSvgDataUri(`<path d="M32 8 L24 20 L24 50 L26 56 L38 56 L40 50 L40 20 Z" fill="white"/><line x1="26" y1="28" x2="38" y2="28" stroke="rgba(0,0,0,0.3)" stroke-width="1"/><line x1="26" y1="36" x2="38" y2="36" stroke="rgba(0,0,0,0.3)" stroke-width="1"/><line x1="26" y1="44" x2="38" y2="44" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>`),
  truck: makeSvgDataUri(`<rect x="26" y="10" width="12" height="14" rx="2" fill="white"/><rect x="24" y="26" width="16" height="28" rx="2" fill="white"/><line x1="23" y1="48" x2="41" y2="48" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>`),
  train: makeSvgDataUri(`<polygon points="32,6 26,16 26,56 38,56 38,16" fill="white"/><polygon points="32,2 26,16 38,16" fill="white"/><rect x="28" y="18" width="8" height="5" fill="rgba(0,0,0,0.3)"/>`),
  car: makeSvgDataUri(`<rect x="26" y="16" width="12" height="32" rx="5" fill="white"/><rect x="28" y="20" width="8" height="5" fill="rgba(0,0,0,0.25)"/><rect x="28" y="39" width="8" height="4" fill="rgba(0,0,0,0.25)"/>`)
};

// Pre-build the getIcon return objects (deck.gl caches by url)
const VEHICLE_ICON_DEFS = {};
for (const type of Object.keys(VEHICLE_SVG_URIS)) {
  VEHICLE_ICON_DEFS[type] = {
    url: VEHICLE_SVG_URIS[type],
    width: 64,
    height: 64,
    anchorY: 32,
    mask: true,
  };
}

const INITIAL_VIEW_STATE = {
  longitude: 20,
  latitude: 30,
  zoom: 2.2,
  pitch: 45,
  bearing: 0,
};

// OpenStreetMap-backed vector tiles via MapTiler (free, no key needed for this style)
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const OWNER_COLOR_RGB = {
  player: [16, 185, 129],
  market: [239, 68, 68],
  rival:  [245, 158, 11],
};

const OWNER_COLOR = {
  player: [...OWNER_COLOR_RGB.player, 255],
  market: [...OWNER_COLOR_RGB.market, 255],
  rival:  [...OWNER_COLOR_RGB.rival, 255],
};

const ROUTE_COLOR = {
  sea:   [14, 165, 233, 200],
  rail:  [167, 139, 250, 200],
  air:   [244, 114, 182, 200],
  truck: [251, 191, 36, 200],
};

const SECTOR_EMOJI = {
  finance:       '🏦',
  tech:          '💻',
  manufacturing: '🏭',
  energy:        '⚡',
  oil_gas:       '🛢️',
  defense:       '🛡️',
  pharma:        '🔬',
  healthcare:    '🏥',
  education:     '🎓',
  cultural:      '🏛️',
  hospitality:   '🏨',
  venue:         '🏪',
  retail:        '🛍️'
};

// Living World route colors
const WORLD_ROUTE_COLOR = {
  supply_chain:  [14, 165, 233],   // sky blue
  partnership:   [167, 139, 250],  // purple
  franchise:     [251, 191, 36],   // amber
  distribution:  [16, 185, 129],   // emerald
};

// World event colors by type
const EVENT_COLOR = {
  boom:        [16, 185, 129],  // green
  opportunity: [14, 165, 233],  // blue
  bust:        [239, 68, 68],   // red
  crisis:      [239, 68, 68],   // red
  disruption:  [245, 158, 11],  // amber
};

// Helper: get viewport bounding box as [west, south, east, north]
function getViewportBounds(viewState) {
  const { longitude, latitude, zoom } = viewState;
  const degreesPerPixel = 360 / (512 * Math.pow(2, zoom));
  const halfWidth = degreesPerPixel * 600;  // approximate half viewport
  const halfHeight = degreesPerPixel * 400;
  return [
    longitude - halfWidth,
    Math.max(-85, latitude - halfHeight),
    longitude + halfWidth,
    Math.min(85, latitude + halfHeight),
  ];
}

// Helper: viewport bounds to H3 cells
function viewportToH3Cells(viewState, resolution = 5) {
  const [w, s, e, n] = getViewportBounds(viewState);
  const polygon = [[w, s], [e, s], [e, n], [w, n], [w, s]];
  try {
    return polygonToCells(polygon, resolution, true);
  } catch {
    return [];
  }
}

// Inject Apple Maps-style OSM 3D building extrusions into MapLibre
function inject3DBuildings(map) {
  if (!map || map.getLayer('3d-buildings')) return;

  if (!map.isStyleLoaded()) {
    map.once('styledata', () => inject3DBuildings(map));
    return;
  }

  const layers = map.getStyle()?.layers ?? [];
  let firstSymbolId;
  for (const layer of layers) {
    if (layer.type === 'symbol') { firstSymbolId = layer.id; break; }
  }

  if (!map.getSource('osm-buildings')) {
    map.addSource('osm-buildings', {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    });
  }

  map.addLayer(
    {
      id: '3d-buildings',
      source: 'osm-buildings',
      'source-layer': 'building',
      type: 'fill-extrusion',
      minzoom: 13,
      paint: {
        'fill-extrusion-color': [
          'interpolate', ['linear'], ['get', 'render_height'],
          0,   '#0d1b2a',
          50,  '#1a2a3a',
          100, '#162032',
          200, '#0a1628',
        ],
        'fill-extrusion-height': [
          'interpolate', ['linear'], ['zoom'],
          13, 0,
          15, ['coalesce', ['get', 'render_height'], 20],
        ],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.72,
      },
    },
    firstSymbolId,
  );
}

const MapViewer = ({ activeLayer = 'CORPORATE' }) => {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const viewportTimerRef = useRef(null);
  const nodeMap = useEmpireStore((s) => s.nodes);
  const matchActive = useMatchStore((s) => s.active);
  const matchColorRgb = useMatchStore((s) => s.myColorRgb);

  const sectorFilter = useEmpireStore(s => s.sectorFilter);
  const setSectorFilter = useEmpireStore(s => s.setSectorFilter);
  const pendingFlyTo = useEmpireStore(s => s.pendingFlyTo);
  const consumeFlyTo = useEmpireStore(s => s.consumeFlyTo);

  // ── External fly-to requests (e.g. from Athena after spawning a node) ──
  useEffect(() => {
    if (pendingFlyTo) {
      setViewState(prev => ({
        ...prev,
        latitude: pendingFlyTo.latitude,
        longitude: pendingFlyTo.longitude,
        zoom: pendingFlyTo.zoom || 6,
        transitionDuration: 2000,
      }));
      consumeFlyTo();
    }
  }, [pendingFlyTo, consumeFlyTo]);

  // ── AEGIS Vision State ──
  const deckRef = useRef(null);
  const [visionAnalysis, setVisionAnalysis] = useState(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);

  // ── World Traffic Simulator ──
  const simulatorRef = useRef(null);
  const [trafficVehicles, setTrafficVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const perfTraffic = usePerformanceStore(s => s.trafficSimulation);
  const trafficEnabled = useEmpireStore(s => s.trafficEnabled) && perfTraffic;

  useEffect(() => {
    if (!trafficEnabled) {
      if (simulatorRef.current) { simulatorRef.current.stop(); simulatorRef.current = null; }
      setTrafficVehicles([]);
      return;
    }
    const sim = new WorldTrafficSimulator();
    simulatorRef.current = sim;
    sim.start((vehicles) => setTrafficVehicles(vehicles));
    return () => sim.stop();
  }, [trafficEnabled]);

  // ── World Sports Integration ──
  const sportsEnabled = useEmpireStore(s => s.sportsEnabled);
  const setSportsEnabled = useEmpireStore(s => s.setSportsEnabled);
  const initAllLeagues = useWorldSportsStore(s => s.initAllLeagues);
  const processGameTick = useWorldSportsStore(s => s.processGameTick);
  const liveMatchesOnMap = useWorldSportsStore(s => s.liveMatchesOnMap);
  const gameTick = useEmpireStore(s => s.gameTick);

  // Initialize world sports leagues on first mount
  useEffect(() => {
    const seasons = useWorldSportsStore.getState().leagueSeasons;
    if (!seasons || Object.keys(seasons).length === 0) {
      initAllLeagues(0);
    }
  }, []);

  // Process sports fixtures on each game tick
  useEffect(() => {
    if (gameTick > 0) {
      processGameTick(gameTick);
    }
  }, [gameTick]);

  // Sports venue click state
  const [selectedSportsVenue, setSelectedSportsVenue] = useState(null);
  const handleVenueClick = useCallback((venue) => setSelectedSportsVenue(venue), []);
  const handleCloseVenue = useCallback(() => setSelectedSportsVenue(null), []);
  const [watchingMapMatch, setWatchingMapMatch] = useState(null);
  const handleWatchMatch = useCallback((match) => {
    setSelectedSportsVenue(null);
    setWatchingMapMatch(match);
  }, []);

  // Living World Store
  const worldNodes = useLivingWorldStore(s => s.worldNodes);
  const worldRoutes = useLivingWorldStore(s => s.worldRoutes);
  const activeEvents = useLivingWorldStore(s => s.activeEvents);
  const loadViewport = useLivingWorldStore(s => s.loadViewport);
  const subscribeLW = useLivingWorldStore(s => s.subscribe);
  const openFounderPanel = useLivingWorldStore(s => s.openFounderPanel);
  const selectVenture = useLivingWorldStore(s => s.selectVenture);

  // Subscribe to realtime on mount
  useEffect(() => {
    const unsub = subscribeLW();
    return unsub;
  }, [subscribeLW]);

  // Debounced viewport-based H3 loading
  useEffect(() => {
    if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    viewportTimerRef.current = setTimeout(() => {
      const cells = viewportToH3Cells(viewState);
      if (cells.length > 0 && cells.length < 5000) {
        loadViewport(cells);
      }
    }, 500);
    return () => { if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current); };
  }, [viewState.longitude, viewState.latitude, viewState.zoom, loadViewport]);

  const nodes = useMemo(() => {
    return Object.values(nodeMap)
      .filter(n => sectorFilter === 'all' || n.type === sectorFilter)
      .map((n) => ({ ...n, position: [n.lon, n.lat] }));
  }, [nodeMap, sectorFilter]);

  const routes    = useEmpireStore((s) => s.routes);
  const transportCompanies = useEmpireStore((s) => s.transportCompanies);
  const storeShowRoutes = useEmpireStore((s) => s.showRoutes);
  const showRoutes = storeShowRoutes || activeLayer === 'ROUTES';
  const selectNode = useEmpireStore((s) => s.selectNode);

  const getDynamicColor = useCallback((d) => {
    if (activeLayer === 'THREATS') {
      const hash = (d.id.charCodeAt(0) * 17 + d.id.charCodeAt(Math.min(1, d.id.length-1)) * 31) % 100;
      return hash > 70 ? [239, 68, 68, 255] : [60, 20, 20, 180];
    }
    if (activeLayer === 'SENTIMENT') {
      const hash = (d.id.charCodeAt(2) * 23 + d.id.charCodeAt(Math.min(3, d.id.length-1)) * 37) % 100;
      if (hash > 65) return [16, 185, 129, 255];
      if (hash < 35) return [239, 68, 68, 255];
      return [100, 100, 100, 200];
    }
    if (activeLayer === 'ESG') {
      const hash = (d.id.charCodeAt(1) * 19 + d.id.charCodeAt(Math.min(4, d.id.length-1)) * 41) % 100;
      if (hash > 70) return [16, 185, 129, 255];
      if (hash > 40) return [245, 158, 11, 255];
      return [100, 100, 100, 200];
    }
    // In match mode, player nodes use chosen color
    const playerRgb = matchActive ? matchColorRgb : OWNER_COLOR_RGB.player;
    if (activeLayer === 'ROUTES') {
      const ownerRgb = d.owner === 'player' ? playerRgb : (OWNER_COLOR_RGB[d.owner] || [100,100,100]);
      return [...ownerRgb, 40];
    }
    const ownerRgb = d.owner === 'player' ? playerRgb : (OWNER_COLOR_RGB[d.owner] || [100,100,100]);
    return [...ownerRgb, 255];
  }, [activeLayer, matchActive, matchColorRgb]);

  const handleClick = useCallback(
    ({ object }) => {
      if (object?._isWorldNode) {
        selectVenture(object.id);
        return;
      }
      selectNode(object?.id ?? null);
    },
    [selectNode, selectVenture],
  );

  // Right-click on empty space → open founder panel
  const handleContextMenu = useCallback(
    (info) => {
      if (info.object) return; // clicked on an existing object
      const [lng, lat] = info.coordinate || [];
      if (lng != null && lat != null) {
        openFounderPanel(lat, lng);
      }
    },
    [openFounderPanel],
  );

  // Zoom-to callback for TrendingVentures
  const handleZoomTo = useCallback((target) => {
    setViewState(prev => ({ ...prev, ...target, transitionDuration: 1000 }));
  }, []);

  // ── AEGIS Vision: capture canvas + analyze ──
  const handleVisionScan = useCallback(async () => {
    if (visionLoading) return;
    setVisionLoading(true);
    setVisionOpen(true);
    setVisionAnalysis(null);

    try {
      // Try to capture the DeckGL/WebGL canvas (may fail without preserveDrawingBuffer)
      let imageBase64 = '';
      try {
        const canvas = deckRef.current?.deck?.canvas || document.querySelector('#deckgl-overlay canvas') || document.querySelector('canvas');
        if (canvas) imageBase64 = canvas.toDataURL('image/png');
      } catch { /* canvas capture failed — text-only mode */ }

      const playerNodes = Object.values(nodeMap).filter(n => n.owner === 'player');
      const rivalNodes = Object.values(nodeMap).filter(n => n.owner !== 'player');
      const allNodes = Object.values(nodeMap);

      // Build structured data for text-only fallback
      const REGION_MAP = (lat, lon) => {
        if (lat > 55) return 'Scandinavia/Nordic';
        if (lat > 45 && lon < 20) return 'Western Europe';
        if (lat > 45) return 'Eastern Europe';
        if (lat > 30 && lon > 25 && lon < 60) return 'Middle East';
        if (lat > 30 && lon > 60) return 'Central/South Asia';
        if (lat > 20 && lon > 90) return 'East Asia';
        if (lat > 0 && lat < 20 && lon > 90) return 'Southeast Asia';
        if (lat > 25 && lon < -60) return 'North America';
        if (lat < 25 && lat > -10 && lon < -30) return 'Central/South America';
        if (lat < -10 && lon < -20) return 'South America';
        if (lat < 35 && lat > 15 && lon > -20 && lon < 40) return 'North Africa';
        if (lat < 15 && lon > -20 && lon < 55) return 'Sub-Saharan Africa';
        return 'Other';
      };

      const result = await analyzeMapVision(imageBase64, {
        playerNodeCount: playerNodes.length,
        totalNodeCount: allNodes.length,
        activeRoutes: routes.filter(r => r.active).length,
        zoomLevel: viewState.zoom,
        centerLat: viewState.latitude,
        centerLng: viewState.longitude,
        activeLayer,
        activeEvents: activeEvents.filter(e => e.expires_at > new Date().toISOString()).map(e => e.title || e.event_type),
        playerNodes: playerNodes.slice(0, 20).map(n => ({
          name: n.name,
          type: n.type,
          region: REGION_MAP(n.lat, n.lon),
          level: n.level || 1,
        })),
        rivalNodes: rivalNodes.slice(0, 15).map(n => ({
          name: n.name,
          type: n.type,
          region: REGION_MAP(n.lat, n.lon),
        })),
        routeSummary: routes.filter(r => r.active).slice(0, 10).map(r => {
          const from = nodeMap[r.fromNodeId];
          const to = nodeMap[r.toNodeId];
          return `${from?.name || '?'} → ${to?.name || '?'} (${r.type}, L${r.level})`;
        }),
      });

      if (result) {
        setVisionAnalysis(result);
      } else {
        // Local fallback — generate strategic intel from structured data without LLM
        const pNodes = Object.values(nodeMap).filter(n => n.owner === 'player');
        const rNodes = Object.values(nodeMap).filter(n => n.owner !== 'player');
        const activeRouteCount = routes.filter(r => r.active).length;
        const typeCount = {};
        pNodes.forEach(n => { typeCount[n.type] = (typeCount[n.type] || 0) + 1; });
        const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
        const regionCount = {};
        pNodes.forEach(n => {
          const r = REGION_MAP(n.lat, n.lon);
          regionCount[r] = (regionCount[r] || 0) + 1;
        });
        const topRegion = Object.entries(regionCount).sort((a, b) => b[1] - a[1])[0];
        const weakRegions = ['East Asia', 'Southeast Asia', 'North America', 'South America', 'Sub-Saharan Africa']
          .filter(r => !regionCount[r]);
        const concentration = topRegion ? ((topRegion[1] / Math.max(pNodes.length, 1)) * 100).toFixed(0) : 0;

        const bullets = [];
        bullets.push(`▸ EMPIRE STATUS: ${pNodes.length} controlled nodes across ${Object.keys(regionCount).length} regions with ${activeRouteCount} active trade routes.`);
        if (topRegion && concentration > 50) {
          bullets.push(`▸ CONCENTRATION RISK: ${concentration}% of assets concentrated in ${topRegion[0]}. Diversification recommended to mitigate regional disruption risk.`);
        }
        if (topType) {
          bullets.push(`▸ SECTOR DOMINANCE: ${topType[0]} sector leads with ${topType[1]} node${topType[1] > 1 ? 's' : ''}. Consider expanding into underrepresented sectors for portfolio balance.`);
        }
        if (weakRegions.length > 0) {
          bullets.push(`▸ EXPANSION OPPORTUNITY: No presence detected in ${weakRegions.slice(0, 2).join(' or ')}. These regions offer untapped growth potential.`);
        }
        if (rNodes.length > pNodes.length * 2) {
          bullets.push(`▸ COMPETITIVE THREAT: Rivals control ${rNodes.length} nodes vs your ${pNodes.length}. Accelerate acquisitions to close the gap.`);
        } else {
          bullets.push(`▸ MARKET POSITION: Favorable positioning with ${pNodes.length} nodes. Maintain momentum through strategic route optimization.`);
        }
        if (activeRouteCount < pNodes.length * 0.5) {
          bullets.push(`▸ SUPPLY CHAIN: Route density is low (${activeRouteCount} routes for ${pNodes.length} nodes). Establish more trade links to maximize node synergy.`);
        }

        setVisionAnalysis(bullets.join('\n\n'));
      }
    } catch (err) {
      setVisionAnalysis(`Vision error: ${err.message}`);
    } finally {
      setVisionLoading(false);
    }
  }, [visionLoading, nodeMap, routes, viewState, activeLayer, activeEvents]);

  // Living World: Prepare world venture nodes for layers
  const worldNodeArray = useMemo(() => {
    return Object.values(worldNodes)
      .filter(n => n.status === 'active')
      .map(n => ({
        ...n,
        position: [n.lng, n.lat],
        _isWorldNode: true,
      }));
  }, [worldNodes]);

  // Living World: Prepare world routes
  const worldRouteArray = useMemo(() => {
    return Object.values(worldRoutes)
      .filter(r => r.traffic_score >= 10)
      .map(r => {
        const from = worldNodes[r.from_node_id];
        const to = worldNodes[r.to_node_id];
        if (!from || !to) return null;
        return {
          ...r,
          sourcePosition: [from.lng, from.lat],
          targetPosition: [to.lng, to.lat],
        };
      })
      .filter(Boolean);
  }, [worldRoutes, worldNodes]);

  // Living World: Prepare active events
  const activeWorldEvents = useMemo(() => {
    const now = new Date().toISOString();
    return activeEvents
      .filter(e => e.expires_at > now)
      .map(e => ({
        ...e,
        position: e.region_h3 ? undefined : [0, 0], // global events placeholder
      }));
  }, [activeEvents]);

  const handleMapLoad = useCallback((evt) => {
    const map = evt.target ?? mapRef.current?.getMap?.();
    if (map) inject3DBuildings(map);
  }, []);

  const zoom = viewState.zoom;
  const governmentLayers = useGovernmentLayers(zoom);
  const sportsLayers = useSportsMapLayers(sportsEnabled, zoom, handleVenueClick);

  // Real world architectural size (Extreme 1:1 realism scaled down from previous Godzilla footprints)
  const BASE_RADIUS = 15; // 15 meters radius (30 meters wide — true building size)
  const ELEVATION_BASE = 15; // 15 meters height per tier

  // LOD Switch Thresholds
  const isCityScale = zoom >= 8; 

  const dynamicLayers = [];

  // Always show radar dots at every zoom level
  dynamicLayers.push(
    new ScatterplotLayer({
      id: 'nodes-radar',
      data: nodes,
      pickable: true,
      antialiasing: true,
      getPosition: d => d.position,
      getFillColor: getDynamicColor,
      getRadius: 800,
      radiusMinPixels: zoom < 3 ? 0.7 : zoom < 5 ? 1.3 : zoom < 8 ? 2 : 2.7,
      radiusMaxPixels: zoom < 3 ? 1.3 : zoom < 5 ? 2.7 : zoom < 8 ? 5.3 : 8,
      onClick: handleClick,
      updateTriggers: { radiusMinPixels: zoom, radiusMaxPixels: zoom },
    })
  );

  if (isCityScale) {
    // LOD: CITY SCALE MODE (True 3D extrusions)
    
    // 1. Finance & Education & Healthcare - Cylinders 
    dynamicLayers.push(new ColumnLayer({
      id: 'nodes-finance',
      data: nodes.filter(n => ['finance', 'education', 'healthcare'].includes(n.type)),
      diskResolution: 24,
      radius: BASE_RADIUS,
      extruded: true,
      pickable: true,
      getPosition: d => d.position,
      getElevation: d => Math.max(10, ELEVATION_BASE * (d.level + 2.5)),
      getFillColor: getDynamicColor,
      onClick: handleClick,
    }));

    // 2. Tech, Venue, Hospitality, Cultural, Retail - Square Obelisks
    dynamicLayers.push(new ColumnLayer({
      id: 'nodes-tech',
      data: nodes.filter(n => ['tech', 'venue', 'cultural', 'hospitality', 'retail'].includes(n.type)),
      diskResolution: 4,
      angle: 45,
      radius: BASE_RADIUS * 1.5,
      extruded: true,
      pickable: true,
      getPosition: d => d.position,
      getElevation: d => Math.max(10, ELEVATION_BASE * (d.level + 1.5)),
      getFillColor: getDynamicColor,
      onClick: handleClick,
    }));

    // 3. Manufacturing, Oil, Energy, Defense, Airport, Port, ESG - Structural Heavy
    dynamicLayers.push(new ColumnLayer({
      id: 'nodes-heavy',
      data: nodes.filter(n => ['manufacturing', 'energy', 'oil_gas', 'defense', 'airport', 'port', 'esg'].includes(n.type)),
      diskResolution: 6,
      radius: BASE_RADIUS * 2.5,
      extruded: true,
      pickable: true,
      getPosition: d => d.position,
      getElevation: d => Math.max(10, ELEVATION_BASE * ((d.level * 0.8) + 0.5)), 
      getFillColor: getDynamicColor,
      onClick: handleClick,
    }));

    // 4. Pharma - Triangular Pyramids
    dynamicLayers.push(new ColumnLayer({
        id: 'nodes-pharma',
        data: nodes.filter(n => n.type === 'pharma'),
        diskResolution: 3,
        radius: BASE_RADIUS * 1.8,
        extruded: true,
        pickable: true,
        getPosition: d => d.position,
        getElevation: d => Math.max(10, ELEVATION_BASE * (d.level + 1)),
        getFillColor: getDynamicColor,
        onClick: handleClick,
    }));

    if (zoom >= 10.5) {
        const getDynamicZ = (d) => {
            if (['finance', 'education', 'healthcare'].includes(d.type)) return ELEVATION_BASE * (d.level + 2.5) + 5;
            if (['tech', 'venue', 'cultural', 'hospitality', 'retail'].includes(d.type)) return ELEVATION_BASE * (d.level + 1.5) + 5;
            if (d.type === 'pharma') return ELEVATION_BASE * (d.level + 1) + 5;
            return ELEVATION_BASE * ((d.level * 0.8) + 0.5) + 5;
        };

        dynamicLayers.push(new TextLayer({
            id: 'empire-node-emoji',
            data: nodes,
            getPosition: (d) => [d.position[0], d.position[1], getDynamicZ(d)],
            getText: (d) => SECTOR_EMOJI[d.type] ?? '📍',
            getSize: 16, 
            getPixelOffset: [0, -10],
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'bottom',
            pickable: false,
        }));
        
        dynamicLayers.push(new TextLayer({
            id: 'empire-node-labels',
            data: nodes.filter((n) => n.owner === 'player' || n.canBeRenamed),
            getPosition: (d) => [d.position[0], d.position[1], getDynamicZ(d)],
            getText: (d) => d.name,
            getSize: 10,
            getColor: [255, 255, 255, 230],
            getPixelOffset: [0, -32],
            fontFamily: 'monospace',
            pickable: false,
        }));
    }
  }

  const activeRoutes = useMemo(() => {
    if (!showRoutes) return [];
    return routes
      .filter((r) => r.active)
      .map((r) => {
        // Use node coordinates if available, otherwise fall back to corridor coordinates
        const fromNode = nodeMap[r.fromNodeId];
        const toNode = nodeMap[r.toNodeId];
        const sourceLon = fromNode ? fromNode.lon : r.fromLon;
        const sourceLat = fromNode ? fromNode.lat : r.fromLat;
        const targetLon = toNode ? toNode.lon : r.toLon;
        const targetLat = toNode ? toNode.lat : r.toLat;

        // Skip routes where we can't determine coordinates
        if (sourceLon == null || sourceLat == null || targetLon == null || targetLat == null) return null;

        return {
          ...r,
          sourcePosition: [sourceLon, sourceLat],
          targetPosition: [targetLon, targetLat],
        };
      })
      .filter(Boolean);
  }, [routes, showRoutes, nodeMap]);

  const routeLayer = showRoutes
    ? new ArcLayer({
        id: 'empire-trade-routes',
        data: activeRoutes,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: (d) => ROUTE_COLOR[d.type] ?? [100, 100, 100, 200],
        getTargetColor: (d) => ROUTE_COLOR[d.type] ?? [100, 100, 100, 200],
        getWidth: 2,
        greatCircle: true,
      })
    : null;

  // ── Living World Layers ──

  // 1. World Ventures Radar (zoom < 8): cyan dots, pulsing if new
  const worldVenturesRadar = !isCityScale && worldNodeArray.length > 0
    ? new ScatterplotLayer({
        id: 'world-ventures-radar',
        data: worldNodeArray,
        pickable: true,
        getPosition: d => d.position,
        getFillColor: d => {
          const ageMs = Date.now() - new Date(d.created_at).getTime();
          const isNew = ageMs < 3_600_000; // < 1 hour
          return isNew ? [0, 229, 255, 255] : [0, 229, 255, 160];
        },
        getRadius: d => {
          const ageMs = Date.now() - new Date(d.created_at).getTime();
          return ageMs < 3_600_000 ? 1200 : 600;
        },
        radiusMinPixels: zoom < 3 ? 2 : zoom < 5 ? 3 : 5,
        radiusMaxPixels: zoom < 3 ? 5 : zoom < 5 ? 12 : 20,
        onClick: handleClick,
        updateTriggers: { radiusMinPixels: zoom, radiusMaxPixels: zoom },
      })
    : null;

  // 2. World Ventures 3D (zoom >= 8): columns with height by investor_count
  const worldVentures3D = isCityScale && worldNodeArray.length > 0
    ? new ColumnLayer({
        id: 'world-ventures-3d',
        data: worldNodeArray,
        diskResolution: 12,
        radius: BASE_RADIUS * 1.2,
        extruded: true,
        pickable: true,
        getPosition: d => d.position,
        getElevation: d => Math.max(10, 10 + d.investor_count * 3),
        getFillColor: [0, 229, 255, 200],
        onClick: handleClick,
      })
    : null;

  // 3. World Supply Chains: arcs between ventures
  const worldSupplyChainLayer = worldRouteArray.length > 0
    ? new ArcLayer({
        id: 'world-supply-chains',
        data: worldRouteArray,
        getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition,
        getSourceColor: d => [...(WORLD_ROUTE_COLOR[d.route_type] || [100, 100, 100]), 180],
        getTargetColor: d => {
          const base = WORLD_ROUTE_COLOR[d.route_type] || [100, 100, 100];
          return [Math.min(255, base[0] + 60), Math.min(255, base[1] + 40), base[2], 220];
        },
        getWidth: d => Math.max(1, Math.log2(d.traffic_score + 1)),
        greatCircle: true,
      })
    : null;

  // 4. World Events Overlay (zoom < 6): hexagon aggregation
  const worldEventsWithCoords = activeWorldEvents.filter(e => e.region_h3);
  const worldEventsOverlay = zoom < 6 && worldEventsWithCoords.length > 0
    ? new ScatterplotLayer({
        id: 'world-events-overlay',
        data: worldEventsWithCoords.map(e => ({
          ...e,
          // Use a rough center for the H3 cell
          position: [0, 0], // will be computed if we have lat/lng
        })),
        getPosition: d => d.position,
        getFillColor: d => [...(EVENT_COLOR[d.event_type] || [100, 100, 100]), Math.round(d.severity * 200)],
        getRadius: 50000,
        radiusMinPixels: 8,
        radiusMaxPixels: 30,
      })
    : null;

  // 5. World Event Markers (zoom >= 6): icon markers
  const worldEventMarkers = zoom >= 6 && worldEventsWithCoords.length > 0
    ? new TextLayer({
        id: 'world-event-markers',
        data: worldEventsWithCoords,
        getPosition: d => d.position || [0, 0],
        getText: d => {
          const icons = { boom: '📈', bust: '📉', disruption: '⚠️', opportunity: '💡', crisis: '🔥' };
          return icons[d.event_type] || '📌';
        },
        getSize: 20,
        getPixelOffset: [0, -15],
        pickable: true,
      })
    : null;

  // ── Living World Traffic Layers ──
  const trafficLayers = useMemo(() => {
    if (!trafficEnabled || trafficVehicles.length === 0) return [];

    const result = [];

    // Filter vehicles by zoom level for performance
    const visibleVehicles = trafficVehicles.filter(v => {
      if (v.type === 'car') return zoom >= 8;        // Cars at city scale
      if (v.type === 'truck') return zoom >= 5;      // Trucks at regional+
      if (v.type === 'train') return zoom >= 5;      // Trains at regional+
      return true;                                    // Ships & planes always visible
    });

    if (visibleVehicles.length === 0) return [];

    // Base dot layer — always visible, acts as reliable clickable target
    result.push(new ScatterplotLayer({
      id: 'traffic-vehicles-dots',
      data: visibleVehicles,
      pickable: true,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => {
        if (d.flagged) return [239, 68, 68, 255];
        if (d.status === 'emergency') return [239, 68, 68, 255];
        if (d.status === 'delayed') return [245, 158, 11, 255];
        if (d.owner === 'Player Fleet') return [16, 185, 129, 255];
        return VEHICLE_COLORS[d.type] || [255, 255, 255, 180];
      },
      getRadius: d => {
        if (d.type === 'ship') return 4000;
        if (d.type === 'plane') return 3000;
        if (d.type === 'truck') return 2000;
        if (d.type === 'train') return 2500;
        return 800;
      },
      radiusMinPixels: zoom < 5 ? 1 : zoom < 8 ? 1.5 : 2,
      radiusMaxPixels: zoom < 5 ? 2 : zoom < 8 ? 3 : 4,
      onClick: ({ object }) => { if (object) setSelectedVehicle(object); },
      updateTriggers: {
        getFillColor: [zoom],
        radiusMinPixels: [zoom],
        radiusMaxPixels: [zoom],
      },
    }));

    // Icon layer on top — shaped vehicle silhouettes via SVG data URIs
    result.push(new IconLayer({
      id: 'traffic-vehicle-icons',
      data: visibleVehicles,
      pickable: true,
      getIcon: d => VEHICLE_ICON_DEFS[d.type] || VEHICLE_ICON_DEFS.car,
      getPosition: d => [d.lng, d.lat],
      getColor: d => {
        if (d.flagged) return [239, 68, 68, 255];
        if (d.status === 'emergency') return [239, 68, 68, 255];
        if (d.status === 'delayed') return [245, 158, 11, 255];
        if (d.owner === 'Player Fleet') return [16, 185, 129, 255];
        return VEHICLE_COLORS[d.type] || [255, 255, 255, 180];
      },
      getAngle: d => 360 - (d.heading || 0),
      getSize: d => {
        if (d.type === 'plane') return zoom < 4 ? 7 : zoom < 7 ? 11 : 14;
        if (d.type === 'ship') return zoom < 4 ? 7 : zoom < 7 ? 9 : 13;
        if (d.type === 'train') return zoom < 6 ? 6 : zoom < 9 ? 9 : 11;
        if (d.type === 'truck') return zoom < 6 ? 5 : zoom < 9 ? 8 : 11;
        return zoom < 10 ? 5 : 7;
      },
      sizeUnits: 'pixels',
      sizeScale: 1,
      billboard: true,
      onClick: ({ object }) => { if (object) setSelectedVehicle(object); },
      updateTriggers: {
        getSize: [zoom],
        getColor: [zoom],
        getAngle: [trafficVehicles.length],
      },
    }));

    // Callsign labels at high zoom
    if (zoom >= 9) {
      result.push(new TextLayer({
        id: 'traffic-callsigns',
        data: visibleVehicles.filter(v => v.type !== 'car' || zoom >= 13),
        getPosition: d => [d.lng, d.lat],
        getText: d => d.callsign,
        getSize: 9,
        getColor: d => {
          const c = VEHICLE_COLORS[d.type] || [255, 255, 255, 180];
          return [c[0], c[1], c[2], 180];
        },
        getPixelOffset: [0, -20],
        fontFamily: 'monospace',
        fontWeight: 'bold',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        pickable: false,
        billboard: true,
      }));
    }

    return result;
  }, [trafficVehicles, trafficEnabled, zoom]);

  // ── Selected Vehicle Route Layers (FlightRadar-style) ──
  const selectedRouteLayers = useMemo(() => {
    if (!selectedVehicle || !trafficEnabled) return [];
    const layers = [];
    const color = VEHICLE_COLORS[selectedVehicle.type] || [255, 255, 255, 180];
    const { completed, remaining } = getRouteSplit(selectedVehicle);

    // Glow layer (wider, lower opacity)
    if (completed.length >= 2) {
      layers.push(new PathLayer({
        id: 'vehicle-route-glow',
        data: [{ path: getFullRoutePath(selectedVehicle) }],
        getPath: d => d.path,
        getColor: [...color.slice(0, 3), 40],
        getWidth: 6,
        widthMinPixels: 3,
        widthMaxPixels: 10,
        jointRounded: true,
        capRounded: true,
        billboard: false,
      }));
    }

    // Completed path — solid bright
    if (completed.length >= 2) {
      layers.push(new PathLayer({
        id: 'vehicle-route-completed',
        data: [{ path: completed }],
        getPath: d => d.path,
        getColor: [...color.slice(0, 3), 220],
        getWidth: 2.5,
        widthMinPixels: 1.5,
        widthMaxPixels: 5,
        jointRounded: true,
        capRounded: true,
        billboard: false,
      }));
    }

    // Remaining path — dimmer, thinner
    if (remaining.length >= 2) {
      layers.push(new PathLayer({
        id: 'vehicle-route-remaining',
        data: [{ path: remaining }],
        getPath: d => d.path,
        getColor: [...color.slice(0, 3), 80],
        getWidth: 1.5,
        widthMinPixels: 1,
        widthMaxPixels: 3,
        jointRounded: true,
        capRounded: true,
        billboard: false,
      }));
    }

    // Origin marker
    const wp = selectedVehicle.waypoints || [[selectedVehicle.fromLng, selectedVehicle.fromLat], [selectedVehicle.toLng, selectedVehicle.toLat]];
    layers.push(new ScatterplotLayer({
      id: 'vehicle-route-endpoints',
      data: [
        { position: wp[0], label: 'origin' },
        { position: wp[wp.length - 1], label: 'dest' },
      ],
      getPosition: d => d.position,
      getFillColor: d => d.label === 'origin' ? [16, 185, 129, 200] : [239, 68, 68, 200],
      getRadius: 6000,
      radiusMinPixels: 4,
      radiusMaxPixels: 10,
      stroked: true,
      getLineColor: [255, 255, 255, 150],
      lineWidthMinPixels: 1,
    }));

    // Current position highlight (pulsing dot)
    layers.push(new ScatterplotLayer({
      id: 'vehicle-route-current-pos',
      data: [selectedVehicle],
      getPosition: d => [d.lng, d.lat],
      getFillColor: [...color.slice(0, 3), 255],
      getRadius: 8000,
      radiusMinPixels: 5,
      radiusMaxPixels: 12,
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      lineWidthMinPixels: 2,
    }));

    return layers;
  }, [selectedVehicle, trafficEnabled]);

  // ── Background Route Network (faint corridors when traffic enabled) ──
  const backgroundRouteLayers = useMemo(() => {
    if (!trafficEnabled || selectedVehicle) return [];
    if (zoom > 6) return []; // only show at global scale

    const allRoutes = [
      ...ALL_CORRIDORS.sea.map((c, i) => ({ path: c, type: 'sea', id: `bg-sea-${i}` })),
      ...ALL_CORRIDORS.air.map((c, i) => ({ path: c, type: 'air', id: `bg-air-${i}` })),
    ];

    return [new PathLayer({
      id: 'background-route-network',
      data: allRoutes,
      getPath: d => d.path,
      getColor: d => d.type === 'sea' ? [14, 165, 233, 18] : [244, 114, 182, 14],
      getWidth: 1,
      widthMinPixels: 0.5,
      widthMaxPixels: 2,
      jointRounded: true,
      billboard: false,
    })];
  }, [trafficEnabled, selectedVehicle, zoom]);

  // ── Player Transport Company Routes ──
  const playerTransportRoutes = useMemo(() => {
    if (!transportCompanies || transportCompanies.length === 0) return [];
    const allRoutes = transportCompanies.flatMap(tc => tc.routes.filter(r => r.active).map(r => ({ ...r, companyName: tc.name, companyType: tc.type })));
    if (allRoutes.length === 0) return [];

    const typeColors = { airline: [16, 185, 129, 180], shipping: [14, 165, 233, 180], rail: [167, 139, 250, 180] };

    return [
      new ArcLayer({
        id: 'player-transport-routes',
        data: allRoutes,
        getSourcePosition: d => d.fromCoords,
        getTargetPosition: d => d.toCoords,
        getSourceColor: d => typeColors[d.companyType] || [255, 255, 255, 120],
        getTargetColor: d => typeColors[d.companyType] || [255, 255, 255, 120],
        getWidth: 2,
        widthMinPixels: 1,
        widthMaxPixels: 4,
        greatCircle: true,
        numSegments: 60,
        pickable: true,
        onClick: ({ object }) => {
          if (object) {
            // Could show route details popup
          }
        },
      }),
    ];
  }, [transportCompanies]);

  const layers = [...governmentLayers, routeLayer, worldSupplyChainLayer, ...dynamicLayers, ...backgroundRouteLayers, ...playerTransportRoutes, ...trafficLayers, ...selectedRouteLayers, worldVenturesRadar, worldVentures3D, worldEventsOverlay, worldEventMarkers, ...sportsLayers].filter(Boolean);

  return (
    <div className="absolute inset-0 z-0 bg-[#060a12] overflow-hidden">
      
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState: nextViewState }) => setViewState(nextViewState)}
        controller={true}
        layers={layers}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        getTooltip={() => null}
        useDevicePixels={false}
        _gl={{ preserveDrawingBuffer: true }}
        deviceProps={{ type: 'webgl' }}
      >
        <Map
          ref={mapRef}
          mapStyle={MAP_STYLE}
          onLoad={handleMapLoad}
        />
      </DeckGL>
      <VentureFounderPanel />
      <VentureCard />
      <TrendingVentures onZoomTo={handleZoomTo} />
      <MapIntelFeed />

      {/* ── Vehicle Inspection Popup ── */}
      {selectedVehicle && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 w-[360px]
          rounded-lg bg-[rgba(12,11,10,0.96)] border border-[rgba(232,224,208,0.12)]
          backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(232,224,208,0.08)]">
            <div className="flex items-center gap-2">
              <span className="text-lg">{VEHICLE_POPUP_EMOJI[selectedVehicle.type]}</span>
              <div>
                <div className="text-[#E8E0D0] text-[11px] font-mono font-semibold">{selectedVehicle.callsign}</div>
                <div className="text-[9px] text-[#9C8E7E] font-mono">{selectedVehicle.owner}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                selectedVehicle.status === 'moving' ? 'text-emerald-400 border-emerald-500/30' :
                selectedVehicle.status === 'emergency' ? 'text-red-500 border-red-500/50 animate-pulse' :
                selectedVehicle.status === 'delayed' ? 'text-amber-400 border-amber-500/30' :
                'text-sky-400 border-sky-500/30'
              }`}>
                {selectedVehicle.status}
              </span>
              <button
                onClick={() => setSelectedVehicle(null)}
                aria-label="Close vehicle details"
                className="text-[#9C8E7E] hover:text-[#E8E0D0] text-xs transition-colors"
              >✕</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-[rgba(232,224,208,0.04)]">
            {[
              ['ROUTE', `${selectedVehicle.origin} → ${selectedVehicle.destination}`],
              ['CARGO', selectedVehicle.cargo],
              ['WEIGHT', selectedVehicle.cargoWeight],
              ['VALUE', selectedVehicle.value],
              ['SPEED', `${Math.round(selectedVehicle.speed)} km/h`],
              ['HEADING', `${Math.round(selectedVehicle.heading)}°`],
              ['FUEL', `${Math.round(selectedVehicle.fuel)}%`],
              ['CREW', `${selectedVehicle.crewSize}`],
              ['FLAG', `${selectedVehicle.flag}`],
              ['ETA', selectedVehicle.estimatedArrival],
              ['TEMP', `${Math.round(selectedVehicle.temperature)}°C`],
              ['INSURED', selectedVehicle.insured ? 'YES' : 'NO'],
            ].map(([label, val]) => (
              <div key={label} className="px-2.5 py-1.5 bg-[rgba(12,11,10,0.8)]">
                <div className="text-[8px] text-[#9C8E7E] font-mono">{label}</div>
                <div className="text-[10px] text-[#E8E0D0] font-mono truncate">{val}</div>
              </div>
            ))}
          </div>

          {(selectedVehicle.hazmat || selectedVehicle.flagged) && (
            <div className="px-3 py-1.5 border-t border-[rgba(232,224,208,0.06)] flex gap-2">
              {selectedVehicle.hazmat && (
                <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">HAZMAT</span>
              )}
              {selectedVehicle.flagged && (
                <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">FLAGGED — UNDER SURVEILLANCE</span>
              )}
            </div>
          )}

          {selectedVehicle.type === 'plane' && (
            <div className="px-3 py-1 border-t border-[rgba(232,224,208,0.06)]">
              <span className="text-[9px] text-[#9C8E7E] font-mono">ALTITUDE: {Math.round(selectedVehicle.altitude).toLocaleString()}m ({Math.round(selectedVehicle.altitude * 3.281).toLocaleString()}ft)</span>
            </div>
          )}
        </div>
      )}

      {/* ── Sports Map Overlay (venues + live matches) — toggle lives in Layers panel ── */}
      <SportsMapOverlay
        enabled={sportsEnabled}
        onToggle={() => setSportsEnabled(!sportsEnabled)}
        liveMatches={liveMatchesOnMap}
        selectedVenue={selectedSportsVenue}
        onCloseVenue={handleCloseVenue}
        onWatchMatch={handleWatchMatch}
      />

      {/* ── Map Match Viewer Modal ── */}
      {watchingMapMatch && (
        <MapMatchViewer
          match={watchingMapMatch}
          onClose={() => setWatchingMapMatch(null)}
        />
      )}

      {/* ── AEGIS Vision Button ── */}
      {isOllamaAvailable() && (
        <button
          onClick={handleVisionScan}
          disabled={visionLoading}
          className="absolute bottom-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg
            bg-[rgba(24,22,18,0.9)] border border-[rgba(232,224,208,0.15)]
            backdrop-blur-md text-[#E8E0D0] text-xs font-mono
            hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)]
            transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          title="AEGIS Vision — AI map analysis"
        >
          <span className={`text-cyan-400 ${visionLoading ? 'animate-pulse' : ''}`}>
            {visionLoading ? '◉' : '◎'}
          </span>
          <span>AEGIS VISION</span>
          {isVisionCapable() && (
            <span className="text-[10px] text-cyan-500/60 ml-1">IMG</span>
          )}
        </button>
      )}

      {/* ── AEGIS Vision Analysis Panel ── */}
      {visionOpen && (
        <div className="absolute bottom-32 right-4 z-50 w-80 max-h-[50vh] overflow-y-auto
          rounded-lg bg-[rgba(12,11,10,0.95)] border border-[rgba(232,224,208,0.12)]
          backdrop-blur-xl shadow-[0_0_30px_rgba(0,229,255,0.08)]"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(232,224,208,0.08)]">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-sm">◎</span>
              <span className="text-[#E8E0D0] text-xs font-mono font-semibold tracking-wide">
                GEOSPATIAL INTELLIGENCE
              </span>
            </div>
            <button
              onClick={() => setVisionOpen(false)}
              className="text-[#9C8E7E] hover:text-[#E8E0D0] text-xs transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-3">
            {visionLoading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                <span className="text-[#9C8E7E] text-xs font-mono animate-pulse">
                  Analyzing strategic map view...
                </span>
              </div>
            ) : visionAnalysis ? (
              <div className="text-[#E8E0D0] text-xs font-mono leading-relaxed whitespace-pre-wrap">
                {visionAnalysis}
              </div>
            ) : null}
          </div>

          {!visionLoading && visionAnalysis && (
            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={handleVisionScan}
                className="flex-1 py-1.5 rounded text-[10px] font-mono text-cyan-400
                  border border-cyan-500/20 hover:bg-cyan-500/10 transition-colors"
              >
                RESCAN
              </button>
              <button
                onClick={() => { setVisionOpen(false); setVisionAnalysis(null); }}
                className="flex-1 py-1.5 rounded text-[10px] font-mono text-[#9C8E7E]
                  border border-[rgba(232,224,208,0.08)] hover:bg-white/5 transition-colors"
              >
                DISMISS
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapViewer;
