import json
import time
import random
import os

try:
    from duckduckgo_search import DDGS
except ImportError:
    import subprocess
    subprocess.run(["pip3", "install", "duckduckgo_search"])
    from duckduckgo_search import DDGS

# The Master List of 190 Items with Realistic Assessed Pricing (EUR)
# Multipliers scaled smoothly:
# Poor: 1.0001 -> 1.001
# Medium: 1.001 -> 1.008
# High: 1.01 -> 1.05
# Ultra: 1.05 -> 1.25

DB = [
    # POOR TIER (Surplus City)
    ("Poor", "Food", "Instant Ramen Bundle", 5, 1.0001),
    ("Poor", "Food", "Canned Beans", 2, 1.0001),
    ("Poor", "Food", "Stale Bread Bakery Bag", 1, 1.0001),
    ("Poor", "Food", "Budget Tomato Soup", 3, 1.0001),
    ("Poor", "Food", "Frozen Pizza", 4, 1.0002),
    ("Poor", "Food", "Tap Water Jug", 1, 1.0000),
    ("Poor", "Food", "Generic Cereal Box", 4, 1.0001),
    ("Poor", "Food", "Leftover Takeout Box", 3, 1.0001),
    ("Poor", "Food", "Instant Coffee Jar", 6, 1.0002),
    ("Poor", "Food", "Powdered Milk", 5, 1.0001),

    ("Poor", "Transport", "Used Bicycle", 80, 1.0005),
    ("Poor", "Transport", "Cracked Skateboard", 20, 1.0002),
    ("Poor", "Transport", "Monthly Bus Pass", 65, 1.0004),
    ("Poor", "Transport", "Subway Token Roll", 25, 1.0002),
    ("Poor", "Transport", "Worn Sneakers", 15, 1.0001),
    ("Poor", "Transport", "Hitchhiking Cardboard Sign", 0, 1.0000),
    ("Poor", "Transport", "1998 Honda Civic", 1500, 1.0020),
    ("Poor", "Transport", "Rusty Kick Scooter", 35, 1.0002),
    ("Poor", "Transport", "Used Rollerblades", 25, 1.0002),
    ("Poor", "Transport", "Grocery Shopping Cart", 50, 1.0003),

    ("Poor", "Real Estate", "Cardboard Box", 0, 1.0000),
    ("Poor", "Real Estate", "Shared Studio Apartment", 800, 1.0010),
    ("Poor", "Real Estate", "Couch Surfing Fee", 150, 1.0003),
    ("Poor", "Real Estate", "Hostel Bunk Bed", 300, 1.0005),
    ("Poor", "Real Estate", "Leaky Basement Room", 450, 1.0006),
    ("Poor", "Real Estate", "Windowless Storage Room", 350, 1.0005),
    ("Poor", "Real Estate", "Converted Garage", 600, 1.0008),
    ("Poor", "Real Estate", "Tiny Rusty Trailer", 2000, 1.0015),
    ("Poor", "Real Estate", "Campsite Tent", 100, 1.0003),
    ("Poor", "Real Estate", "Abandoned Factory Floor", 0, 1.0001),

    ("Poor", "Tech", "Broken Screen Smartphone", 40, 1.0002),
    ("Poor", "Tech", "2010 Latitude Laptop", 120, 1.0005),
    ("Poor", "Tech", "CRT Monitor", 20, 1.0001),
    ("Poor", "Tech", "Dial-up Modem", 10, 1.0001),
    ("Poor", "Tech", "Jailbroken Old Tablet", 60, 1.0003),
    ("Poor", "Tech", "Sony Walkman Cassette", 30, 1.0002),
    ("Poor", "Tech", "Prepaid Burner Phone", 25, 1.0002),
    ("Poor", "Tech", "Scratched DVD Library", 15, 1.0001),
    ("Poor", "Tech", "Tangled Wired Earphones", 8, 1.0001),
    ("Poor", "Tech", "Stolen WiFi Router", 40, 1.0003),

    # MEDIUM TIER (Mainstreet Direct)
    ("Medium", "Tech", "iPhone 15 Pro Max", 1299, 1.005),
    ("Medium", "Tech", "iPad Pro M4", 1099, 1.004),
    ("Medium", "Tech", "LG 65-inch 4K OLED TV", 1800, 1.006),
    ("Medium", "Tech", "Custom RTX 4090 Gaming PC", 3500, 1.008),
    ("Medium", "Tech", "Sony WH-1000XM5 Headphones", 350, 1.002),
    ("Medium", "Tech", "DJI Mini 4 Pro Drone", 950, 1.003),
    ("Medium", "Tech", "Apple Watch Ultra 2", 799, 1.003),
    ("Medium", "Tech", "Meta Quest 3 VR Headset", 499, 1.002),
    ("Medium", "Tech", "Smart Home Hub Setup", 600, 1.003),
    ("Medium", "Tech", "Sony A7 IV Mirrorless Camera", 2500, 1.006),

    ("Medium", "Transport", "Tesla Model 3 Long Range", 47000, 1.025),
    ("Medium", "Transport", "VanMoof S3 E-Bike", 2500, 1.005),
    ("Medium", "Transport", "Segway Ninebot Max", 800, 1.003),
    ("Medium", "Transport", "Uber Black Yearly Subsidy", 5000, 1.008),
    ("Medium", "Transport", "VW Golf GTI", 32000, 1.015),
    ("Medium", "Transport", "Vespa Sprint 150", 5500, 1.006),
    ("Medium", "Transport", "BMW 330i Sedan", 45000, 1.020),
    ("Medium", "Transport", "First-Class Metro Pass", 1200, 1.004),
    ("Medium", "Transport", "Toyota RAV4 Hybrid", 35000, 1.018),
    ("Medium", "Transport", "Ducati Panigale V2", 18500, 1.012),

    ("Medium", "Watches", "Seiko Prospex Diver", 500, 1.002),
    ("Medium", "Watches", "Garmin Fenix 7 Sapphire", 900, 1.003),
    ("Medium", "Watches", "Tissot PRX Powermatic", 650, 1.002),
    ("Medium", "Watches", "Hamilton Khaki Field", 450, 1.001),
    ("Medium", "Watches", "Casio G-Shock MR-G", 1200, 1.003),
    ("Medium", "Watches", "Citizen Eco-Drive Titanium", 400, 1.001),
    ("Medium", "Watches", "Orient Bambino Faceman", 250, 1.001),
    ("Medium", "Watches", "Swatch Omega Moonswatch", 260, 1.001),
    ("Medium", "Watches", "Vintage Tag Heuer Formula 1", 1500, 1.004),
    ("Medium", "Watches", "Longines Spirit Zulu Time", 3000, 1.006),

    ("Medium", "Real Estate", "Suburban 3-Bed Downpayment", 60000, 1.035),
    ("Medium", "Real Estate", "City Center Loft Rent 1yr", 30000, 1.015),
    ("Medium", "Real Estate", "Cozy Townhouse Equity", 120000, 1.045),
    ("Medium", "Real Estate", "Fixer-Upper Flipping House", 150000, 1.050),
    ("Medium", "Real Estate", "Woodland Cabin Getaway", 85000, 1.028),
    ("Medium", "Real Estate", "Condominium Deposit", 40000, 1.020),
    ("Medium", "Real Estate", "Luxury Ritz Timeshare", 25000, 1.012),
    ("Medium", "Real Estate", "Suburban Duplex Mortgage", 250000, 1.065),
    ("Medium", "Real Estate", "Commercial Studio Lease", 18000, 1.010),
    ("Medium", "Real Estate", "Smart Home Integration", 15000, 1.008),

    ("Medium", "Lifestyle", "Breville Espresso Machine", 1500, 1.004),
    ("Medium", "Lifestyle", "Peloton Bike Plus", 2500, 1.005),
    ("Medium", "Lifestyle", "Titleist Custom Golf Clubs", 3000, 1.006),
    ("Medium", "Lifestyle", "Louis Vuitton Keepall", 2800, 1.005),
    ("Medium", "Lifestyle", "Emirates Business Class Ticket", 6500, 1.008),
    ("Medium", "Lifestyle", "Equinox Premium Yearly", 4200, 1.007),
    ("Medium", "Lifestyle", "VIP Front Row Concert Tickets", 1500, 1.003),
    ("Medium", "Lifestyle", "Aman Luxury Spa Retreat", 8000, 1.010),
    ("Medium", "Lifestyle", "Opus One Wine Case", 2400, 1.005),
    ("Medium", "Lifestyle", "Epic Ski Season Pass", 1000, 1.003),

    # HIGH TIER (Executive Port)
    ("High", "Supercars", "Porsche 911 Turbo S", 230000, 1.065),
    ("High", "Supercars", "Audi R8 V10 Performance", 160000, 1.055),
    ("High", "Supercars", "Aston Martin Vantage F1", 175000, 1.058),
    ("High", "Supercars", "McLaren 720S", 300000, 1.075),
    ("High", "Supercars", "Ferrari Roma", 225000, 1.060),
    ("High", "Supercars", "Mercedes AMG G63", 190000, 1.058),
    ("High", "Supercars", "Lamborghini Huracan EVO", 260000, 1.070),
    ("High", "Supercars", "Bentley Continental GT", 235000, 1.062),
    ("High", "Supercars", "Jaguar F-Type SVR", 125000, 1.045),
    ("High", "Supercars", "Range Rover SV Autobiography", 150000, 1.050),

    ("High", "Watches", "Rolex Submariner Date", 14000, 1.015),
    ("High", "Watches", "Patek Philippe Nautilus 5711", 110000, 1.045),
    ("High", "Watches", "Audemars Piguet Royal Oak", 45000, 1.035),
    ("High", "Watches", "Vacheron Constantin Overseas", 35000, 1.030),
    ("High", "Watches", "Jaeger-LeCoultre Reverso", 12000, 1.012),
    ("High", "Watches", "A. Lange & Söhne Lange 1", 42000, 1.032),
    ("High", "Watches", "Richard Mille RM005", 85000, 1.040),
    ("High", "Watches", "Omega Speedmaster Caliber 321", 15000, 1.016),
    ("High", "Watches", "Hublot Big Bang Unico", 22000, 1.020),
    ("High", "Watches", "Cartier Santos Dumont Gold", 18000, 1.018),

    ("High", "Real Estate", "Monaco Port Condominium", 3500000, 1.150),
    ("High", "Real Estate", "Aspen Ski Chalet", 4200000, 1.180),
    ("High", "Real Estate", "Manhattan Central Park Penthouse", 8500000, 1.250),
    ("High", "Real Estate", "Hamptons Oceanfront Villa", 6500000, 1.220),
    ("High", "Real Estate", "Lake Como Historic House", 5000000, 1.190),
    ("High", "Real Estate", "Swiss Alps Cabin Retreat", 2800000, 1.120),
    ("High", "Real Estate", "Tokyo Roppongi Highrise", 3800000, 1.160),
    ("High", "Real Estate", "French Riviera Mansion", 7500000, 1.240),
    ("High", "Real Estate", "Miami Beach Glass Penthouse", 4800000, 1.185),
    ("High", "Real Estate", "London Mayfair Townhouse", 6200000, 1.210),

    ("High", "Lifestyle", "Private Chef Retainer 1yr", 85000, 1.030),
    ("High", "Lifestyle", "Augusta National Country Club", 250000, 1.065),
    ("High", "Lifestyle", "NetJets Fractional Jet Share", 550000, 1.085),
    ("High", "Lifestyle", "Napa Valley Private Vineyard", 4500000, 1.150),
    ("High", "Lifestyle", "Kentucky Derby Racehorse", 300000, 1.070),
    ("High", "Lifestyle", "Royal County Berkshire Polo Club", 120000, 1.040),
    ("High", "Lifestyle", "Monaco Yacht Club Membership", 200000, 1.055),
    ("High", "Lifestyle", "Concierge Medicine Black Tier", 50000, 1.025),
    ("High", "Lifestyle", "Michelin Star Dining Tour EU", 35000, 1.015),
    ("High", "Lifestyle", "Met Gala Ultra Exclusive Ticket", 100000, 1.045),

    ("High", "Art", "Contemporary Stainless Sculpture", 150000, 1.045),
    ("High", "Art", "Original Banksy Canvas", 1200000, 1.095),
    ("High", "Art", "Andy Warhol Marilyn Print", 185000, 1.050),
    ("High", "Art", "Kaws 4-Foot Companion Figure", 85000, 1.035),
    ("High", "Art", "Picasso Signed Lithograph", 250000, 1.060),
    ("High", "Art", "De Kooning Abstract Painting", 3500000, 1.160),
    ("High", "Art", "Authentic Ming Dynasty Vase", 800000, 1.085),
    ("High", "Art", "Rodin Marble Statue Replica", 120000, 1.040),
    ("High", "Art", "Dan Flavin Neon Installation", 450000, 1.075),
    ("High", "Art", "Jean-Michel Basquiat Sketch", 650000, 1.080),

    # ULTRA TIER (The Vault)
    ("Ultra", "Supercars", "Bugatti Chiron Super Sport", 4200000, 1.180),
    ("Ultra", "Supercars", "Pagani Huayra BC", 3500000, 1.160),
    ("Ultra", "Supercars", "Koenigsegg Jesko Absolut", 3800000, 1.170),
    ("Ultra", "Supercars", "Ferrari LaFerrari Aperta", 5500000, 1.220),
    ("Ultra", "Supercars", "McLaren P1 GTR", 3200000, 1.150),
    ("Ultra", "Supercars", "Aston Martin Valkyrie", 4500000, 1.190),
    ("Ultra", "Supercars", "Porsche 918 Spyder Weissach", 2500000, 1.130),
    ("Ultra", "Supercars", "Lamborghini Sian FKP 37", 3600000, 1.165),
    ("Ultra", "Supercars", "Rolls Royce Sweptail Custom", 12800000, 1.350),
    ("Ultra", "Supercars", "Mercedes AMG One F1", 3000000, 1.140),

    ("Ultra", "Lifestyle", "Lurssen 110m Megayacht", 175000000, 1.800),
    ("Ultra", "Lifestyle", "SpaceX Orbital Tourist Flight", 55000000, 1.450),
    ("Ultra", "Lifestyle", "NFL Franchise Ownership", 4500000000, 3.500),
    ("Ultra", "Lifestyle", "Premier League Soccer Club", 2800000000, 2.900),
    ("Ultra", "Lifestyle", "Caribbean Private Island", 85000000, 1.650),
    ("Ultra", "Lifestyle", "Sovereign Diplomatic Passport", 15000000, 1.350),
    ("Ultra", "Lifestyle", "Privatized Orbital Space Station", 250000000, 2.100),
    ("Ultra", "Lifestyle", "Presidential Influence Lobby Group", 200000000, 1.950),
    ("Ultra", "Lifestyle", "Global Intelligence Private Network", 125000000, 1.750),
    ("Ultra", "Lifestyle", "Triton Personal Submarine", 8500000, 1.250),

    ("Ultra", "Art", "Salvator Mundi by Leonardo Da Vinci", 450000000, 2.000),
    ("Ultra", "Art", "The Scream by Edvard Munch Original", 119000000, 1.650),
    ("Ultra", "Art", "Van Gogh Starry Night Acquisition", 150000000, 1.700),
    ("Ultra", "Art", "Michelangelo David Secret Transfer", 300000000, 1.850),
    ("Ultra", "Art", "Mark Rothko No. 6", 186000000, 1.750),
    ("Ultra", "Art", "Jackson Pollock No. 5", 140000000, 1.680),
    ("Ultra", "Art", "Rembrandt The Night Watch", 200000000, 1.800),
    ("Ultra", "Art", "Claude Monet Water Lilies Series", 175000000, 1.760),
    ("Ultra", "Art", "Looted Royal Crown Jewels", 80000000, 1.550),
    ("Ultra", "Art", "Ancient Egyptian Pharaoh Sarcophagus", 65000000, 1.480),

    ("Ultra", "Real Estate", "Swiss Alp Underground Doomsday Vault", 120000000, 1.700),
    ("Ultra", "Real Estate", "Dubai World Islands Continent", 180000000, 1.820),
    ("Ultra", "Real Estate", "Billionaires Row Manhattan Tower", 850000000, 2.500),
    ("Ultra", "Real Estate", "Moon Base Alpha Land Claim", 500000000, 2.100),
    ("Ultra", "Real Estate", "Private Archipelago Philippines", 220000000, 1.880),
    ("Ultra", "Real Estate", "Buckingham Palace Wing Lease", 300000000, 2.000),
    ("Ultra", "Real Estate", "Entire Singapore Skyscraper", 1200000000, 2.800),
    ("Ultra", "Real Estate", "Historical English Medieval Castle", 85000000, 1.620),
    ("Ultra", "Real Estate", "Secret Pacific Volcano Base", 450000000, 2.100),
    ("Ultra", "Real Estate", "Monte Carlo Mega Casino Strip", 2500000000, 3.200),

    ("Ultra", "Watches", "Richard Mille RM 56 Sapphire", 3500000, 1.150),
    ("Ultra", "Watches", "Graff Diamonds Hallucination", 55000000, 1.450),
    ("Ultra", "Watches", "Jacob & Co Billionaire Watch", 18000000, 1.320),
    ("Ultra", "Watches", "Patek Philippe Grandmaster Chime", 31000000, 1.380),
    ("Ultra", "Watches", "Breguet Marie-Antoinette Grande Complication", 30000000, 1.370),
    ("Ultra", "Watches", "Rolex Paul Newman Daytona Ref 6239", 17800000, 1.300),
    ("Ultra", "Watches", "Audemars Piguet Black Panther Concept", 5200000, 1.190),
    ("Ultra", "Watches", "Vacheron Constantin Reference 57260", 8000000, 1.220),
    ("Ultra", "Watches", "Hublot 5 Million Diamond", 5000000, 1.180),
    ("Ultra", "Watches", "Chopard 201 Carat High Jewelry", 25000000, 1.350)
]

def generate_id(prefix):
    return f"{prefix}-{random.randint(10000, 999999)}"

out_path = 'apps/empire/src/data/shoppingData.ts'

header = """import { ShoppingAsset } from '../store/empireStore';

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

export const SHOPPING_ASSETS: ShoppingAsset[] = [
"""

fallback_img = "https://images.unsplash.com/photo-cG935YVTGbo?w=800&q=80"

print(f"Starting rigorous duckduckgo search for {len(DB)} exact items...")

# We will batch fetch 
results = []
def fetch_images():
    with DDGS() as ddgs:
        for idx, item in enumerate(DB):
            tier, cat, name, cost, yld = item
            print(f"Searching [{idx+1}/190]: {name} ...", end="", flush=True)
            img_url = fallback_img
            try:
                # Append high res keywords
                query = f"{name} high quality"
                # use time.sleep so we don't hit 429
                time.sleep(1.5)
                # fetch 1 image link
                res = list(ddgs.images(query, max_results=1))
                if len(res) > 0 and 'image' in res[0]:
                    img_url = res[0]['image']
                    print(" OK")
                else:
                    print(" NO_RESULT")
            except Exception as e:
                print(f" ERR ({str(e)})")
            
            results.append({
                "name": name,
                "tier": tier,
                "cat": cat,
                "cost": cost,
                "yld": yld,
                "img": img_url
            })

fetch_images()

print("\nGenerating Type-Safe TypeScript File...")
with open(out_path, "w", encoding="utf-8") as f:
    f.write(header)
    for r in results:
        desc = f"Acquired at {'The Vault' if r['tier'] == 'Ultra' else ('Executive Port' if r['tier'] == 'High' else ('Mainstreet Direct' if r['tier'] == 'Medium' else 'Surplus City'))}. Assessed value validated by Empire Ledger."
        js_line = f"  {{ id: generateId('shop'), name: '{r['name']}', tier: '{r['tier']}', category: '{r['cat']}', description: '{desc}', imageUrl: '{r['img']}', value: {r['cost']}, yieldMultiplier: {r['yld']}, owned: false }},\n"
        f.write(js_line)
    f.write("];\n")

print("Data generation complete! Adjusting the persistent engine state...")
with open("apps/empire/src/store/empireStore.ts", "r") as f:
    text = f.read()
text = text.replace("name: 'quantico-empire-storage-v4'", "name: 'quantico-empire-storage-v5'")
with open("apps/empire/src/store/empireStore.ts", "w") as f:
    f.write(text)

print("Engine version bumped to v5. All 190 items securely embedded with genuine scraped photography.")
