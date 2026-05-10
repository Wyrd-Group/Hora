import fs from 'fs';
import path from 'path';

const NUM_NODES = 1000;

// Random UUID generator
const generateId = () => `node-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;

const randomInRange = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// High-Fidelity Anchor Real-World Facilities
// We will explicitly map exactly these, and then scatter "ancillary" nodes tightly around them.
const REAL_WORLD_FACILITIES = [
  // ── Tech ──────────────────────────────────────────
  { name: "Apple Park", type: "tech", lat: 37.3346, lon: -122.0089, img: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Apple_Park_Cupertino_California.jpg" },
  { name: "Googleplex", type: "tech", lat: 37.4220, lon: -122.0840, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Googleplex_HQ_%28cropped%29.jpg/1200px-Googleplex_HQ_%28cropped%29.jpg" },
  { name: "Switch SuperNAP", type: "tech", lat: 36.0718, lon: -115.2016, img: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Data_center_example.jpg" }, // Generic substitute
  { name: "TSMC Fab 18", type: "tech", lat: 23.1111, lon: 120.2743, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Tainan_Science_Park_2021.jpg/1200px-Tainan_Science_Park_2021.jpg" },

  // ── Finance ───────────────────────────────────────
  { name: "JPMorgan Chase Headquarters", type: "finance", lat: 40.7558, lon: -73.9754, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/JPMorgan_Chase_Tower_%28Houston%29.jpg/1200px-JPMorgan_Chase_Tower_%28Houston%29.jpg" },
  { name: "One World Trade Center", type: "finance", lat: 40.7127, lon: -74.0133, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/One_World_Trade_Center_May_2015.jpg/1200px-One_World_Trade_Center_May_2015.jpg" },
  { name: "Canary Wharf Financial Corp", type: "finance", lat: 51.5054, lon: -0.0186, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Canary_Wharf_from_Greenwich_Park.jpg/1200px-Canary_Wharf_from_Greenwich_Park.jpg" },
  { name: "European Central Bank HQ", type: "finance", lat: 50.1100, lon: 8.7020, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/European_Central_Bank_Headquarters_-_Frankfurt_%2845648833481%29.jpg/1200px-European_Central_Bank_Headquarters_-_Frankfurt_%2845648833481%29.jpg" },

  // ── Haute Couture / Retail ────────────────────────
  { name: "Chanel Rue Cambon", type: "venue", lat: 48.8682, lon: 2.3268, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Chanel_Boutique%2C_31_Rue_Cambon%2C_Paris_1%C3%A8re.jpg/1200px-Chanel_Boutique%2C_31_Rue_Cambon%2C_Paris_1%C3%A8re.jpg" },
  { name: "LVMH Headquarters", type: "venue", lat: 48.8680, lon: 2.3080, img: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400" }, // Fallback to aesthetic unsplash
  { name: "Harrods Knightsbridge", type: "venue", lat: 51.4994, lon: -0.1632, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Harrods_illuminated%2C_London%2C_England_-_Oct_2008.jpg/1200px-Harrods_illuminated%2C_London%2C_England_-_Oct_2008.jpg" },

  // ── Hospitality ───────────────────────────────────
  { name: "The Ritz Paris", type: "hospitality", lat: 48.8684, lon: 2.3283, img: "https://upload.wikimedia.org/wikipedia/commons/3/33/Ritz_Paris_2016.jpg" },
  { name: "Waldorf Astoria NYC", type: "hospitality", lat: 40.7566, lon: -73.9739, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Waldorf_Astoria_New_York_2013.jpg/1200px-Waldorf_Astoria_New_York_2013.jpg" },
  { name: "Hilton Tokyo", type: "hospitality", lat: 35.6924, lon: 139.6917, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Hilton_Tokyo_2020.jpg/1200px-Hilton_Tokyo_2020.jpg" },
  { name: "Burj Al Arab", type: "hospitality", lat: 25.1412, lon: 55.1852, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Burj_Al_Arab_Dubai.jpg/1200px-Burj_Al_Arab_Dubai.jpg" },

  // ── Manufacturing ─────────────────────────────────
  { name: "Tesla Giga Shanghai", type: "manufacturing", lat: 30.8732, lon: 121.7681, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Tesla_Gigafactory_Shanghai_Phase_1_and_2.jpg/1200px-Tesla_Gigafactory_Shanghai_Phase_1_and_2.jpg" },
  { name: "Foxconn Shenzen Plant", type: "manufacturing", lat: 22.6580, lon: 114.0430, img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400" },
  { name: "Stuttgart Mercedes Plant", type: "manufacturing", lat: 48.7758, lon: 9.1829, img: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400" },

  // ── Energy & Oil ──────────────────────────────────
  { name: "Gravelines Nuclear Station", type: "energy", lat: 51.0136, lon: 2.1364, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Centrale_Nucl%C3%A9aire_de_Gravelines_2.jpg/1200px-Centrale_Nucl%C3%A9aire_de_Gravelines_2.jpg" },
  { name: "Saudi Aramco Ras Tanura", type: "oil_gas", lat: 26.6570, lon: 50.1550, img: "https://images.unsplash.com/photo-1534398079543-7ae6d016b86a?w=400" },
  { name: "Congo Hydropower Dam", type: "energy", lat: -5.8055, lon: 14.0883, img: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400" },

  // ── Education (Philanthropy) ──────────────────────
  { name: "Harvard University", type: "education", lat: 42.3770, lon: -71.1167, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Harvard_University_-_Sever_Hall.jpg/1200px-Harvard_University_-_Sever_Hall.jpg", cost: 100_000_000, effect: "+20 Power, +40 Governance, +30 Impact, +8000 followers" },
  { name: "Oxford University", type: "education", lat: 51.7548, lon: -1.2540, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Radcliffe_Camera_Oxford.jpg/1200px-Radcliffe_Camera_Oxford.jpg", cost: 85_000_000, effect: "+18 Power, +35 Governance, +25 Impact, +7000 followers" },
  { name: "MIT Campus", type: "education", lat: 42.3601, lon: -71.0942, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/MIT_Great_Dome_%282012%29.jpg/1200px-MIT_Great_Dome_%282012%29.jpg", cost: 90_000_000, effect: "+15 Power, +30 Governance, +50 Impact, +7500 followers" },

  // ── Healthcare (Philanthropy) ─────────────────────
  { name: "Johns Hopkins Hospital", type: "healthcare", lat: 39.2972, lon: -76.5919, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Johns_Hopkins_Hospital_Main_Entrance.jpg/1200px-Johns_Hopkins_Hospital_Main_Entrance.jpg", cost: 150_000_000, effect: "+10 Power, +60 Governance, +80 Impact, +12000 followers" },
  { name: "Mayo Clinic", type: "healthcare", lat: 44.0227, lon: -92.4666, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Mayo_Clinic_Gonda.jpg/1200px-Mayo_Clinic_Gonda.jpg", cost: 120_000_000, effect: "+5 Power, +55 Governance, +70 Impact, +10000 followers" },
  
  // ── Cultural (Philanthropy) ───────────────────────
  { name: "The Louvre Museum", type: "cultural", lat: 48.8606, lon: 2.3376, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Louvre_Museum_Wikimedia_Commons.jpg/1200px-Louvre_Museum_Wikimedia_Commons.jpg", cost: 250_000_000, effect: "+40 Power, +20 Governance, +80 Impact, +25000 followers" },
  { name: "The Metropolitan Museum of Art", type: "cultural", lat: 40.7794, lon: -73.9632, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/The_Metropolitan_Museum_of_Art_New_York.jpg/1200px-The_Metropolitan_Museum_of_Art_New_York.jpg", cost: 200_000_000, effect: "+35 Power, +15 Governance, +75 Impact, +20000 followers" },
  { name: "British Museum", type: "cultural", lat: 51.5194, lon: -0.1269, img: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/British_Museum_from_NE_2.JPG/1200px-British_Museum_from_NE_2.JPG", cost: 180_000_000, effect: "+30 Power, +20 Governance, +60 Impact, +18000 followers" }
];

const ANCILLARY_IMAGE_MAP = {
  finance: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400",
  venue: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400",
  oil_gas: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=400",
  manufacturing: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=400",
  pharma: "https://images.unsplash.com/photo-1563213126-a4273aed2016?w=400",
  energy: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400",
  hospitality: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
  education: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400",
  healthcare: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400",
  cultural: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400",
};

const nodes = [];
let count = 0;

console.log("Starting Generation of 1000 Infrastructure Nodes...");
console.log("Phase 1: Seeding Major Real-World Anchors...");

for (const facility of REAL_WORLD_FACILITIES) {
  const isPhilanthropic = ["education", "healthcare", "cultural"].includes(facility.type);
  const owner = isPhilanthropic ? 'market' : 'market';
  const level = 5; // Global icons are max level
  const baseValue = randomInt(50_000_000, 150_000_000);

  nodes.push({
    id: generateId(),
    name: facility.name,
    type: facility.type,
    owner: owner,
    lat: facility.lat,
    lon: facility.lon,
    level,
    income: isPhilanthropic ? 0 : randomInt(500000, 2000000), // Non-profits don't yield direct corporate income out-of-box
    capex: baseValue,
    opex: Math.floor(baseValue * 0.05),
    status: "operational",
    imageUrl: facility.img,
    ...(isPhilanthropic ? {
      canBeRenamed: true,
      namingRightsCost: facility.cost,
      renameEffect: facility.effect
    } : {})
  });
  count++;
}

console.log("Phase 2: Generating Ancillary Sub-Nodes Geographically Clustered Around Anchors...");

const remaining = NUM_NODES - count;

for (let i = 0; i < remaining; i++) {
  // Pick an anchor to cluster around
  const anchor = REAL_WORLD_FACILITIES[Math.floor(Math.random() * REAL_WORLD_FACILITIES.length)];
  
  // Calculate micro-offset (simulating industrial parks/districts)
  // +/- 0.015 degrees is roughly +/- 1-2 kilometers
  const latOffset = (Math.random() - 0.5) * 0.03;
  const lonOffset = (Math.random() - 0.5) * 0.03;
  
  // Create a randomized "regional" name derivative
  let subName = '';
  if (anchor.type === 'hospitality') subName = `${['Express', 'Regency', 'Plaza', 'Suites', 'Resort', 'Business'][randomInt(0,5)]}`;
  else if (anchor.type === 'finance') subName = `${['Branch', 'ATM Hub', 'Capital Wing', 'Trading Floor', 'Wealth Desk'][randomInt(0,4)]}`;
  else if (anchor.type === 'tech') subName = `${['Server Cluster', 'Ancillary Fab', 'Supplier', 'Data Vault', 'R&D Lab'][randomInt(0,4)]}`;
  else if (['education','cultural','healthcare'].includes(anchor.type)) subName = `${['Annex', 'Lab Wing', 'Local Clinic', 'Sub-Campus', 'Archive'][randomInt(0,4)]}`;
  else subName = `${['Facility', 'Depot', 'Substation', 'Logistics Center', 'Processing Plant'][randomInt(0,4)]}`;

  const uniqueName = `${anchor.name.split(' ')[0]} ${subName} ${String.fromCharCode(65 + randomInt(0, 25))}-${randomInt(10, 99)}`;

  const level = randomInt(1, 4);
  const isPlayer = Math.random() < 0.02; 
  const isRival = !isPlayer && Math.random() < 0.20; 

  const owner = isPlayer ? 'player' : (isRival ? 'rival' : 'market');
  const baseValue = randomInt(800000, 3500000) * level;

  nodes.push({
    id: generateId(),
    name: uniqueName,
    type: anchor.type,
    owner: owner,
    lat: parseFloat((anchor.lat + latOffset).toFixed(4)),
    lon: parseFloat((anchor.lon + lonOffset).toFixed(4)),
    level: level,
    income: owner !== 'market' ? randomInt(10000, 50000) * level : 0,
    capex: baseValue,
    opex: Math.floor(baseValue * randomInRange(0.02, 0.06)),
    status: "operational",
    imageUrl: ANCILLARY_IMAGE_MAP[anchor.type]
  });

  count++;
}

// Write the file output
const fileOutput = `import { EmpireNode } from '../store/empireStore';

export const PROCEDURAL_NODES: EmpireNode[] = ${JSON.stringify(nodes, null, 2)};
`;

const outputPath = path.resolve('./apps/hora/src/data/infrastructureData.ts');

fs.writeFileSync(outputPath, fileOutput, 'utf-8');
console.log("Successfully generated " + count + " nodes heavily clustered around comparative real-world architectures and wrote to " + outputPath);
