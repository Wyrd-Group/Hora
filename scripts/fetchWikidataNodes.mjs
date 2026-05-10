import fs from 'fs';
import path from 'path';

const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";

const HEADERS = {
  "Accept": "application/sparql-results+json",
  "User-Agent": "QuanticoEmpireBot/3.0 (alec@contact.com)" 
};

const generateId = () => `node-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;

// Hard bounds for Tier-1 generation
const CITIES = [
  { name: "New York",   bounds: { minLat: 40.70, maxLat: 40.80, minLon: -74.05, maxLon: -73.90 } },
  { name: "London",     bounds: { minLat: 51.48, maxLat: 51.55, minLon: -0.18, maxLon: -0.05 } },
  { name: "Paris",      bounds: { minLat: 48.82, maxLat: 48.89, minLon: 2.25, maxLon: 2.41 } },
  { name: "Tokyo",      bounds: { minLat: 35.65, maxLat: 35.75, minLon: 139.65, maxLon: 139.80 } },
  { name: "Silicon V",  bounds: { minLat: 37.30, maxLat: 37.80, minLon: -122.30, maxLon: -121.90 } },
  { name: "Dubai",      bounds: { minLat: 25.05, maxLat: 25.25, minLon: 55.15, maxLon: 55.35 } }
];

const WIKIDATA_TARGETS = [
  { type: "energy", qids: ["Q134447", "Q43058"], limit: 100, label: "Energy Stations" },
  { type: "finance", qids: ["Q22687", "Q13200249"], limit: 120, label: "Banks" },
  { type: "healthcare", qids: ["Q16917"], limit: 100, label: "Hospitals" },
  { type: "education", qids: ["Q3918"], limit: 100, label: "Universities" },
  { type: "cultural", qids: ["Q33506"], limit: 100, label: "Museums" },
  { type: "hospitality", qids: ["Q27686"], limit: 100, label: "Hotels" },
  { type: "manufacturing", qids: ["Q83405"], limit: 100, label: "Factories" }
];

const PHILANTHROPY_CONFIG = {
  "healthcare": { costMin: 40, costMax: 150, power: 5, gov: 50, impact: 80, follow: 12000 },
  "education": { costMin: 50, costMax: 200, power: 15, gov: 40, impact: 60, follow: 8000 },
  "cultural": { costMin: 80, costMax: 250, power: 30, gov: 20, impact: 90, follow: 20000 }
};

const RETAIL_NAMES = [
  "Local Bistro", "Craft Coffee Roasters", "Avenue Boutique", "Tech Repair Shop", 
  "Urban Bar & Grill", "Corner Deli", "Fitness Studio", "Vinyl Record Store", 
  "Artisan Bakery"
];

const DEFENSE_NAMES = [
  "Tactical Operations Center", "Cybercom Node", "Aerospatial Depot", 
  "Strategic Reserve Facility", "Joint Task Base"
];

async function queryWikidata(qid, limit) {
  const query = `
    SELECT DISTINCT ?itemLabel ?coord ?image WHERE {
      ?item wdt:P31/wdt:P279* wd:${qid};
            wdt:P625 ?coord;
            wdt:P18 ?image.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT ${limit}
  `;

  try {
    const resp = await fetch(`${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`, { headers: HEADERS });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.results.bindings || [];
  } catch (err) {
    return [];
  }
}

function parseCoordinates(pointStr) {
  const match = pointStr.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (match) return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
  return { lat: 0, lon: 0 };
}

const isPhilanthropic = (type) => ["education", "healthcare", "cultural"].includes(type);

async function main() {
  console.log("🚀 Starting Hybrid Geospatial Engine...");
  const nodes = [];
  const seenLabels = new Set(); 

  // PART 1: WIKIDATA GLOBAL FETCH (REAL GIANTS)
  for (const target of WIKIDATA_TARGETS) {
    console.log(`\n\x1b[36m>>> Fetching Global Dataset: ${target.label} (Type: ${target.type})\x1b[0m`);
    let itemsFetchedForSector = 0;
    
    // Divide limits evenly across QIDs
    const limitPerQid = Math.ceil(target.limit / target.qids.length);

    for (const qid of target.qids) {
      await new Promise(r => setTimeout(r, 600)); // Rate limit
      const bindings = await queryWikidata(qid, limitPerQid);
      
      for (const row of bindings) {
        if (nodes.length >= 800) break;

        const label = row.itemLabel?.value;
        const coordStr = row.coord?.value;
        const image = row.image?.value;

        if (!label || label.match(/^Q\d+$/) || !coordStr || !image || seenLabels.has(label)) continue;

        seenLabels.add(label);
        const { lat, lon } = parseCoordinates(coordStr);
        const philConfig = PHILANTHROPY_CONFIG[target.type];
        const level = randomInt(2, 5);
        const baseValue = randomInt(5000000, 250000000);
        
        let owner = 'market';
        if (!isPhilanthropic(target.type) && Math.random() < 0.1) owner = 'rival';

        const nodeObj = {
          id: generateId(), name: label, type: target.type, owner,
          lat: parseFloat(lat.toFixed(5)), lon: parseFloat(lon.toFixed(5)),
          level, capex: baseValue, opex: Math.floor(baseValue * 0.05),
          income: isPhilanthropic(target.type) ? 0 : randomInt(50000, 300000) * level,
          status: "operational", imageUrl: image
        };

        if (isPhilanthropic(target.type)) {
           const millionsCost = randomInt(philConfig.costMin, philConfig.costMax);
           nodeObj.canBeRenamed = true;
           nodeObj.namingRightsCost = millionsCost * 1000000;
           nodeObj.renameEffect = `+${Math.max(1, Math.round(philConfig.power*(millionsCost/100)))} Power, +${Math.max(5, Math.round(philConfig.gov*(millionsCost/100)))} Governance, +${Math.max(5, Math.round(philConfig.impact*(millionsCost/100)))} Impact, +${Math.round(philConfig.follow*(millionsCost/100))} followers`;
        }

        nodes.push(nodeObj);
        itemsFetchedForSector++;
      }
      process.stdout.write(`QID ${qid} ✓ `);
    }
    console.log(`\n   ✅ Extracted ${itemsFetchedForSector} real world geometries`);
  }

  // PART 2: PROCEDURAL BOUNDING BOX TIER-1 INJECTION (RETAIL & DEFENSE)
  console.log(`\n\x1b[36m>>> Generating Dense Starter Nodes inside Tier-1 Boundaries (Retail/Defense)...\x1b[0m`);
  let localNodes = 0;

  for (const city of CITIES) {
    // Generate ~30 Retail locations per city (Cheap €75k - €500k)
    for (let i=0; i<30; i++) {
      const lat = randomFloat(city.bounds.minLat, city.bounds.maxLat);
      const lon = randomFloat(city.bounds.minLon, city.bounds.maxLon);
      const retailName = RETAIL_NAMES[randomInt(0, RETAIL_NAMES.length-1)];
      const baseValue = randomInt(75, 400) * 1000; // 75k to 400k (Starter Money)
      
      nodes.push({
        id: generateId(), name: `${retailName} (${city.name} District)`, type: "retail", owner: "market",
        lat: parseFloat(lat.toFixed(5)), lon: parseFloat(lon.toFixed(5)),
        level: 1, capex: baseValue, opex: Math.floor(baseValue * 0.05),
        income: randomInt(3000, 15000), status: "operational",
        imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24" 
      });
      localNodes++;
    }

    // Generate ~5 Defense bases per city
    for (let i=0; i<5; i++) {
        const lat = randomFloat(city.bounds.minLat, city.bounds.maxLat);
        const lon = randomFloat(city.bounds.minLon, city.bounds.maxLon);
        const defName = DEFENSE_NAMES[randomInt(0, DEFENSE_NAMES.length-1)];
        nodes.push({
          id: generateId(), name: `${defName} - ${city.name}`, type: "defense", owner: "market",
          lat: parseFloat(lat.toFixed(5)), lon: parseFloat(lon.toFixed(5)),
          level: randomInt(3, 5), capex: randomInt(50, 400) * 1000000, opex: 2000000,
          income: randomInt(500000, 1500000), status: "operational",
          imageUrl: "https://images.unsplash.com/photo-1517435166318-63cb57371fbb" 
        });
        localNodes++;
    }
  }

  console.log(`\n===========================================`);
  console.log(`🌍 Mapped ${nodes.length} total hyper-authentic + Starter nodes!`);
  console.log(`===========================================`);

  const fileOutput = `import { EmpireNode } from '../store/empireStore';\n\nexport const PROCEDURAL_NODES: EmpireNode[] = ${JSON.stringify(nodes, null, 2)};\n`;
  const outputPath = path.resolve('./apps/empire/src/data/infrastructureData.ts');
  fs.writeFileSync(outputPath, fileOutput, 'utf-8');
  console.log(`💾 Saved hardcoded production dataset to ${outputPath}`);
}

main().catch(console.error);
