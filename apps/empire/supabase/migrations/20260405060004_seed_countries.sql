-- ============================================================
-- Seed countries with real-world regulation data
-- ============================================================

INSERT INTO countries (id, name, government_type, regulations, treasury, approval_rating, military_strength, stability, gdp, population, status) VALUES

-- G7 Countries
('US', 'United States', 'democracy', '{
  "corporate_tax_rate": 0.21, "income_tax_rate": 0.37, "vat_rate": 0.0,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "strict", "defense": "strict", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "light", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["CA","MX","GB","AU","JP","KR"], "sanctions": ["RU","IR","KP","SY"],
  "custom_regulations": []
}'::JSONB, 6800000000000, 42, 100, 0.78, 25460000000000, 334000000, 'sovereign'),

('GB', 'United Kingdom', 'democracy', '{
  "corporate_tax_rate": 0.25, "income_tax_rate": 0.45, "vat_rate": 0.20,
  "sector_regulations": {"finance": "strict", "tech": "moderate", "pharma": "strict", "defense": "strict", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "strict",
  "trade_agreements": ["US","AU","JP","NZ"], "sanctions": ["RU","IR","KP","SY"],
  "custom_regulations": []
}'::JSONB, 1100000000000, 38, 80, 0.72, 3070000000000, 67000000, 'sovereign'),

('DE', 'Germany', 'democracy', '{
  "corporate_tax_rate": 0.30, "income_tax_rate": 0.45, "vat_rate": 0.19,
  "sector_regulations": {"finance": "strict", "tech": "moderate", "pharma": "strict", "defense": "strict", "energy": "strict", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "strict", "retail": "moderate", "hospitality": "moderate", "venue": "moderate", "cultural": "moderate"},
  "labor_laws": "strict", "environmental_rules": "strict",
  "trade_agreements": ["US","GB","FR","IT","JP","CN"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 450000000000, 45, 70, 0.82, 4070000000000, 84000000, 'sovereign'),

('FR', 'France', 'democracy', '{
  "corporate_tax_rate": 0.25, "income_tax_rate": 0.45, "vat_rate": 0.20,
  "sector_regulations": {"finance": "strict", "tech": "moderate", "pharma": "strict", "defense": "strict", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "strict", "retail": "moderate", "hospitality": "light", "venue": "moderate", "cultural": "strict"},
  "labor_laws": "strict", "environmental_rules": "strict",
  "trade_agreements": ["US","GB","DE","IT","JP"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 380000000000, 35, 75, 0.70, 2780000000000, 68000000, 'sovereign'),

('JP', 'Japan', 'democracy', '{
  "corporate_tax_rate": 0.23, "income_tax_rate": 0.45, "vat_rate": 0.10,
  "sector_regulations": {"finance": "strict", "tech": "moderate", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","GB","AU","KR","DE"], "sanctions": ["RU","KP"],
  "custom_regulations": []
}'::JSONB, 600000000000, 48, 65, 0.88, 4230000000000, 125000000, 'sovereign'),

('CA', 'Canada', 'democracy', '{
  "corporate_tax_rate": 0.15, "income_tax_rate": 0.33, "vat_rate": 0.05,
  "sector_regulations": {"finance": "strict", "tech": "light", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "light", "manufacturing": "light", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "strict",
  "trade_agreements": ["US","MX","GB","AU","JP"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 350000000000, 44, 55, 0.85, 2140000000000, 39000000, 'sovereign'),

('IT', 'Italy', 'democracy', '{
  "corporate_tax_rate": 0.24, "income_tax_rate": 0.43, "vat_rate": 0.22,
  "sector_regulations": {"finance": "moderate", "tech": "moderate", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "moderate", "retail": "moderate", "hospitality": "light", "venue": "moderate", "cultural": "strict"},
  "labor_laws": "strict", "environmental_rules": "moderate",
  "trade_agreements": ["US","DE","FR","GB"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 290000000000, 36, 60, 0.65, 2010000000000, 59000000, 'sovereign'),

-- BRICS+
('CN', 'China', 'communist', '{
  "corporate_tax_rate": 0.25, "income_tax_rate": 0.45, "vat_rate": 0.13,
  "sector_regulations": {"finance": "strict", "tech": "strict", "pharma": "strict", "defense": "strict", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "strict", "retail": "moderate", "hospitality": "moderate", "venue": "moderate", "cultural": "strict"},
  "labor_laws": "light", "environmental_rules": "moderate",
  "trade_agreements": ["RU","BR","IN","SA","AE"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 3500000000000, 72, 95, 0.80, 17960000000000, 1410000000, 'sovereign'),

('IN', 'India', 'democracy', '{
  "corporate_tax_rate": 0.22, "income_tax_rate": 0.30, "vat_rate": 0.18,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "moderate", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "light",
  "trade_agreements": ["RU","AE","JP","AU"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 450000000000, 62, 75, 0.68, 3730000000000, 1430000000, 'sovereign'),

('BR', 'Brazil', 'democracy', '{
  "corporate_tax_rate": 0.34, "income_tax_rate": 0.28, "vat_rate": 0.17,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "strict", "environmental_rules": "moderate",
  "trade_agreements": ["CN","AR","CL","MX"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 280000000000, 40, 65, 0.60, 2170000000000, 216000000, 'sovereign'),

('RU', 'Russia', 'autocracy', '{
  "corporate_tax_rate": 0.20, "income_tax_rate": 0.13, "vat_rate": 0.20,
  "sector_regulations": {"finance": "moderate", "tech": "moderate", "pharma": "moderate", "defense": "strict", "energy": "light", "oil_gas": "light", "manufacturing": "moderate", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "light",
  "trade_agreements": ["CN","IN","AE","TR"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 800000000000, 68, 90, 0.55, 1860000000000, 144000000, 'sovereign'),

('ZA', 'South Africa', 'democracy', '{
  "corporate_tax_rate": 0.27, "income_tax_rate": 0.45, "vat_rate": 0.15,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "strict", "environmental_rules": "moderate",
  "trade_agreements": ["CN","IN","BR"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 80000000000, 35, 45, 0.52, 399000000000, 62000000, 'sovereign'),

-- Major Economies
('AU', 'Australia', 'democracy', '{
  "corporate_tax_rate": 0.30, "income_tax_rate": 0.45, "vat_rate": 0.10,
  "sector_regulations": {"finance": "strict", "tech": "light", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "light", "manufacturing": "light", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "strict", "environmental_rules": "moderate",
  "trade_agreements": ["US","GB","JP","KR","NZ"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 180000000000, 48, 55, 0.85, 1680000000000, 26000000, 'sovereign'),

('KR', 'South Korea', 'democracy', '{
  "corporate_tax_rate": 0.24, "income_tax_rate": 0.45, "vat_rate": 0.10,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","JP","AU","GB"], "sanctions": ["KP"],
  "custom_regulations": []
}'::JSONB, 250000000000, 45, 75, 0.82, 1720000000000, 52000000, 'sovereign'),

('MX', 'Mexico', 'democracy', '{
  "corporate_tax_rate": 0.30, "income_tax_rate": 0.35, "vat_rate": 0.16,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","CA","BR","CL"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 120000000000, 38, 55, 0.58, 1320000000000, 130000000, 'sovereign'),

-- Middle East / Gulf
('SA', 'Saudi Arabia', 'monarchy', '{
  "corporate_tax_rate": 0.20, "income_tax_rate": 0.0, "vat_rate": 0.15,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "moderate", "hospitality": "light", "venue": "moderate", "cultural": "strict"},
  "labor_laws": "light", "environmental_rules": "light",
  "trade_agreements": ["CN","AE","IN","EG"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 600000000000, 75, 85, 0.82, 1060000000000, 37000000, 'sovereign'),

('AE', 'United Arab Emirates', 'monarchy', '{
  "corporate_tax_rate": 0.09, "income_tax_rate": 0.0, "vat_rate": 0.05,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "light", "environmental_rules": "light",
  "trade_agreements": ["CN","IN","SA","GB","US"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 400000000000, 80, 70, 0.90, 507000000000, 10000000, 'sovereign'),

('IL', 'Israel', 'democracy', '{
  "corporate_tax_rate": 0.23, "income_tax_rate": 0.50, "vat_rate": 0.17,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "strict", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "light", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","GB","DE"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 120000000000, 42, 90, 0.55, 525000000000, 10000000, 'sovereign'),

('TR', 'Turkey', 'autocracy', '{
  "corporate_tax_rate": 0.25, "income_tax_rate": 0.40, "vat_rate": 0.20,
  "sector_regulations": {"finance": "moderate", "tech": "moderate", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["RU","AE","GB","DE"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 150000000000, 48, 70, 0.55, 905000000000, 86000000, 'sovereign'),

-- Southeast Asia
('SG', 'Singapore', 'democracy', '{
  "corporate_tax_rate": 0.17, "income_tax_rate": 0.22, "vat_rate": 0.09,
  "sector_regulations": {"finance": "strict", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "light", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","CN","AU","JP","IN","GB"], "sanctions": ["KP"],
  "custom_regulations": []
}'::JSONB, 90000000000, 72, 50, 0.95, 497000000000, 6000000, 'sovereign'),

('ID', 'Indonesia', 'democracy', '{
  "corporate_tax_rate": 0.22, "income_tax_rate": 0.35, "vat_rate": 0.11,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "light",
  "trade_agreements": ["CN","JP","AU","IN","SG"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 80000000000, 55, 50, 0.68, 1320000000000, 277000000, 'sovereign'),

-- Africa
('NG', 'Nigeria', 'democracy', '{
  "corporate_tax_rate": 0.30, "income_tax_rate": 0.24, "vat_rate": 0.08,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "light", "environmental_rules": "light",
  "trade_agreements": ["CN","GB","IN"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 35000000000, 32, 45, 0.45, 477000000000, 224000000, 'sovereign'),

('KE', 'Kenya', 'democracy', '{
  "corporate_tax_rate": 0.30, "income_tax_rate": 0.30, "vat_rate": 0.16,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["CN","US","GB","IN"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 12000000000, 42, 35, 0.58, 113000000000, 56000000, 'sovereign'),

('EG', 'Egypt', 'autocracy', '{
  "corporate_tax_rate": 0.225, "income_tax_rate": 0.25, "vat_rate": 0.14,
  "sector_regulations": {"finance": "moderate", "tech": "moderate", "pharma": "moderate", "defense": "strict", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "light",
  "trade_agreements": ["SA","AE","CN","TR"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 45000000000, 48, 65, 0.55, 404000000000, 109000000, 'sovereign'),

-- Europe
('CH', 'Switzerland', 'democracy', '{
  "corporate_tax_rate": 0.14, "income_tax_rate": 0.40, "vat_rate": 0.08,
  "sector_regulations": {"finance": "strict", "tech": "light", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "strict",
  "trade_agreements": ["DE","FR","IT","US","GB"], "sanctions": ["RU"],
  "custom_regulations": []
}'::JSONB, 85000000000, 65, 35, 0.95, 818000000000, 9000000, 'sovereign'),

('NL', 'Netherlands', 'democracy', '{
  "corporate_tax_rate": 0.256, "income_tax_rate": 0.495, "vat_rate": 0.21,
  "sector_regulations": {"finance": "strict", "tech": "moderate", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "strict", "environmental_rules": "strict",
  "trade_agreements": ["US","GB","DE","FR"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 70000000000, 52, 40, 0.88, 1010000000000, 18000000, 'sovereign'),

('SE', 'Sweden', 'democracy', '{
  "corporate_tax_rate": 0.206, "income_tax_rate": 0.52, "vat_rate": 0.25,
  "sector_regulations": {"finance": "strict", "tech": "light", "pharma": "strict", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "moderate", "healthcare": "strict", "education": "strict", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "strict", "environmental_rules": "strict",
  "trade_agreements": ["US","GB","DE","FR","NO","DK","FI"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 60000000000, 55, 45, 0.90, 585000000000, 11000000, 'sovereign'),

('IE', 'Ireland', 'democracy', '{
  "corporate_tax_rate": 0.125, "income_tax_rate": 0.40, "vat_rate": 0.23,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "light", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","GB","DE","FR"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 45000000000, 58, 25, 0.88, 530000000000, 5000000, 'sovereign'),

-- Americas
('AR', 'Argentina', 'democracy', '{
  "corporate_tax_rate": 0.35, "income_tax_rate": 0.35, "vat_rate": 0.21,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "strict", "environmental_rules": "light",
  "trade_agreements": ["BR","CL","MX"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 35000000000, 30, 40, 0.42, 632000000000, 46000000, 'sovereign'),

('CL', 'Chile', 'democracy', '{
  "corporate_tax_rate": 0.27, "income_tax_rate": 0.40, "vat_rate": 0.19,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["US","CN","BR","MX","AU"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 25000000000, 42, 35, 0.72, 301000000000, 20000000, 'sovereign'),

-- Tax Havens / Special
('KY', 'Cayman Islands', 'democracy', '{
  "corporate_tax_rate": 0.0, "income_tax_rate": 0.0, "vat_rate": 0.0,
  "sector_regulations": {"finance": "light", "tech": "light", "pharma": "light", "defense": "light", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "light", "education": "light", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "light"},
  "labor_laws": "light", "environmental_rules": "light",
  "trade_agreements": ["US","GB"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 5000000000, 70, 5, 0.92, 6500000000, 68000, 'sovereign'),

('LU', 'Luxembourg', 'democracy', '{
  "corporate_tax_rate": 0.17, "income_tax_rate": 0.42, "vat_rate": 0.17,
  "sector_regulations": {"finance": "strict", "tech": "light", "pharma": "moderate", "defense": "light", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "strict", "environmental_rules": "strict",
  "trade_agreements": ["DE","FR","BE","NL","US"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 30000000000, 62, 10, 0.95, 86000000000, 660000, 'sovereign'),

-- Emerging
('VN', 'Vietnam', 'communist', '{
  "corporate_tax_rate": 0.20, "income_tax_rate": 0.35, "vat_rate": 0.10,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "strict", "energy": "light", "oil_gas": "light", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "light", "environmental_rules": "light",
  "trade_agreements": ["CN","JP","KR","US","AU"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 30000000000, 68, 55, 0.75, 430000000000, 100000000, 'sovereign'),

('PL', 'Poland', 'democracy', '{
  "corporate_tax_rate": 0.19, "income_tax_rate": 0.32, "vat_rate": 0.23,
  "sector_regulations": {"finance": "moderate", "tech": "light", "pharma": "moderate", "defense": "moderate", "energy": "moderate", "oil_gas": "moderate", "manufacturing": "light", "healthcare": "moderate", "education": "moderate", "retail": "light", "hospitality": "light", "venue": "light", "cultural": "moderate"},
  "labor_laws": "moderate", "environmental_rules": "moderate",
  "trade_agreements": ["DE","FR","US","GB"], "sanctions": ["RU","IR","KP"],
  "custom_regulations": []
}'::JSONB, 40000000000, 45, 55, 0.75, 688000000000, 38000000, 'sovereign'),

-- Contested / Fragile
('KP', 'North Korea', 'autocracy', '{
  "corporate_tax_rate": 0.0, "income_tax_rate": 0.0, "vat_rate": 0.0,
  "sector_regulations": {"finance": "strict", "tech": "strict", "pharma": "strict", "defense": "strict", "energy": "strict", "oil_gas": "strict", "manufacturing": "strict", "healthcare": "strict", "education": "strict", "retail": "strict", "hospitality": "strict", "venue": "strict", "cultural": "strict"},
  "labor_laws": "strict", "environmental_rules": "light",
  "trade_agreements": ["CN"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 5000000000, 95, 80, 0.40, 28000000000, 26000000, 'sovereign'),

('IR', 'Iran', 'theocracy', '{
  "corporate_tax_rate": 0.25, "income_tax_rate": 0.35, "vat_rate": 0.09,
  "sector_regulations": {"finance": "strict", "tech": "moderate", "pharma": "moderate", "defense": "strict", "energy": "light", "oil_gas": "light", "manufacturing": "moderate", "healthcare": "moderate", "education": "moderate", "retail": "moderate", "hospitality": "moderate", "venue": "strict", "cultural": "strict"},
  "labor_laws": "moderate", "environmental_rules": "light",
  "trade_agreements": ["CN","RU","TR","IN"], "sanctions": [],
  "custom_regulations": []
}'::JSONB, 50000000000, 55, 75, 0.48, 388000000000, 88000000, 'sovereign')

ON CONFLICT (id) DO NOTHING;
