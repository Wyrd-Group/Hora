-- ============================================================================
-- Seed: Regulatory Source Whitelist (Tier-1 topics, 4 countries)
-- ============================================================================
-- Only official government / regulator sources. Wikipedia, news sites, blogs
-- are NEVER seeded here — they are not trusted sources of legal truth.
-- ============================================================================

-- ------------------------- FRANCE -------------------------------------------
INSERT INTO regulatory_sources (country_code, topic, source_url, source_type, source_authority, notes) VALUES
  ('FR', 'income_tax_brackets',
    'https://www.service-public.fr/particuliers/vosdroits/F1419',
    'government', 'service-public.fr',
    'Barème progressif de l''impôt sur le revenu — look for tranches and seuils'),
  ('FR', 'pea_limits',
    'https://www.service-public.fr/particuliers/vosdroits/F2385',
    'government', 'service-public.fr',
    'Plan d''Épargne en Actions — plafond de versements, durée de détention'),
  ('FR', 'livret_a_rate',
    'https://www.service-public.fr/particuliers/vosdroits/F2365',
    'government', 'service-public.fr',
    'Taux du Livret A et plafond de dépôt'),
  ('FR', 'assurance_vie_taxation',
    'https://www.impots.gouv.fr/particulier/lassurance-vie',
    'government', 'impots.gouv.fr',
    'Assurance-vie — abattements annuels et taux après 8 ans'),
  ('FR', 'capital_gains_tax',
    'https://www.impots.gouv.fr/particulier/les-plus-values-mobilieres',
    'government', 'impots.gouv.fr',
    'Prélèvement Forfaitaire Unique (PFU / flat tax) sur plus-values mobilières'),
  ('FR', 'social_security_contributions',
    'https://www.urssaf.fr/accueil/employeur/cotisations/taux-cotisations.html',
    'government', 'URSSAF',
    'Taux de cotisations sociales employeur et salarié'),
  ('FR', 'vat_rate',
    'https://www.service-public.fr/professionnels-entreprises/vosdroits/F23567',
    'government', 'service-public.fr',
    'Taux de TVA — normal, intermédiaire, réduit, super-réduit');

-- ------------------------- UNITED KINGDOM -----------------------------------
INSERT INTO regulatory_sources (country_code, topic, source_url, source_type, source_authority, notes) VALUES
  ('UK', 'income_tax_brackets',
    'https://www.gov.uk/income-tax-rates',
    'government', 'HMRC',
    'Income Tax rates and Personal Allowance — basic/higher/additional rate thresholds'),
  ('UK', 'isa_allowance',
    'https://www.gov.uk/individual-savings-accounts',
    'government', 'HMRC',
    'ISA annual allowance (currently £20,000) — all ISA types combined'),
  ('UK', 'lifetime_isa',
    'https://www.gov.uk/lifetime-isa',
    'government', 'HMRC',
    'Lifetime ISA — £4,000 annual limit, 25% government bonus'),
  ('UK', 'pension_annual_allowance',
    'https://www.gov.uk/tax-on-your-private-pension/annual-allowance',
    'government', 'HMRC',
    'Pension annual allowance, tapered allowance for high earners'),
  ('UK', 'capital_gains_tax',
    'https://www.gov.uk/capital-gains-tax/rates',
    'government', 'HMRC',
    'CGT rates and annual exempt amount'),
  ('UK', 'national_insurance',
    'https://www.gov.uk/national-insurance-rates-letters',
    'government', 'HMRC',
    'NI contribution rates — Class 1/2/3/4 and thresholds'),
  ('UK', 'vat_rate',
    'https://www.gov.uk/vat-rates',
    'government', 'HMRC',
    'UK VAT rates — standard, reduced, zero');

-- ------------------------- GERMANY ------------------------------------------
INSERT INTO regulatory_sources (country_code, topic, source_url, source_type, source_authority, notes) VALUES
  ('DE', 'income_tax_brackets',
    'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerarten/Einkommensteuer/einkommensteuer.html',
    'government', 'Bundesfinanzministerium',
    'Einkommensteuer — Grundfreibetrag, Progressionszonen, Spitzensteuersatz'),
  ('DE', 'riester_rente',
    'https://www.bmas.de/DE/Soziales/Rente-und-Altersvorsorge/Private-Altersvorsorge/Riester-Rente/riester-rente.html',
    'government', 'BMAS',
    'Riester-Rente — Grundzulage, Kinderzulage, Höchstbetrag'),
  ('DE', 'rurup_rente',
    'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerarten/Einkommensteuer/Altersvorsorge/Basis-Rente/basis-rente.html',
    'government', 'Bundesfinanzministerium',
    'Basisrente / Rürup — absetzbarer Höchstbetrag'),
  ('DE', 'capital_gains_tax',
    'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerarten/Abgeltungsteuer/abgeltungsteuer.html',
    'government', 'Bundesfinanzministerium',
    'Abgeltungsteuer 25% + Soli + KiSt; Sparerpauschbetrag'),
  ('DE', 'social_security_contributions',
    'https://www.bundesgesundheitsministerium.de/themen/krankenversicherung/beitragssatz.html',
    'government', 'BMG',
    'Kranken-, Renten-, Pflege-, Arbeitslosenversicherung Beitragssätze'),
  ('DE', 'vat_rate',
    'https://www.bundesfinanzministerium.de/Web/DE/Themen/Steuern/Steuerarten/Umsatzsteuer/umsatzsteuer.html',
    'government', 'Bundesfinanzministerium',
    'Umsatzsteuer — Regelsatz 19%, ermäßigt 7%');

-- ------------------------- UNITED STATES ------------------------------------
INSERT INTO regulatory_sources (country_code, topic, source_url, source_type, source_authority, notes) VALUES
  ('US', 'income_tax_brackets',
    'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets',
    'government', 'IRS',
    'Federal income tax brackets — single/MFJ/MFS/HoH for current year'),
  ('US', 'standard_deduction',
    'https://www.irs.gov/taxtopics/tc551',
    'government', 'IRS',
    'Standard deduction amounts by filing status'),
  ('US', 'roth_ira_limits',
    'https://www.irs.gov/retirement-plans/plan-participant-employee/amount-of-roth-ira-contributions-that-you-can-make-for-the-year',
    'government', 'IRS',
    'Roth IRA contribution limits, MAGI phase-out ranges'),
  ('US', 'traditional_ira_limits',
    'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-ira-contribution-limits',
    'government', 'IRS',
    'Traditional IRA contribution limits, catch-up for 50+'),
  ('US', '401k_limits',
    'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits',
    'government', 'IRS',
    '401(k) elective deferral limit, catch-up contribution, 415(c) limit'),
  ('US', 'hsa_limits',
    'https://www.irs.gov/publications/p969',
    'government', 'IRS',
    'HSA contribution limits — self-only and family coverage, HDHP minimums'),
  ('US', 'capital_gains_tax',
    'https://www.irs.gov/taxtopics/tc409',
    'government', 'IRS',
    'Long-term / short-term capital gains rates, NIIT'),
  ('US', 'social_security_wage_base',
    'https://www.ssa.gov/oact/cola/cbb.html',
    'government', 'SSA',
    'OASDI contribution and benefit base, COLA');

-- ------------------------- AUDIT LOG ----------------------------------------
INSERT INTO fact_change_log (action, actor_type, actor_id, details)
VALUES (
  'sources_seeded',
  'human',
  'system',
  jsonb_build_object(
    'migration', '20260420000002_regulatory_seed',
    'source_count', (SELECT count(*) FROM regulatory_sources),
    'countries', jsonb_build_array('FR', 'UK', 'DE', 'US')
  )
);
