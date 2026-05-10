import { EmpireNode, SectorType } from '../store/empireStore';

/**
 * Expanded infrastructure nodes for countries missing from the base dataset.
 * Each country has 10+ real-world named infrastructure assets.
 * Nodes are divided into waves — wave 0 loads at start, waves 1-4 unlock over time.
 */

let _eid = 0;
const eid = () => `xnode-${(++_eid).toString(36).padStart(5, '0')}`;

type NodeSeed = {
  name: string;
  type: SectorType;
  lat: number;
  lon: number;
  level: number;
  wave: number; // 0 = available at start, 1-4 = unlocks over time
};

function toNode(s: NodeSeed): EmpireNode & { _wave: number } {
  const scale = s.level;

  // Airports and ports have premium pricing; ESG has lower income but strategic value
  let capex: number, opex: number, income: number;
  if (s.type === 'airport') {
    capex = Math.round((800_000 + Math.random() * 1_200_000) * scale);
    opex = Math.round(capex * (0.05 + Math.random() * 0.02));
    income = Math.round(opex * (1.6 + Math.random() * 1.2)); // high yield — traffic royalties
  } else if (s.type === 'port') {
    capex = Math.round((600_000 + Math.random() * 900_000) * scale);
    opex = Math.round(capex * (0.04 + Math.random() * 0.02));
    income = Math.round(opex * (1.8 + Math.random() * 1.4)); // highest yield — trade volume
  } else if (s.type === 'esg') {
    capex = Math.round((300_000 + Math.random() * 700_000) * scale);
    opex = Math.round(capex * (0.02 + Math.random() * 0.01)); // low operating cost
    income = Math.round(opex * (0.8 + Math.random() * 0.6)); // lower direct income, value is ESG score
  } else {
    capex = Math.round((500_000 + Math.random() * 4_500_000) * scale);
    opex = Math.round(capex * (0.04 + Math.random() * 0.02));
    income = Math.round(opex * (1.1 + Math.random() * 1.5));
  }

  return {
    id: eid(),
    name: s.name,
    type: s.type,
    owner: 'market' as const,
    lat: s.lat,
    lon: s.lon,
    level: s.level,
    capex,
    opex,
    income,
    status: 'operational' as const,
    _wave: s.wave,
  };
}

// ── Country node definitions ──
// Countries that need nodes added or supplemented

const SEEDS: NodeSeed[] = [
  // ── CANADA ──
  { name: 'CN Tower Communications Hub', type: 'tech', lat: 43.6426, lon: -79.3871, level: 3, wave: 0 },
  { name: 'Alberta Oil Sands Complex', type: 'oil_gas', lat: 56.7267, lon: -111.379, level: 4, wave: 0 },
  { name: 'Vancouver Port Authority', type: 'manufacturing', lat: 49.2827, lon: -123.1207, level: 3, wave: 0 },
  { name: 'Muskrat Falls Hydro Station', type: 'energy', lat: 53.2317, lon: -60.7773, level: 3, wave: 0 },
  { name: 'Toronto Stock Exchange HQ', type: 'finance', lat: 43.6488, lon: -79.3817, level: 4, wave: 0 },
  { name: 'Montreal General Hospital', type: 'healthcare', lat: 45.4972, lon: -73.5884, level: 2, wave: 0 },
  { name: 'University of Toronto', type: 'education', lat: 43.6629, lon: -79.3957, level: 3, wave: 0 },
  { name: 'National Gallery of Canada', type: 'cultural', lat: 45.4296, lon: -75.6989, level: 2, wave: 0 },
  { name: 'Fairmont Chateau Laurier', type: 'hospitality', lat: 45.4253, lon: -75.6952, level: 3, wave: 0 },
  { name: 'CFB Trenton Military Base', type: 'defense', lat: 44.1189, lon: -77.5281, level: 3, wave: 0 },
  { name: 'Shoppers Drug Mart HQ', type: 'pharma', lat: 43.7735, lon: -79.3371, level: 2, wave: 1 },
  { name: 'Darlington Nuclear Station', type: 'energy', lat: 43.8748, lon: -78.7193, level: 4, wave: 1 },
  { name: 'Calgary Saddledome Arena', type: 'venue', lat: 51.0374, lon: -114.0519, level: 2, wave: 2 },

  // ── SOUTH KOREA ──
  { name: 'Samsung Electronics HQ', type: 'tech', lat: 37.2578, lon: 127.0534, level: 5, wave: 0 },
  { name: 'Hyundai Motor Ulsan Plant', type: 'manufacturing', lat: 35.5384, lon: 129.3114, level: 4, wave: 0 },
  { name: 'Seoul National University', type: 'education', lat: 37.4602, lon: 126.9521, level: 3, wave: 0 },
  { name: 'Lotte World Tower', type: 'finance', lat: 37.5126, lon: 127.1026, level: 4, wave: 0 },
  { name: 'Incheon International Airport', type: 'manufacturing', lat: 37.4602, lon: 126.4407, level: 4, wave: 0 },
  { name: 'POSCO Steel Works Pohang', type: 'manufacturing', lat: 36.0190, lon: 129.3435, level: 4, wave: 0 },
  { name: 'SK Hynix Semiconductor', type: 'tech', lat: 37.2750, lon: 127.0094, level: 4, wave: 0 },
  { name: 'Asan Medical Center', type: 'healthcare', lat: 37.5270, lon: 127.1088, level: 3, wave: 0 },
  { name: 'Kori Nuclear Power Plant', type: 'energy', lat: 35.3196, lon: 129.2833, level: 4, wave: 0 },
  { name: 'National Museum of Korea', type: 'cultural', lat: 37.5239, lon: 126.9801, level: 2, wave: 0 },
  { name: 'Busan Port Authority', type: 'manufacturing', lat: 35.1028, lon: 129.0403, level: 3, wave: 1 },
  { name: 'Sejong City Government Complex', type: 'defense', lat: 36.4800, lon: 127.0000, level: 3, wave: 2 },

  // ── SOUTH AFRICA ──
  { name: 'Johannesburg Stock Exchange', type: 'finance', lat: -26.2041, lon: 28.0473, level: 4, wave: 0 },
  { name: 'Koeberg Nuclear Power Station', type: 'energy', lat: -33.6764, lon: 18.4317, level: 4, wave: 0 },
  { name: 'Sasol Secunda CTL Plant', type: 'oil_gas', lat: -26.5167, lon: 29.1833, level: 4, wave: 0 },
  { name: 'University of Cape Town', type: 'education', lat: -33.9577, lon: 18.4612, level: 3, wave: 0 },
  { name: 'Groote Schuur Hospital', type: 'healthcare', lat: -33.9419, lon: 18.4631, level: 3, wave: 0 },
  { name: 'Cape Town V&A Waterfront', type: 'retail', lat: -33.9042, lon: 18.4189, level: 3, wave: 0 },
  { name: 'Durban Port Terminal', type: 'manufacturing', lat: -29.8587, lon: 31.0218, level: 3, wave: 0 },
  { name: 'Table Mountain Cableway', type: 'venue', lat: -33.9575, lon: 18.4030, level: 2, wave: 0 },
  { name: 'Denel Aerospace', type: 'defense', lat: -25.9323, lon: 28.3293, level: 3, wave: 0 },
  { name: 'Sun City Resort', type: 'hospitality', lat: -25.3337, lon: 27.0923, level: 3, wave: 0 },
  { name: 'Richards Bay Coal Terminal', type: 'energy', lat: -28.7833, lon: 32.0333, level: 3, wave: 1 },

  // ── INDONESIA ──
  { name: 'Pertamina Oil Refinery Cilacap', type: 'oil_gas', lat: -7.7278, lon: 109.0108, level: 4, wave: 0 },
  { name: 'Bank Indonesia HQ', type: 'finance', lat: -6.1819, lon: 106.8278, level: 4, wave: 0 },
  { name: 'Universitas Indonesia', type: 'education', lat: -6.3615, lon: 106.8268, level: 3, wave: 0 },
  { name: 'Freeport Grasberg Mine', type: 'manufacturing', lat: -4.0545, lon: 137.1164, level: 5, wave: 0 },
  { name: 'RSUP Cipto Mangunkusumo', type: 'healthcare', lat: -6.1936, lon: 106.8450, level: 3, wave: 0 },
  { name: 'Bali Ngurah Rai Airport', type: 'hospitality', lat: -8.7481, lon: 115.1674, level: 3, wave: 0 },
  { name: 'Telkom Indonesia HQ', type: 'tech', lat: -6.8841, lon: 107.5862, level: 3, wave: 0 },
  { name: 'Suralaya Power Station', type: 'energy', lat: -6.0167, lon: 106.0333, level: 3, wave: 0 },
  { name: 'Borobudur Temple Complex', type: 'cultural', lat: -7.6079, lon: 110.2038, level: 2, wave: 0 },
  { name: 'Grand Indonesia Mall', type: 'retail', lat: -6.1953, lon: 106.8210, level: 3, wave: 0 },
  { name: 'Krakatau Steel Works', type: 'manufacturing', lat: -6.0167, lon: 106.0500, level: 3, wave: 1 },

  // ── NIGERIA ──
  { name: 'Lagos Stock Exchange', type: 'finance', lat: 6.4541, lon: 3.4015, level: 3, wave: 0 },
  { name: 'Dangote Refinery', type: 'oil_gas', lat: 6.4070, lon: 3.3223, level: 5, wave: 0 },
  { name: 'University of Lagos', type: 'education', lat: 6.5158, lon: 3.3890, level: 2, wave: 0 },
  { name: 'Egbin Thermal Power Station', type: 'energy', lat: 6.5500, lon: 3.6333, level: 3, wave: 0 },
  { name: 'Ajaokuta Steel Company', type: 'manufacturing', lat: 7.5500, lon: 6.6500, level: 3, wave: 0 },
  { name: 'Bonny LNG Terminal', type: 'oil_gas', lat: 4.4303, lon: 7.1648, level: 4, wave: 0 },
  { name: 'National Theatre Lagos', type: 'cultural', lat: 6.4846, lon: 3.3740, level: 2, wave: 0 },
  { name: 'Transcorp Hilton Abuja', type: 'hospitality', lat: 9.0574, lon: 7.4891, level: 3, wave: 0 },
  { name: 'Lagos University Teaching Hospital', type: 'healthcare', lat: 6.5287, lon: 3.3948, level: 2, wave: 0 },
  { name: 'Tinapa Business Resort', type: 'retail', lat: 5.0366, lon: 8.3480, level: 2, wave: 0 },
  { name: 'Abuja Technology Village', type: 'tech', lat: 9.0579, lon: 7.4951, level: 2, wave: 1 },

  // ── SAUDI ARABIA ──
  { name: 'Saudi Aramco HQ', type: 'oil_gas', lat: 26.3927, lon: 49.9777, level: 5, wave: 0 },
  { name: 'NEOM Smart City Project', type: 'tech', lat: 27.9500, lon: 35.5000, level: 4, wave: 0 },
  { name: 'Tadawul Stock Exchange', type: 'finance', lat: 24.6915, lon: 46.6904, level: 4, wave: 0 },
  { name: 'King Abdullah University', type: 'education', lat: 22.3094, lon: 39.1022, level: 3, wave: 0 },
  { name: 'Ras Tanura Refinery', type: 'oil_gas', lat: 26.6428, lon: 50.1608, level: 4, wave: 0 },
  { name: 'Yanbu Industrial City', type: 'manufacturing', lat: 24.0865, lon: 38.0618, level: 3, wave: 0 },
  { name: 'King Faisal Hospital Riyadh', type: 'healthcare', lat: 24.6724, lon: 46.6862, level: 3, wave: 0 },
  { name: 'Al Ula Heritage Resort', type: 'hospitality', lat: 26.6173, lon: 37.9214, level: 3, wave: 0 },
  { name: 'Diriyah Cultural District', type: 'cultural', lat: 24.7341, lon: 46.5767, level: 3, wave: 0 },
  { name: 'King Abdulaziz Military Base', type: 'defense', lat: 21.4960, lon: 39.2461, level: 4, wave: 0 },
  { name: 'Jeddah Tower Project', type: 'venue', lat: 21.5433, lon: 39.1728, level: 3, wave: 1 },

  // ── UAE ──
  { name: 'Burj Khalifa Observation Deck', type: 'venue', lat: 25.1972, lon: 55.2744, level: 5, wave: 0 },
  { name: 'Dubai International Financial Centre', type: 'finance', lat: 25.2100, lon: 55.2782, level: 5, wave: 0 },
  { name: 'Abu Dhabi National Oil Company', type: 'oil_gas', lat: 24.4539, lon: 54.3773, level: 5, wave: 0 },
  { name: 'Masdar City Solar Farm', type: 'energy', lat: 24.4266, lon: 54.6155, level: 3, wave: 0 },
  { name: 'Khalifa University', type: 'education', lat: 24.4209, lon: 54.4348, level: 3, wave: 0 },
  { name: 'Cleveland Clinic Abu Dhabi', type: 'healthcare', lat: 24.4075, lon: 54.4382, level: 3, wave: 0 },
  { name: 'Dubai Mall Complex', type: 'retail', lat: 25.1985, lon: 55.2796, level: 4, wave: 0 },
  { name: 'Louvre Abu Dhabi', type: 'cultural', lat: 24.5339, lon: 54.3981, level: 3, wave: 0 },
  { name: 'Atlantis The Palm', type: 'hospitality', lat: 25.1304, lon: 55.1174, level: 4, wave: 0 },
  { name: 'Barakah Nuclear Power Plant', type: 'energy', lat: 23.9590, lon: 52.2580, level: 4, wave: 0 },
  { name: 'Jebel Ali Free Zone', type: 'manufacturing', lat: 25.0040, lon: 55.0641, level: 4, wave: 1 },

  // ── COLOMBIA ──
  { name: 'Ecopetrol Barrancabermeja Refinery', type: 'oil_gas', lat: 7.0652, lon: -73.8547, level: 3, wave: 0 },
  { name: 'Bolsa de Valores de Colombia', type: 'finance', lat: 4.7110, lon: -74.0721, level: 3, wave: 0 },
  { name: 'Universidad Nacional de Colombia', type: 'education', lat: 4.6383, lon: -74.0840, level: 3, wave: 0 },
  { name: 'Cerrejon Coal Mine', type: 'energy', lat: 11.0854, lon: -72.6715, level: 4, wave: 0 },
  { name: 'Hospital Universitario San Ignacio', type: 'healthcare', lat: 4.6280, lon: -74.0657, level: 2, wave: 0 },
  { name: 'Museo del Oro Bogota', type: 'cultural', lat: 4.6019, lon: -74.0722, level: 2, wave: 0 },
  { name: 'Cartagena Port Terminal', type: 'manufacturing', lat: 10.4061, lon: -75.5217, level: 3, wave: 0 },
  { name: 'Medellin Innovation District', type: 'tech', lat: 6.2518, lon: -75.5636, level: 2, wave: 0 },
  { name: 'Four Seasons Bogota', type: 'hospitality', lat: 4.6660, lon: -74.0551, level: 3, wave: 0 },
  { name: 'Centro Comercial Andino', type: 'retail', lat: 4.6663, lon: -74.0546, level: 2, wave: 0 },

  // ── CHILE ──
  { name: 'Codelco Chuquicamata Mine', type: 'manufacturing', lat: -22.3167, lon: -68.9000, level: 5, wave: 0 },
  { name: 'Santiago Stock Exchange', type: 'finance', lat: -33.4381, lon: -70.6548, level: 3, wave: 0 },
  { name: 'Universidad de Chile', type: 'education', lat: -33.4414, lon: -70.6537, level: 3, wave: 0 },
  { name: 'Atacama Desert Solar Farm', type: 'energy', lat: -23.4500, lon: -69.2500, level: 3, wave: 0 },
  { name: 'Hospital Clinico UC', type: 'healthcare', lat: -33.4204, lon: -70.6200, level: 2, wave: 0 },
  { name: 'ALMA Observatory', type: 'tech', lat: -23.0193, lon: -67.7533, level: 3, wave: 0 },
  { name: 'San Alfonso del Mar Resort', type: 'hospitality', lat: -33.3467, lon: -71.6558, level: 2, wave: 0 },
  { name: 'Museo Nacional de Bellas Artes', type: 'cultural', lat: -33.4387, lon: -70.6454, level: 2, wave: 0 },
  { name: 'Costanera Center', type: 'retail', lat: -33.4170, lon: -70.6067, level: 3, wave: 0 },
  { name: 'Port of Valparaiso', type: 'manufacturing', lat: -33.0458, lon: -71.6297, level: 3, wave: 0 },

  // ── PERU ──
  { name: 'Antamina Copper Mine', type: 'manufacturing', lat: -9.5667, lon: -77.0667, level: 4, wave: 0 },
  { name: 'Lima Stock Exchange', type: 'finance', lat: -12.0464, lon: -77.0428, level: 3, wave: 0 },
  { name: 'PUCP University Lima', type: 'education', lat: -12.0697, lon: -77.0793, level: 2, wave: 0 },
  { name: 'Camisea Gas Plant', type: 'oil_gas', lat: -11.8667, lon: -72.6833, level: 3, wave: 0 },
  { name: 'Hospital Nacional Rebagliati', type: 'healthcare', lat: -12.0860, lon: -77.0345, level: 2, wave: 0 },
  { name: 'Machu Picchu Heritage Site', type: 'cultural', lat: -13.1631, lon: -72.5450, level: 3, wave: 0 },
  { name: 'Callao Port Terminal', type: 'manufacturing', lat: -12.0578, lon: -77.1457, level: 3, wave: 0 },
  { name: 'JW Marriott Lima', type: 'hospitality', lat: -12.1300, lon: -77.0163, level: 2, wave: 0 },
  { name: 'Jockey Plaza Shopping', type: 'retail', lat: -12.0870, lon: -76.9780, level: 2, wave: 0 },
  { name: 'Lima Tech Hub San Isidro', type: 'tech', lat: -12.0977, lon: -77.0365, level: 2, wave: 0 },

  // ── KENYA ──
  { name: 'Nairobi Securities Exchange', type: 'finance', lat: -1.2921, lon: 36.8219, level: 3, wave: 0 },
  { name: 'Geothermal Power Olkaria', type: 'energy', lat: -0.8833, lon: 36.2833, level: 3, wave: 0 },
  { name: 'University of Nairobi', type: 'education', lat: -1.2783, lon: 36.8172, level: 2, wave: 0 },
  { name: 'Kenyatta National Hospital', type: 'healthcare', lat: -1.3019, lon: 36.8085, level: 2, wave: 0 },
  { name: 'Mombasa Port', type: 'manufacturing', lat: -4.0435, lon: 39.6682, level: 3, wave: 0 },
  { name: 'Konza Technopolis', type: 'tech', lat: -1.7500, lon: 37.1000, level: 2, wave: 0 },
  { name: 'National Museum of Kenya', type: 'cultural', lat: -1.2740, lon: 36.8141, level: 2, wave: 0 },
  { name: 'Sarova Hotels HQ', type: 'hospitality', lat: -1.2858, lon: 36.8236, level: 2, wave: 0 },
  { name: 'Two Rivers Mall Nairobi', type: 'retail', lat: -1.2180, lon: 36.8030, level: 2, wave: 0 },
  { name: 'Laikipia Air Base', type: 'defense', lat: 0.0000, lon: 36.9500, level: 2, wave: 0 },

  // ── MOROCCO ──
  { name: 'OCP Phosphate Complex', type: 'manufacturing', lat: 32.3000, lon: -6.9500, level: 4, wave: 0 },
  { name: 'Noor Solar Power Station', type: 'energy', lat: 31.0500, lon: -6.8667, level: 4, wave: 0 },
  { name: 'Casablanca Finance City', type: 'finance', lat: 33.5731, lon: -7.5898, level: 3, wave: 0 },
  { name: 'Mohammed V University', type: 'education', lat: 34.0181, lon: -6.8413, level: 2, wave: 0 },
  { name: 'Tanger Med Port', type: 'manufacturing', lat: 35.8926, lon: -5.5065, level: 4, wave: 0 },
  { name: 'CHU Ibn Sina Hospital', type: 'healthcare', lat: 34.0103, lon: -6.8347, level: 2, wave: 0 },
  { name: 'Hassan II Mosque', type: 'cultural', lat: 33.6088, lon: -7.6322, level: 3, wave: 0 },
  { name: 'Royal Mansour Marrakech', type: 'hospitality', lat: 31.6292, lon: -8.0107, level: 3, wave: 0 },
  { name: 'Morocco Mall', type: 'retail', lat: 33.5500, lon: -7.6583, level: 3, wave: 0 },
  { name: 'Renault Tanger Factory', type: 'manufacturing', lat: 35.7595, lon: -5.8340, level: 3, wave: 0 },

  // ── PAKISTAN ──
  { name: 'Pakistan Stock Exchange', type: 'finance', lat: 24.8524, lon: 67.0099, level: 3, wave: 0 },
  { name: 'Tarbela Dam Hydroelectric', type: 'energy', lat: 34.0889, lon: 72.6938, level: 4, wave: 0 },
  { name: 'LUMS University Lahore', type: 'education', lat: 31.3997, lon: 74.3747, level: 2, wave: 0 },
  { name: 'Pakistan Ordnance Factories', type: 'defense', lat: 33.7831, lon: 73.0095, level: 3, wave: 0 },
  { name: 'Aga Khan University Hospital', type: 'healthcare', lat: 24.8918, lon: 67.0746, level: 3, wave: 0 },
  { name: 'Port Qasim Karachi', type: 'manufacturing', lat: 24.7866, lon: 67.3344, level: 3, wave: 0 },
  { name: 'Faisal Mosque Islamabad', type: 'cultural', lat: 33.7297, lon: 73.0372, level: 2, wave: 0 },
  { name: 'Attock Oil Refinery', type: 'oil_gas', lat: 33.7749, lon: 72.3615, level: 3, wave: 0 },
  { name: 'Lahore Tech Zone', type: 'tech', lat: 31.5204, lon: 74.3587, level: 2, wave: 0 },
  { name: 'Emporium Mall Lahore', type: 'retail', lat: 31.4650, lon: 74.3215, level: 2, wave: 0 },

  // ── BANGLADESH ──
  { name: 'Dhaka Stock Exchange', type: 'finance', lat: 23.7379, lon: 90.4095, level: 2, wave: 0 },
  { name: 'Rooppur Nuclear Power Plant', type: 'energy', lat: 24.0667, lon: 89.0500, level: 3, wave: 0 },
  { name: 'University of Dhaka', type: 'education', lat: 23.7335, lon: 90.3968, level: 2, wave: 0 },
  { name: 'Chittagong Port', type: 'manufacturing', lat: 22.3369, lon: 91.8340, level: 3, wave: 0 },
  { name: 'Bangabandhu Hi-Tech City', type: 'tech', lat: 23.8103, lon: 90.4125, level: 2, wave: 0 },
  { name: 'Dhaka Medical College', type: 'healthcare', lat: 23.7254, lon: 90.3984, level: 2, wave: 0 },
  { name: 'Beximco Pharma Complex', type: 'pharma', lat: 23.8770, lon: 90.2724, level: 2, wave: 0 },
  { name: 'Bashundhara City Mall', type: 'retail', lat: 23.7775, lon: 90.4100, level: 2, wave: 0 },
  { name: 'Lalbagh Fort Heritage', type: 'cultural', lat: 23.7189, lon: 90.3884, level: 1, wave: 0 },
  { name: 'Pan Pacific Sonargaon Hotel', type: 'hospitality', lat: 23.7345, lon: 90.4139, level: 2, wave: 0 },

  // ── ISRAEL ──
  { name: 'Tel Aviv Stock Exchange', type: 'finance', lat: 32.0853, lon: 34.7818, level: 4, wave: 0 },
  { name: 'Technion University', type: 'education', lat: 32.7764, lon: 35.0236, level: 4, wave: 0 },
  { name: 'Rafael Advanced Defense', type: 'defense', lat: 32.8031, lon: 34.9918, level: 4, wave: 0 },
  { name: 'Hadassah Medical Center', type: 'healthcare', lat: 31.7644, lon: 35.1497, level: 3, wave: 0 },
  { name: 'Teva Pharmaceutical HQ', type: 'pharma', lat: 32.0928, lon: 34.8338, level: 4, wave: 0 },
  { name: 'Wix.com Tel Aviv HQ', type: 'tech', lat: 32.0738, lon: 34.7893, level: 3, wave: 0 },
  { name: 'Dead Sea Works', type: 'manufacturing', lat: 31.0806, lon: 35.3727, level: 3, wave: 0 },
  { name: 'Israel Museum Jerusalem', type: 'cultural', lat: 31.7742, lon: 35.2039, level: 3, wave: 0 },
  { name: 'David Intercontinental', type: 'hospitality', lat: 32.0643, lon: 34.7682, level: 3, wave: 0 },
  { name: 'Ashdod Port', type: 'manufacturing', lat: 31.8200, lon: 34.6333, level: 3, wave: 0 },

  // ── IRAN ──
  { name: 'Tehran Stock Exchange', type: 'finance', lat: 35.6892, lon: 51.3890, level: 3, wave: 0 },
  { name: 'Bushehr Nuclear Power Plant', type: 'energy', lat: 28.8328, lon: 50.8853, level: 4, wave: 0 },
  { name: 'University of Tehran', type: 'education', lat: 35.7014, lon: 51.3951, level: 3, wave: 0 },
  { name: 'Abadan Oil Refinery', type: 'oil_gas', lat: 30.3358, lon: 48.2747, level: 4, wave: 0 },
  { name: 'Isfahan Steel Company', type: 'manufacturing', lat: 32.6546, lon: 51.6680, level: 3, wave: 0 },
  { name: 'Milad Hospital Tehran', type: 'healthcare', lat: 35.7336, lon: 51.3867, level: 2, wave: 0 },
  { name: 'Golestan Palace', type: 'cultural', lat: 35.6837, lon: 51.4137, level: 2, wave: 0 },
  { name: 'Kish Island Resort', type: 'hospitality', lat: 26.5400, lon: 54.0200, level: 2, wave: 0 },
  { name: 'Isfahan Grand Bazaar', type: 'retail', lat: 32.6572, lon: 51.6741, level: 2, wave: 0 },
  { name: 'Iran Electronics Industries', type: 'defense', lat: 35.7000, lon: 51.4100, level: 3, wave: 0 },

  // ── NEW ZEALAND ──
  { name: 'NZX Stock Exchange', type: 'finance', lat: -41.2865, lon: 174.7762, level: 3, wave: 0 },
  { name: 'Tiwai Point Aluminium Smelter', type: 'manufacturing', lat: -46.5877, lon: 168.3661, level: 3, wave: 0 },
  { name: 'University of Auckland', type: 'education', lat: -36.8509, lon: 174.7685, level: 3, wave: 0 },
  { name: 'Waikato Hospital', type: 'healthcare', lat: -37.7833, lon: 175.2833, level: 2, wave: 0 },
  { name: 'Te Papa Museum Wellington', type: 'cultural', lat: -41.2904, lon: 174.7820, level: 2, wave: 0 },
  { name: 'Manapouri Hydroelectric', type: 'energy', lat: -45.5000, lon: 167.4167, level: 3, wave: 0 },
  { name: 'Queenstown Resort Hub', type: 'hospitality', lat: -45.0312, lon: 168.6626, level: 3, wave: 0 },
  { name: 'Fonterra Dairy HQ', type: 'manufacturing', lat: -37.7874, lon: 175.3172, level: 3, wave: 0 },
  { name: 'Rocket Lab Launch Complex', type: 'tech', lat: -39.2616, lon: 177.8647, level: 3, wave: 0 },
  { name: 'Sylvia Park Mall Auckland', type: 'retail', lat: -36.9003, lon: 174.8410, level: 2, wave: 0 },

  // ── PORTUGAL ──
  { name: 'Euronext Lisbon', type: 'finance', lat: 38.7131, lon: -9.1363, level: 3, wave: 0 },
  { name: 'Autoeuropa VW Factory', type: 'manufacturing', lat: 38.6313, lon: -9.0556, level: 3, wave: 0 },
  { name: 'University of Coimbra', type: 'education', lat: 40.2089, lon: -8.4262, level: 3, wave: 0 },
  { name: 'Hospital de Santa Maria', type: 'healthcare', lat: 38.7489, lon: -9.1567, level: 2, wave: 0 },
  { name: 'Belem Tower Heritage', type: 'cultural', lat: 38.6916, lon: -9.2160, level: 2, wave: 0 },
  { name: 'Galp Energia Sines Refinery', type: 'oil_gas', lat: 37.9500, lon: -8.8667, level: 3, wave: 0 },
  { name: 'Porto Wine Cellar District', type: 'hospitality', lat: 41.1395, lon: -8.6118, level: 2, wave: 0 },
  { name: 'Sines LNG Terminal', type: 'energy', lat: 37.9443, lon: -8.8681, level: 3, wave: 0 },
  { name: 'CUF Descobertas Hospital', type: 'pharma', lat: 38.7568, lon: -9.0974, level: 2, wave: 0 },
  { name: 'Centro Colombo Lisbon', type: 'retail', lat: 38.7538, lon: -9.1857, level: 2, wave: 0 },

  // ── GREECE ──
  { name: 'Athens Stock Exchange', type: 'finance', lat: 37.9838, lon: 23.7275, level: 3, wave: 0 },
  { name: 'Piraeus Port Authority', type: 'manufacturing', lat: 37.9431, lon: 23.6468, level: 3, wave: 0 },
  { name: 'National Technical University', type: 'education', lat: 37.9803, lon: 23.7831, level: 2, wave: 0 },
  { name: 'Acropolis Museum', type: 'cultural', lat: 37.9685, lon: 23.7284, level: 3, wave: 0 },
  { name: 'Motor Oil Hellas Refinery', type: 'oil_gas', lat: 37.9326, lon: 23.6022, level: 3, wave: 0 },
  { name: 'Evangelismos Hospital', type: 'healthcare', lat: 37.9776, lon: 23.7447, level: 2, wave: 0 },
  { name: 'Costa Navarino Resort', type: 'hospitality', lat: 36.9667, lon: 21.6833, level: 3, wave: 0 },
  { name: 'Ptolemais Power Station', type: 'energy', lat: 40.5000, lon: 21.6833, level: 2, wave: 0 },
  { name: 'Athens Metro HQ', type: 'tech', lat: 37.9755, lon: 23.7348, level: 2, wave: 0 },
  { name: 'Golden Hall Athens', type: 'retail', lat: 38.0325, lon: 23.7883, level: 2, wave: 0 },

  // ── DENMARK ──
  { name: 'Maersk HQ Copenhagen', type: 'manufacturing', lat: 55.6761, lon: 12.5683, level: 4, wave: 0 },
  { name: 'Orsted Wind Energy HQ', type: 'energy', lat: 55.6690, lon: 12.5863, level: 4, wave: 0 },
  { name: 'Novo Nordisk Bagsvaerd', type: 'pharma', lat: 55.7510, lon: 12.4521, level: 5, wave: 0 },
  { name: 'Copenhagen Business School', type: 'education', lat: 55.6816, lon: 12.5303, level: 3, wave: 0 },
  { name: 'Rigshospitalet', type: 'healthcare', lat: 55.6962, lon: 12.5667, level: 3, wave: 0 },
  { name: 'Nasdaq Copenhagen', type: 'finance', lat: 55.6844, lon: 12.5762, level: 3, wave: 0 },
  { name: 'Tivoli Gardens', type: 'venue', lat: 55.6735, lon: 12.5681, level: 3, wave: 0 },
  { name: 'National Museum of Denmark', type: 'cultural', lat: 55.6741, lon: 12.5752, level: 2, wave: 0 },
  { name: 'Hotel dAngleterre', type: 'hospitality', lat: 55.6791, lon: 12.5827, level: 3, wave: 0 },
  { name: 'Lego Group HQ Billund', type: 'manufacturing', lat: 55.7318, lon: 9.1157, level: 3, wave: 0 },

  // ── IRELAND ──
  { name: 'Apple European HQ Cork', type: 'tech', lat: 51.8985, lon: -8.4756, level: 4, wave: 0 },
  { name: 'Euronext Dublin', type: 'finance', lat: 53.3419, lon: -6.2623, level: 3, wave: 0 },
  { name: 'Trinity College Dublin', type: 'education', lat: 53.3438, lon: -6.2546, level: 3, wave: 0 },
  { name: 'Moneypoint Power Station', type: 'energy', lat: 52.6167, lon: -9.4333, level: 3, wave: 0 },
  { name: 'Mater Hospital Dublin', type: 'healthcare', lat: 53.3591, lon: -6.2660, level: 2, wave: 0 },
  { name: 'Pfizer Ringaskiddy Plant', type: 'pharma', lat: 51.8305, lon: -8.3233, level: 3, wave: 0 },
  { name: 'Guinness Storehouse', type: 'venue', lat: 53.3419, lon: -6.2867, level: 2, wave: 0 },
  { name: 'National Gallery of Ireland', type: 'cultural', lat: 53.3396, lon: -6.2521, level: 2, wave: 0 },
  { name: 'Ashford Castle Hotel', type: 'hospitality', lat: 53.5500, lon: -9.5500, level: 3, wave: 0 },
  { name: 'Intel Leixlip Fab', type: 'tech', lat: 53.3650, lon: -6.4901, level: 4, wave: 0 },

  // ── FINLAND ──
  { name: 'Nokia HQ Espoo', type: 'tech', lat: 60.2244, lon: 24.7580, level: 4, wave: 0 },
  { name: 'Olkiluoto Nuclear Plant', type: 'energy', lat: 61.2353, lon: 21.4472, level: 4, wave: 0 },
  { name: 'Helsinki Stock Exchange', type: 'finance', lat: 60.1695, lon: 24.9354, level: 3, wave: 0 },
  { name: 'University of Helsinki', type: 'education', lat: 60.1699, lon: 24.9384, level: 3, wave: 0 },
  { name: 'HUS Helsinki Hospital', type: 'healthcare', lat: 60.1873, lon: 24.9067, level: 2, wave: 0 },
  { name: 'Kiasma Museum', type: 'cultural', lat: 60.1722, lon: 24.9367, level: 2, wave: 0 },
  { name: 'Neste Oil Porvoo Refinery', type: 'oil_gas', lat: 60.3500, lon: 25.6833, level: 3, wave: 0 },
  { name: 'Kempele Data Center', type: 'tech', lat: 64.9147, lon: 25.5122, level: 3, wave: 0 },
  { name: 'Kamppi Centre Helsinki', type: 'retail', lat: 60.1692, lon: 24.9327, level: 2, wave: 0 },
  { name: 'Hotel Kamp Helsinki', type: 'hospitality', lat: 60.1693, lon: 24.9441, level: 3, wave: 0 },

  // ── SINGAPORE ──
  { name: 'Singapore Exchange HQ', type: 'finance', lat: 1.2816, lon: 103.8515, level: 5, wave: 0 },
  { name: 'Jurong Island Petrochemical', type: 'oil_gas', lat: 1.2667, lon: 103.6833, level: 4, wave: 0 },
  { name: 'NUS Singapore', type: 'education', lat: 1.2966, lon: 103.7764, level: 4, wave: 0 },
  { name: 'Singapore General Hospital', type: 'healthcare', lat: 1.2809, lon: 103.8364, level: 3, wave: 0 },
  { name: 'Marina Bay Sands', type: 'hospitality', lat: 1.2834, lon: 103.8607, level: 5, wave: 0 },
  { name: 'Changi Airport Terminal', type: 'manufacturing', lat: 1.3644, lon: 103.9915, level: 4, wave: 0 },
  { name: 'National Museum Singapore', type: 'cultural', lat: 1.2966, lon: 103.8485, level: 2, wave: 0 },
  { name: 'One-North Tech Park', type: 'tech', lat: 1.2994, lon: 103.7878, level: 4, wave: 0 },
  { name: 'VivoCity Mall', type: 'retail', lat: 1.2643, lon: 103.8222, level: 3, wave: 0 },
  { name: 'Tengah Air Base', type: 'defense', lat: 1.3872, lon: 103.7089, level: 3, wave: 0 },

  // ── QATAR ──
  { name: 'Qatar Energy HQ', type: 'oil_gas', lat: 25.2854, lon: 51.5310, level: 5, wave: 0 },
  { name: 'Qatar Financial Centre', type: 'finance', lat: 25.3197, lon: 51.5265, level: 4, wave: 0 },
  { name: 'Qatar University', type: 'education', lat: 25.3756, lon: 51.4906, level: 3, wave: 0 },
  { name: 'Hamad Medical Corporation', type: 'healthcare', lat: 25.2995, lon: 51.5177, level: 3, wave: 0 },
  { name: 'Museum of Islamic Art', type: 'cultural', lat: 25.2954, lon: 51.5395, level: 3, wave: 0 },
  { name: 'Lusail Stadium Complex', type: 'venue', lat: 25.4195, lon: 51.4906, level: 4, wave: 0 },
  { name: 'The Ritz-Carlton Doha', type: 'hospitality', lat: 25.3137, lon: 51.4400, level: 4, wave: 0 },
  { name: 'Ras Laffan LNG Terminal', type: 'energy', lat: 25.9247, lon: 51.5380, level: 5, wave: 0 },
  { name: 'Place Vendome Mall', type: 'retail', lat: 25.3170, lon: 51.4800, level: 3, wave: 0 },
  { name: 'Al Udeid Air Base', type: 'defense', lat: 25.1172, lon: 51.3150, level: 4, wave: 0 },

  // ── ETHIOPIA ──
  { name: 'Grand Ethiopian Renaissance Dam', type: 'energy', lat: 11.2153, lon: 35.0933, level: 5, wave: 0 },
  { name: 'Ethiopian Airlines HQ', type: 'manufacturing', lat: 8.9806, lon: 38.7578, level: 3, wave: 0 },
  { name: 'Addis Ababa University', type: 'education', lat: 9.0364, lon: 38.7633, level: 2, wave: 0 },
  { name: 'Tikur Anbessa Hospital', type: 'healthcare', lat: 9.0340, lon: 38.7620, level: 2, wave: 0 },
  { name: 'National Museum of Ethiopia', type: 'cultural', lat: 9.0187, lon: 38.7491, level: 2, wave: 0 },
  { name: 'Hawassa Industrial Park', type: 'manufacturing', lat: 7.0622, lon: 38.4769, level: 3, wave: 0 },
  { name: 'Ethiopian Commodity Exchange', type: 'finance', lat: 9.0107, lon: 38.7612, level: 2, wave: 0 },
  { name: 'Bole Lemi Industrial Zone', type: 'manufacturing', lat: 8.9367, lon: 38.7989, level: 2, wave: 0 },
  { name: 'Sheraton Addis', type: 'hospitality', lat: 9.0139, lon: 38.7617, level: 3, wave: 0 },
  { name: 'Addis ICT Park', type: 'tech', lat: 9.0225, lon: 38.7400, level: 2, wave: 0 },

  // ── AIRPORTS ── (major international hubs, high capex/income)
  { name: 'John F. Kennedy Intl Airport', type: 'airport', lat: 40.6413, lon: -73.7781, level: 5, wave: 0 },
  { name: 'London Heathrow Airport', type: 'airport', lat: 51.4700, lon: -0.4543, level: 5, wave: 0 },
  { name: 'Dubai International Airport', type: 'airport', lat: 25.2532, lon: 55.3657, level: 5, wave: 0 },
  { name: 'Singapore Changi Airport', type: 'airport', lat: 1.3644, lon: 103.9915, level: 5, wave: 0 },
  { name: 'Tokyo Narita Airport', type: 'airport', lat: 35.7720, lon: 140.3929, level: 4, wave: 0 },
  { name: 'Paris Charles de Gaulle Airport', type: 'airport', lat: 49.0097, lon: 2.5479, level: 5, wave: 0 },
  { name: 'Frankfurt Airport', type: 'airport', lat: 50.0379, lon: 8.5622, level: 4, wave: 0 },
  { name: 'Los Angeles Intl Airport', type: 'airport', lat: 33.9425, lon: -118.4081, level: 5, wave: 0 },
  { name: 'Hong Kong Intl Airport', type: 'airport', lat: 22.3080, lon: 113.9185, level: 5, wave: 0 },
  { name: 'Istanbul Airport', type: 'airport', lat: 41.2753, lon: 28.7519, level: 4, wave: 0 },
  { name: 'Sydney Kingsford Smith Airport', type: 'airport', lat: -33.9461, lon: 151.1772, level: 4, wave: 1 },
  { name: 'São Paulo Guarulhos Airport', type: 'airport', lat: -23.4356, lon: -46.4731, level: 3, wave: 1 },
  { name: 'Mumbai Chhatrapati Shivaji Airport', type: 'airport', lat: 19.0896, lon: 72.8656, level: 4, wave: 1 },
  { name: 'Seoul Incheon Airport', type: 'airport', lat: 37.4602, lon: 126.4407, level: 5, wave: 1 },
  { name: 'Mexico City Intl Airport', type: 'airport', lat: 19.4361, lon: -99.0719, level: 3, wave: 2 },

  // ── PORTS ── (major shipping hubs)
  { name: 'Port of Rotterdam', type: 'port', lat: 51.9050, lon: 4.1467, level: 5, wave: 0 },
  { name: 'Port of Shanghai', type: 'port', lat: 30.6300, lon: 122.0650, level: 5, wave: 0 },
  { name: 'Port of Singapore', type: 'port', lat: 1.2644, lon: 103.8200, level: 5, wave: 0 },
  { name: 'Jebel Ali Port Dubai', type: 'port', lat: 25.0100, lon: 55.0600, level: 5, wave: 0 },
  { name: 'Port of Los Angeles', type: 'port', lat: 33.7395, lon: -118.2600, level: 4, wave: 0 },
  { name: 'Port of Hamburg', type: 'port', lat: 53.5333, lon: 9.9667, level: 4, wave: 0 },
  { name: 'Port of Busan', type: 'port', lat: 35.0788, lon: 129.0750, level: 4, wave: 0 },
  { name: 'Port of Antwerp-Bruges', type: 'port', lat: 51.2700, lon: 4.3400, level: 4, wave: 0 },
  { name: 'Port of Tanjung Pelepas', type: 'port', lat: 1.3627, lon: 103.5500, level: 3, wave: 1 },
  { name: 'Port of Santos Brazil', type: 'port', lat: -23.9530, lon: -46.3000, level: 3, wave: 1 },
  { name: 'Port of Durban', type: 'port', lat: -29.8667, lon: 31.0250, level: 3, wave: 1 },
  { name: 'Port of Piraeus Athens', type: 'port', lat: 37.9400, lon: 23.6350, level: 3, wave: 2 },

  // ── ESG INFRASTRUCTURE ── (green projects, lower income but ESG score bonus)
  { name: 'North Sea Wind Farm Cluster', type: 'esg', lat: 54.0000, lon: 3.0000, level: 4, wave: 0 },
  { name: 'Sahara Solar Park Ouarzazate', type: 'esg', lat: 30.9200, lon: -6.9000, level: 4, wave: 0 },
  { name: 'Tesla Gigafactory Nevada', type: 'esg', lat: 39.5380, lon: -119.4400, level: 5, wave: 0 },
  { name: 'Copenhagen Green Hydrogen Hub', type: 'esg', lat: 55.6761, lon: 12.5683, level: 3, wave: 0 },
  { name: 'Hornsea Offshore Wind Farm', type: 'esg', lat: 53.8800, lon: 1.8000, level: 4, wave: 0 },
  { name: 'Noor Solar Complex Morocco', type: 'esg', lat: 31.0500, lon: -6.8600, level: 4, wave: 1 },
  { name: 'Great Barrier Reef Restoration Project', type: 'esg', lat: -18.2871, lon: 147.6992, level: 3, wave: 1 },
  { name: 'Amazon Reforestation Initiative', type: 'esg', lat: -3.4653, lon: -62.2159, level: 3, wave: 1 },
  { name: 'Bhadla Solar Park India', type: 'esg', lat: 27.5400, lon: 71.9100, level: 5, wave: 1 },
  { name: 'Ocean Cleanup Pacific Station', type: 'esg', lat: 30.0000, lon: -145.0000, level: 3, wave: 2 },
  { name: 'Iceland Geothermal Carbon Capture', type: 'esg', lat: 64.1466, lon: -21.9426, level: 3, wave: 2 },
  { name: 'Singapore Vertical Farm Complex', type: 'esg', lat: 1.3521, lon: 103.8198, level: 3, wave: 2 },
];

// Build all expanded nodes with wave metadata
const ALL_EXPANDED_NODES = SEEDS.map(toNode);

/** Wave 0 nodes — loaded at game start */
export const EXPANDED_NODES_WAVE0: EmpireNode[] = ALL_EXPANDED_NODES
  .filter(n => n._wave === 0)
  .map(({ _wave, ...node }) => node as EmpireNode);

/** Get nodes for a specific wave (1-4) */
export function getWaveNodes(wave: number): EmpireNode[] {
  return ALL_EXPANDED_NODES
    .filter(n => n._wave === wave)
    .map(({ _wave, ...node }) => node as EmpireNode);
}

/** Total count of all expanded nodes across all waves */
export const TOTAL_EXPANDED_COUNT = ALL_EXPANDED_NODES.length;
