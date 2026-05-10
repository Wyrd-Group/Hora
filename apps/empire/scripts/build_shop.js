import fs from 'fs';
import https from 'https';

const tiers = [
  {
    tier: 'Surplus City',
    valBase: 10,
    items: {
      'Food': ['Instant Ramen', 'Canned Beans', 'Stale Bread', 'Budget Soup', 'Frozen Pizza', 'Tap Water Jug', 'Generic Cereal', 'Leftover Box', 'Instant Coffee', 'Powdered Milk'],
      'Transport': ['Used Bicycle', 'Cracked Skateboard', 'Monthly Bus Pass', 'Subway Token', 'Worn Sneakers', 'Hitchhiking Sign', '1998 Honda Civic', 'Rusty Scooter', 'Used Rollerblades', 'Shopping Cart'],
      'Real Estate': ['Cardboard Box', 'Shared Studio', 'Couch Surfing', 'Hostel Bunk', 'Leaky Basement', 'Windowless Room', 'Converted Garage', 'Tiny Trailer', 'Campsite Tent', 'Abandoned Factory Floor'],
      'Tech': ['Broken Screen Phone', '2010 Laptop', 'CRT Monitor', 'Dial-up Modem', 'Jailbroken Tablet', 'Old Walkman', 'Burner Phone', 'Scratched DVD', 'Wired Earphones', 'Stolen WiFi Router']
    }
  },
  {
    tier: 'Mainstreet Direct',
    valBase: 500,
    items: {
      'Tech': ['iPhone 15 Pro', 'iPad Pro', '4K OLED TV', 'Custom Gaming PC', 'Noise Cancelling Headphones', 'DJI Drone', 'Smartwatch', 'VR Headset', 'Smart Home Hub', 'DSLR Camera'],
      'Transport': ['Tesla Model 3', 'High-end E-Bike', 'Premium E-Scooter', 'Uber Black Subscription', 'VW Golf GTI', 'Vespa Sprint', 'BMW 3 Series', 'Priority Metro Pass', 'Hybrid SUV', 'Ducati Motorcycle'],
      'Watches': ['Apple Watch Ultra', 'Seiko Prospex', 'Garmin Fenix 7', 'Tissot PRX', 'Hamilton Khaki', 'Casio G-Shock Steel', 'Citizen Eco-Drive', 'Orient Bambino', 'Swatch Moonswatch', 'Vintage Tag Heuer'],
      'Real Estate': ['Suburban 3-Bed', 'City Center Loft', 'Cozy Townhouse', 'Fixer-Upper House', 'Woodland Cabin', 'Condo Downpayment', 'Luxury Timeshare', 'Suburban Duplex', 'Studio Rental', 'Smart Home Upgrade'],
      'Lifestyle': ['Espresso Machine', 'Peloton Bike', 'Custom Golf Clubs', 'Designer Leather Bag', 'Business Class Flight', 'Premium Gym Yearly', 'VIP Concert Tickets', 'Luxury Spa Retreat', 'Boutique Wine Box', 'Season Ski Pass']
    }
  },
  {
    tier: 'Executive Port',
    valBase: 50000,
    items: {
      'Supercars': ['Porsche 911 Turbo', 'Audi R8', 'Aston Martin Vantage', 'McLaren 570S', 'Ferrari Roma', 'Mercedes G-Wagon', 'Lamborghini Huracan', 'Bentley Continental', 'Jaguar F-Type R', 'Range Rover Autobiography'],
      'Watches': ['Rolex Submariner', 'Patek Philippe Nautilus', 'Audemars Piguet Royal Oak', 'Vacheron Constantin Overseas', 'Jaeger LeCoultre Reverso', 'A. Lange Sohne 1', 'Richard Mille Entry', 'Omega Speedmaster Pro', 'Hublot Big Bang', 'Cartier Santos'],
      'Real Estate': ['Monaco Condo', 'Aspen Ski Chalet', 'Manhattan Penthouse', 'Hamptons Villa', 'Lake Como House', 'Swiss Alp Cabin', 'Tokyo Highrise', 'French Riviera Mansion', 'Miami Beach Penthouse', 'London Mayfair Townhouse'],
      'Lifestyle': ['Retained Private Chef', 'Exclusive Country Club', 'Fractional Jet Ownership', 'Private Vineyard', 'Champion Racehorse', 'Polo Club Membership', 'Yacht Club Access', 'Concierge Medicine', 'Michelin Dining Tour', 'Exclusive Art Gala Ticket'],
      'Art': ['Contemporary Sculpture', 'Original Banksy Art', 'Andy Warhol Print', 'Kaws Figure', 'Picasso Lithograph', 'Abstract Painting', 'Ming Dynasty Vase', 'Marble Statue Entry', 'Neon Installation Art', 'Jean-Michel Basquiat Sketch']
    }
  },
  {
    tier: 'The Vault',
    valBase: 2000000,
    items: {
      'Supercars': ['Bugatti Chiron', 'Pagani Huayra', 'Koenigsegg Jesko', 'Ferrari LaFerrari', 'McLaren P1', 'Aston Martin Valkyrie', 'Porsche 918 Spyder', 'Lamborghini Sian', 'Rolls Royce Sweptail', 'Mercedes AMG One'],
      'Lifestyle': ['110m Megayacht', 'Space Tourist Ticket', 'NFL Franchise', 'Premier League Soccer Club', 'Private Island', 'Sovereign State Passport', 'Orbiting Station Stay', 'Presidential Network', 'Global Influence Package', 'Personal Submarine'],
      'Art': ['Salvator Mundi by Da Vinci', 'Mona Lisa Original', 'Van Gogh Starry Night', 'Michelangelo David Replica', 'Rothko No 6', 'Jackson Pollock No 5', 'Rembrandt Night Watch', 'Monet Water Lilies', 'Royal Crown Jewels', 'Ancient Egyptian Artifact'],
      'Real Estate': ['Swiss Alp Vault Core', 'Caribbean Island Fortress', 'Underground Doomsday Bunker', 'Moon Base Land Claim', 'Orbital Space Estate', 'Private Archipelago', 'Entire Skyscraper', 'Historical English Castle', 'Secret Volcano Base', 'Superyacht Private Dock'],
      'Watches': ['RM 56 Sapphire', 'Graff Diamonds Hallucination', 'Jacob Co Billionaire', 'Patek Grandmaster Chime', 'Breguet Grande Complication', 'Rolex Paul Newman Daytona', 'AP Concept Black Panther', 'Vacheron 57260', 'Hublot 5 Million', 'Chopard 201 Carat']
    }
  }
];

const fetchImageId = (query) => {
  return new Promise((resolve) => {
    https.get(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=1`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.results && parsed.results.length > 0) {
            resolve(parsed.results[0].id);
          } else {
            resolve('cG935YVTGbo'); // fallback generic luxury/item
          }
        } catch {
          resolve('cG935YVTGbo');
        }
      });
    }).on('error', () => resolve('cG935YVTGbo'));
  });
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  let fileContent = `import { ShoppingAsset } from '../store/empireStore';

const generateId = (prefix: string) => \`\${prefix}-\${Math.random().toString(36).substring(2, 9)}\`;

export const SHOPPING_ASSETS: ShoppingAsset[] = [\n`;

  for (const tierData of tiers) {
    fileContent += `  // ── ${tierData.tier.toUpperCase()} ─────────────────────────────────────────────\n`;
    for (const [category, items] of Object.entries(tierData.items)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Fetching image for: ${item}`);
        const id = await fetchImageId(item);
        await delay(300); // prevent rate limiting
        
        let multiplier = 1.0;
        if (tierData.tier === 'Surplus City') multiplier = 1.0 + (Math.random() * 0.01);
        if (tierData.tier === 'Mainstreet Direct') multiplier = 1.01 + (Math.random() * 0.04);
        if (tierData.tier === 'Executive Port') multiplier = 1.05 + (Math.random() * 0.05);
        if (tierData.tier === 'The Vault') multiplier = 1.15 + (Math.random() * 0.15);
        
        const value = Math.floor(tierData.valBase * (1 + (i * 0.5) + (Math.random() * 0.2)));
        
        // Use exact tier names to match old structure (Poor, Medium, High, Ultra) if needed, or exact strings requested by user.
        // The modal component uses string matching. The user said: "Surplus City, Mainstreet Direct, Executive Port, The Vault". 
        // But the code likely expects "Poor", "Medium", "High", "Ultra" from ShoppingModal.jsx. I will map them:
        const tMap = { 'Surplus City': 'Poor', 'Mainstreet Direct': 'Medium', 'Executive Port': 'High', 'The Vault': 'Ultra' };
        const tierName = tMap[tierData.tier];

        fileContent += `  { id: generateId('shop'), name: '${item}', tier: '${tierName}', category: '${category}', description: 'Acquired at ${tierData.tier}. Enhances operations and lifestyle prestige.', imageUrl: 'https://images.unsplash.com/photo-${id}?w=800&q=80', value: ${value}, yieldMultiplier: ${multiplier.toFixed(3)}, owned: false },\n`;
      }
    }
  }

  fileContent += `];\n`;
  fs.writeFileSync('apps/empire/src/data/shoppingData.ts', fileContent);
  console.log('Finished writing 190 items to shoppingData.ts');
}

run();
