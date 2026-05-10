import { Perk } from '../store/empireStore';

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

export const PERKS: Perk[] = [
  // ── LIFESTYLE ──────────────────────────────────────────
  {
    id: generateId('perk'),
    name: 'Private Jet Fleet (Gulfstream G700)',
    type: 'Lifestyle',
    description: 'Bypass commercial travel completely. Allows you to rapidly expand your geographic footprint without travel fatigue delays.',
    effect: 'Global travel time reduced by 90%',
    imageUrl: 'https://www.shutterstock.com/image-photo/private-jet-on-runway-260nw-2395467135.jpg',
    value: 75000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Exclusive Country Club Access',
    type: 'Lifestyle',
    description: 'A membership to the most exclusive hidden clubs in London, New York, and Tokyo. Meet the shadow elite.',
    effect: 'Unlock Tier 2 Shadow Ops contacts',
    imageUrl: 'https://i.pinimg.com/236x/48/20/70/48207086bd0b5a3a1816497ffcaa45ec.jpg',
    value: 5000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Met Gala Advisory Board',
    type: 'Lifestyle',
    description: 'Dictate the most prestigious social event in New York. You decide who is culturally relevant. Massive ego boost.',
    effect: 'Follower Gain Rate +50%',
    imageUrl: 'https://www.ap.org/wp-content/uploads/bis-images/46046/APTOPIX_2025_MET_Gala_The_Carlyle_Hotel_Departu_25126103632714-416x300-f50_50.jpg',
    value: 12000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Private Island (Caribbean)',
    type: 'Lifestyle',
    description: 'A 500-acre sovereign oasis. Hosts private negotiations away from prying eyes and regulatory agencies.',
    effect: 'Tax evasion efficiency +10%',
    imageUrl: 'https://sunrisecapitalgroup.com/wp-content/uploads/2025/05/leonardo_phoenix_09_aerial_view_of_a_luxurious_private_island_0.jpg',
    value: 45000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Personal Michelin Chef',
    type: 'Lifestyle',
    description: 'Retain a 3-star Michelin chef for 24/7 personal availability. Increases energy and daily stamina significantly.',
    effect: 'Stamina recovery +25%',
    imageUrl: 'https://globalimagecreation.com/wp-content/uploads/2018/01/food_photographer-globalimagecreation.comJMM_7357-min.jpg.webp',
    value: 1100000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Global Concierge Elite Tier',
    type: 'Lifestyle',
    description: 'A shadowy concierge service that can procure anything globally—from ancient art to last-minute front row seats.',
    effect: 'VIP event access unlocked',
    imageUrl: 'https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=768,h=538,fit=crop/mP4nZMjnNRsreL7y/22-dOqyMnxbqVH69r6g.jpg',
    value: 850000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Custom Superyacht (120m)',
    type: 'Lifestyle',
    description: 'The ultimate symbol of maritime dominance. Complete with a helipad and submarine dock. Incredible networking venue.',
    effect: 'Influence Growth +15%',
    imageUrl: 'https://www.yachtinteriorsociety.com/wp-content/uploads/2020/12/Superyacht-concept-Ultra2-Aft2.jpg',
    value: 185000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Bespoke Wardrobe Retainer',
    type: 'Lifestyle',
    description: 'Custom-tailored suits from Savile Row on speed dial. Your presence automatically commands immense institutional respect.',
    effect: 'Negotiation power +10%',
    imageUrl: 'https://urbanwardrobes.co.uk/?seraph_accel_gi=wp-content/uploads/elizabeth-burke/1_2.jpg&n=SJVTPmA1awSqTkZiMU6mng',
    value: 250000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Courtside Knicks Season Tickets',
    type: 'Lifestyle',
    description: 'Undisputed cultural dominance. A prime location to seal lucrative handshake deals with celebrities.',
    effect: 'Networking Events +20%',
    imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3844258054687535132',
    value: 1500000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Private Sommelier & Cellar',
    type: 'Lifestyle',
    description: 'A dedicated master sommelier managing a $10M wine cellar. Impress crucial business partners.',
    effect: 'Partnership Success +5%',
    imageUrl: 'https://images.squarespace-cdn.com/content/v1/54b59944e4b098c8354feafa/1565981672633-U44SJOVBL2CCH3XCTEJF/modern-wine-cellar-design-minimal-furniture.jpg',
    value: 5500000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Swiss Alps Ski Chalet',
    type: 'Lifestyle',
    description: 'A massive 10,000 sqft ski-in/ski-out chalet in St. Moritz. Hosts annual winter conferences for billionaires.',
    effect: 'Global Elite Standing +2',
    imageUrl: 'https://onekindesign.com/wp-content/uploads/2016/11/Luxury-Chalet-Aconcagua-Zermatt-Switzerland-03-1-Kindesign.jpg',
    value: 22000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Helicopter Transfer Service',
    type: 'Lifestyle',
    description: 'An AgustaWestland AW139 helicopter permanently on standby for inner-city jumps.',
    effect: 'Commute times eliminated',
    imageUrl: 'https://www.hoverfly.it/assets/images/8-700x525.webp',
    value: 12000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'High-Stakes Poker Syndicate',
    type: 'Lifestyle',
    description: 'Exclusive entry into a €1M buy-in underground poker ring. High-risk networking.',
    effect: 'Unlocks High-Roller mini-games',
    imageUrl: 'https://www.shutterstock.com/image-photo/stack-poker-chips-highstakes-casino-260nw-2409608903.jpg',
    value: 10000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Art Basel VVIP Pass',
    type: 'Lifestyle',
    description: 'First-look access to the world\'s most lucrative contemporary art sales before public openings.',
    effect: 'Art acquisition discount -15%',
    imageUrl: 'https://images.squarespace-cdn.com/content/v1/5ea05de815fe1b3b2f17f085/3a1f8b7e-dee3-4b4c-af84-c053c86e43f3/Guided+Tours.jpeg',
    value: 450000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Monaco Grand Prix Yacht View',
    type: 'Lifestyle',
    description: 'Permanent mooring privileges during the F1 weekend. Central hub for European elite networking.',
    effect: 'European Influence +10',
    imageUrl: 'https://www.senategrandprix.com/SEODataImages/125/44m YACH COMPRESS POD IMAGE.jpg',
    value: 35000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Sovereign Immunity Watch',
    type: 'Lifestyle',
    description: 'A custom Richard Mille that serves as an emergency transponder for immediate private extraction.',
    effect: 'Shadow Op Fail Penalty -50%',
    imageUrl: 'https://img.everywatch.com/media/2025/05/22/sovereign43505914.jpg',
    value: 3200000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Underground Doomsday Bunker',
    type: 'Lifestyle',
    description: 'A 5-star luxury bunker in New Zealand. Paranoia meets absolute comfort.',
    effect: 'Asset seizure protection +25%',
    imageUrl: 'https://www.arch2o.com/wp-content/uploads/2023/08/Arch2O-safe-havens-of-luxury-15-doomsday-bunkers-around-the-world-9.jpg',
    value: 45000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Premium Life Extension Clinic',
    type: 'Lifestyle',
    description: '24/7 access to experimental blood-boy therapies and hyperbaric regeneration chambers.',
    effect: 'Health decay paused',
    imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3780380106133483625',
    value: 8500000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Private Orbital Tourist Ticket',
    type: 'Lifestyle',
    description: 'A confirmed seat on the next commercial SpaceX or Blue Origin orbital mission.',
    effect: 'Follower Gain +100%',
    imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3775883052959316088',
    value: 40000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Legacy Ivy League Donation',
    type: 'Lifestyle',
    description: 'Rename a prestigious university wing after your family. Guarantees admission for your lineage.',
    effect: 'Reputation scrubbing +30%',
    imageUrl: 'https://i.pinimg.com/236x/bf/a7/61/bfa761cc4aacfc072057bb48931e2e7d.jpg',
    value: 55000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Personal Philharmonia Orchestra',
    type: 'Lifestyle',
    description: 'A private chamber orchestra retained for your absolute leisure and event hosting.',
    effect: 'Cultural Prestige +15',
    imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3861498530397701914',
    value: 4200000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Himalayan Private Retreat',
    type: 'Lifestyle',
    description: 'A completely off-grid luxury monastery. Excellent for digital detox and dodging subpoenas.',
    effect: 'Heat decays twice as fast',
    imageUrl: 'https://himalayaninstitute.org/wp-content/uploads/2016/08/guest-house-five@2x.jpg',
    value: 14000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Global Nightclub Ownership',
    type: 'Lifestyle',
    description: 'Owning the hottest venue in Ibiza. Total control over European nightlife royalty.',
    effect: 'Passive Cashflow +€100k/mo',
    imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3865622331678320453',
    value: 28000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Boutique Perfume Label',
    type: 'Lifestyle',
    description: 'A personal scent line engineered from extinct flowers. Given exclusively as diplomatic gifts.',
    effect: 'Diplomacy success +10%',
    imageUrl: 'https://i.etsystatic.com/22823368/r/il/8591a7/3649443759/il_fullxfull.3649443759_np6a.jpg',
    value: 1800000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Private Zoo Menagerie',
    type: 'Lifestyle',
    description: 'Exotic and endangered animals housed on your private estate. Highly illegal but deeply impressive.',
    effect: 'Fear Factor +20',
    imageUrl: 'https://c8.alamy.com/comp/2T33PKT/large-brown-hairy-bear-sits-in-spacious-enclosure-in-zoo-2T33PKT.jpg',
    value: 85000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'F1 Team Sponsorship',
    type: 'Lifestyle',
    description: 'Your brand logo plastered on a leading Formula 1 car. Massive global advertising prestige.',
    effect: 'Monthly Income +5%',
    imageUrl: 'https://media.formula1.com/image/upload/c_lfill,w_1296/q_auto/v1740000001/fom-website/static-assets/2026/races/card/miami.webp',
    value: 45000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Custom Pagani Huayra R',
    type: 'Lifestyle',
    description: 'A track-only hypercar built entirely tailored to your exact biometric specifications.',
    effect: 'Speed/Ego Boost +50%',
    imageUrl: 'https://hyper.luxe/wp-content/uploads/2024/02/pagani-huayra-r-evo-3.jpg',
    value: 6500000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Private Security Detail',
    type: 'Lifestyle',
    description: 'A 24/7 convoy of ex-Mossad operatives securing your physical assets.',
    effect: 'Protection against assassinations',
    imageUrl: 'https://media.gettyimages.com/id/565877347/photo/caucasian-security-guard-sitting-in-control-room.jpg?s=612x612&w=gi&k=20&c=-zRtqqiCog3Az7DkfYdAJAhDn7hzoLmzp5931mNquGk=',
    value: 3500000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Sotheby\'s Platinum Account',
    type: 'Lifestyle',
    description: 'The highest tier of auction access. You are notified of distressed assets before anyone else.',
    effect: 'Asset Market Insight +1',
    imageUrl: 'https://sothebys-md.brightspotcdn.com/83/22/a5e4981144f1a7972b69693c7b29/n11190-cp9p6-t1-02.jpg',
    value: 1200000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Personal Space Telescope',
    type: 'Lifestyle',
    description: 'Funding a small satellite that relays live feeds of deep space straight to your office.',
    effect: 'Tech Sector prestige +10%',
    imageUrl: 'https://astrobackyard.com/wp-content/uploads/2024/09/sqa55-with-autoguiding-kit.jpg',
    value: 150000000,
    owned: false
  },
  // ── POLITICAL ──────────────────────────────────────────
  {
    id: generateId('perk'),
    name: 'Senatorial PAC Influence',
    type: 'Political',
    description: 'Heavy anonymous donations to key policy makers. They now owe you favors regarding corporate taxation and anti-trust laws.',
    effect: 'Tax Rate -3%',
    imageUrl: 'https://stpltrsrcscmnprdwus001.blob.core.windows.net/rsrcs/cq/images/age-limits-cqresrre20241004/1000020241004-partysupport.webp',
    value: 25000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Regulatory Capture Team',
    type: 'Political',
    description: 'Hire the former heads of the SEC and FTC onto your advisory board. Investigations into your empire frequently \'lose paperwork\'.',
    effect: 'Heat Generation -25%',
    imageUrl: 'https://dentistry.co.uk/app/uploads/2026/03/WEBINAR_speaker_HERO-7-Apr-1024x682.png',
    value: 50000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Foreign State Diplomatic Immunity',
    type: 'Political',
    description: 'Purchase an honorary ambassador title from a developing nation. Your personal assets cannot be seized by domestic intelligence agencies.',
    effect: 'Maximum Heat Level Capped at 80',
    imageUrl: 'https://www.shutterstock.com/image-vector/diplomacy-icon-blue-color-vector-260nw-2614907519.jpg',
    value: 110000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Media Smear Campaign',
    type: 'Political',
    description: 'Fund a dark-money operation to ruin the reputation of a rival CEO.',
    effect: 'Rival stock price drops 15%',
    imageUrl: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3821409961939352549',
    value: 8500000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Lobbyist Army',
    type: 'Political',
    description: 'Unleash K-Street lobbyist swarms to block hostile legislation.',
    effect: 'Governance Axis +10',
    imageUrl: 'https://media.gettyimages.com/id/1322332160/photo/young-family-welcoming-military-father-returning-home.jpg?s=612x612&w=gi&k=20&c=zAO3g2d5OMSK2rslqPRvNA7ZFImgL7WWi6goxY56Tp4=',
    value: 15000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Supreme Court Insight',
    type: 'Political',
    description: 'Secure private backchannel intel on major court rulings before they go public.',
    effect: 'Insider Trading Yield +20%',
    imageUrl: 'https://0.academia-photos.com/223430255/80885458/69470735/s200_nitish_rai.parwani.jpeg',
    value: 40000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Mayoral Extortion',
    type: 'Political',
    description: 'Use gathered intel to force the city mayor to approve massive real-estate re-zoning.',
    effect: 'Real Estate Yields +30%',
    imageUrl: 'https://wpln.org/wp-content/uploads/sites/7/2023/06/courthouse-covenant-treatment-mayor23.jpg',
    value: 18000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Foreign Election Financing',
    type: 'Political',
    description: 'Fund a pro-business candidate in a resource-rich nation.',
    effect: 'Raw Materials Cost -25%',
    imageUrl: 'https://cdn.thecollector.com/wp-content/uploads/2024/09/jackson-campaign-poster.jpg?width=911&quality=100&dpr=2',
    value: 65000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Intelligence Agency Backdoor',
    type: 'Political',
    description: 'Bribe rogue agents for classified satellite surveillance of competitor supply chains.',
    effect: 'Unlock Rival Intel automatically',
    imageUrl: 'https://thumbs.dreamstime.com/b/businessman-suit-interacting-digital-security-network-icons-representing-cyber-technology-data-interacts-interface-408458378.jpg',
    value: 55000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Think Tank Orchestration',
    type: 'Political',
    description: 'Fund a prestigious institute to produce \'scientific\' studies proving your industry is harmless.',
    effect: 'Impact Axis +15',
    imageUrl: 'https://www.gcb.de/site/assets/files/130404/blogpost_fms_10j_innovationskatalog_englisch.800x450.png',
    value: 30000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Billionaire Tax Loophole',
    type: 'Political',
    description: 'Pay elite lawyers to draft legislation rewriting capital gains definitions.',
    effect: 'Passive Income Tax -10%',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Time_Warner_Center_May_2010.JPG/960px-Time_Warner_Center_May_2010.JPG',
    value: 125000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Embassy Safehouse Access',
    type: 'Political',
    description: 'Guaranteed sanctuary in any global embassy during high-heat crackdowns.',
    effect: 'Eliminates Arrest Risk',
    imageUrl: 'https://images.squarespace-cdn.com/content/v1/55ee1cffe4b01232c29effbe/1728335559092-2EU4QCOWMP0HCWUOAJV5/front+perspective-green-E.jpg',
    value: 80000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Governor\'s Pardon',
    type: 'Political',
    description: 'Keep a literal signed blank pardon in your vault just in case.',
    effect: 'Clear all current Heat instantly',
    imageUrl: 'https://newcriterion.com/wp-content/uploads/2025/08/WILKIN-CaravagInstallView-scaled.jpg',
    value: 250000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Defense Contract Priority',
    type: 'Political',
    description: 'Your manufacturing sector gets first dibs on classified military contracts.',
    effect: 'Manufacturing Income +40%',
    imageUrl: 'https://www.steelcurtainnetwork.com/wp-content/uploads/2026/04/USATSI_27421751-1.jpg',
    value: 95000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Central Bank Informant',
    type: 'Political',
    description: 'Advance warning on all interest rate hikes and quantitative easing.',
    effect: 'Finance Sector Yield +25%',
    imageUrl: 'https://verifiedinvesting.com/cdn/shop/articles/vi-education-beyond-the-charts-central-bank-independence-the-delicate-balance-between-monetary-policy-and-politics.jpg?v=1747055721&width=1000',
    value: 150000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Trade Tariff Exemption',
    type: 'Political',
    description: 'Lobby effectively to have your specific goods exempted from brutal import taxes.',
    effect: 'Logistics cost -15%',
    imageUrl: 'https://www.oxfordeconomics.com/wp-content/uploads/2025/05/trade-and-tariffs.jpg',
    value: 35000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Cyber Command Liaison',
    type: 'Political',
    description: 'Military-grade cybersecurity shielding from rival state actors.',
    effect: 'Immunity to low-level Cyber Strikes',
    imageUrl: 'https://img.freepik.com/premium-photo/command-center-with-large-digital-displays-showing-encrypted-data-cyber-threat-analysis_693425-81829.jpg?w=360',
    value: 28000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'International Waters Residency',
    type: 'Political',
    description: 'Legally reclassify your primary operations as a floating micro-state.',
    effect: 'Nullify corporate tax in 3 regions',
    imageUrl: 'https://design-milk.com/images/2018/09/Tiburon-Bay-View-Walker-Warner-1.jpg',
    value: 350000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Union Busting Legislation',
    type: 'Political',
    description: 'Push through right-to-work laws that permanently cripple union leverage.',
    effect: 'Opex -10%',
    imageUrl: 'https://impalamusic.org/wp-content/uploads/2026/03/anaiis-1-1024x1024.png',
    value: 45000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Subsidized Greenwashing',
    type: 'Political',
    description: 'Receive massive governmental grants for highly questionable \'eco\' projects.',
    effect: 'Impact +20, Income +5%',
    imageUrl: 'https://www.greenqueen.com.hk/wp-content/uploads/2022/11/Untitled-design-6.jpg',
    value: 60000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Monopoly Blind Eye',
    type: 'Political',
    description: 'The Justice Department officially ignores your complete dominance of the sector.',
    effect: 'Can buy 100% of Market Nodes without anti-trust heat',
    imageUrl: 'https://miro.medium.com/v2/resize:fit:1024/1*ip5b2BnEW5UUzMfjFDxdOA.jpeg',
    value: 185000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Covert Black-Site Usage',
    type: 'Political',
    description: 'Access to unlisted interrogation facilities to \'interview\' corporate spies.',
    effect: 'Interrogation Success +50%',
    imageUrl: 'https://muffingroup.com/betheme/websites/estate5.webp',
    value: 75000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'G7 Summit Permanent Seat',
    type: 'Political',
    description: 'Sit directly at the table with world leaders during global economic planning.',
    effect: 'Power Axis +25',
    imageUrl: 'https://smartcdn.gprod.postmedia.digital/calgaryherald/wp-content/uploads/2025/06/g7-summit-gya25-53_296224154.jpg',
    value: 400000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'IMF Debt Forgiveness',
    type: 'Political',
    description: 'Leverage IMF contacts to wipe out massive municipal debts in exchange for infrastructure control.',
    effect: 'Free Node Upgrades (limit 3)',
    imageUrl: 'https://cdn1.wionews.com/dev/wion/images/2025/20250505/RgPdmueSOUIX0WiuobAJ.jpg',
    value: 220000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'State-Sponsored Assassination Immunity',
    type: 'Political',
    description: 'The highest levels of government declare you off-limits to wet-work.',
    effect: 'Survival Rate +100%',
    imageUrl: 'https://media.newyorker.com/photos/6785abaa41152dadc54091df/master/w_2560,c_limit/OpenQuestions_SystemFailure_final-1.gif',
    value: 150000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Golden Visa Cartel',
    type: 'Political',
    description: 'Fast-track citizenship requests in 14 tier-1 countries.',
    effect: 'Eliminates regional restrictions',
    imageUrl: 'https://dy6a9v2cv3oh.cloudfront.net/uploads/enjoy-the-european-living-standards-for-a-lifetime-to-the-fullest-1-1677491284.jpg',
    value: 18000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Corporate Espionage Legalization',
    type: 'Political',
    description: 'Draft a bill classifying corporate espionage as \'competitive scouting\'.',
    effect: 'Crime Detection -30%',
    imageUrl: 'https://media.gettyimages.com/id/1438980338/photo/security-guards-are-inside-the-building-that-they-take-care-of-making-sure-that-everything-is.jpg?s=612x612&w=gi&k=20&c=R9morUyUvLlpea0Oego-fKJ9Z25HQnYJhswVf5R0i98=',
    value: 95000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Amnesty Declaration',
    type: 'Political',
    description: 'Force a local region to declare total amnesty for all past white-collar crimes.',
    effect: 'Resets local Heat to 0',
    imageUrl: 'https://ishr.ch/wp-content/uploads/2023/05/IHRD-Icon-Sammlung_individualArtboard-7-1024x626.jpg',
    value: 110000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Shadow Cabinet Membership',
    type: 'Political',
    description: 'You are the one actually pulling the strings of the incumbent government.',
    effect: 'Power Axis locked at 100',
    imageUrl: 'https://bleedingcool.com/wp-content/uploads/2024/11/Shadow-Cabint-1-2000x1125.jpg',
    value: 850000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'UN Veto Influence',
    type: 'Political',
    description: 'Bribe a permanent UN Security Council member to veto hostile resolutions.',
    effect: 'Global Governance dominance',
    imageUrl: 'https://manifold.umn.edu/api/proxy/ingestion_sources/28a06850-d8fc-489d-9681-2b3b5c843ddb',
    value: 500000000,
    owned: false
  },
  // ── CORPORATE ──────────────────────────────────────────
  {
    id: generateId('perk'),
    name: 'BlackRock Partnership',
    type: 'Corporate',
    description: 'Form a strategic alliance with the largest asset manager on earth. Their Aladdin system is now partially accessible to your quants.',
    effect: 'Trading Algorithm Yield +15%',
    imageUrl: 'https://www.kubeinteriors.com/wp-content/uploads/2025/07/print-10.jpg',
    value: 200000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Cyber-Warfare Syndicate',
    type: 'Corporate',
    description: 'A private army of zero-day exploit developers operating out of Eastern Europe on your payroll. Untraceable digital sabotage.',
    effect: 'Shadow Ops Success Rate +20%',
    imageUrl: 'https://media.licdn.com/dms/image/v2/D5612AQETS_pYeyLcXg/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/1701192646577?e=2147483647&v=beta&t=XrD9IZ9j7RD_viUoKrF8Gv7Qv7VccoK3Ow7-k-XmgCM',
    value: 120000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Media Conglomerate Acquisition',
    type: 'Corporate',
    description: 'Buy a massive legacy news network. Whenever your heat level rises, you broadcast distracting narrative smoke screens to the masses.',
    effect: 'Heat decays automatically over time',
    imageUrl: 'https://blog.hootsuite.com/wp-content/uploads/2025/05/Trends2026-BlogHero-1080x1080-1.png',
    value: 450000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'AI Logistics Backbone',
    type: 'Corporate',
    description: 'Replace 40% of middle management with highly efficient predictive AI.',
    effect: 'Opex -15%',
    imageUrl: 'https://d6fiz9tmzg8gn.cloudfront.net/wp-content/uploads/2025/08/Blog7-5.jpg',
    value: 85000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Hostile Takeover AI',
    type: 'Corporate',
    description: 'An algorithm that identifies distressed competitor assets in milliseconds.',
    effect: 'Market Node Purchase Price -10%',
    imageUrl: 'https://media.licdn.com/dms/image/v2/D5612AQH_mryPrWWpjg/article-cover_image-shrink_720_1280/B56Zf8RUemHcAM-/0/1752284090785?e=2147483647&v=beta&t=vtebQjIn7u66A0HCdDbvJKVxkeUETpahIsRgUqdTu68',
    value: 140000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Offshore Tax Haven Shells',
    type: 'Corporate',
    description: 'Complex multi-layered shell companies based in the Cayman Islands.',
    effect: 'Effective Tax Rate -5%',
    imageUrl: 'https://cdn.ceoworld.biz/wp-content/uploads/2023/10/St-Kitts-and-Nevis-1.jpg',
    value: 90000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Hyper-Frequency Trading Servers',
    type: 'Corporate',
    description: 'Server racks physically placed 10ft from the NYSE matching engines.',
    effect: 'Finance Income +30%',
    imageUrl: 'https://www.investopedia.com/thmb/BUYBTGU5o-qVofJZ-Js44_vUWGY=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-686726405-11dadfd41b374d208d74123b7ab5b5d4.jpg',
    value: 250000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Patent Trolling Farm',
    type: 'Corporate',
    description: 'A legion of lawyers aggressively suing competitors for vague patent infringements.',
    effect: 'Competitor Income -20%',
    imageUrl: 'https://farmonaut.com/wp-content/uploads/2025/05/Modern-Farming-10-Game-Changing-Tech-Secrets-Exposed_2.jpg',
    value: 65000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Dark Pool Trading Platform',
    type: 'Corporate',
    description: 'Execute massive block trades off the public ledger to avoid price slippage.',
    effect: 'Trading Efficiency +25%',
    imageUrl: 'https://miro.medium.com/v2/resize:fit:1400/1*1-wXcT1cVKWD6an3fUZ4Yw.png',
    value: 180000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Corporate Mercenary Contract',
    type: 'Corporate',
    description: 'Retain a PMC to protect physical assets worldwide.',
    effect: 'Node Sabotage Immunity',
    imageUrl: 'https://www.honeybook.com/blog/wp-content/uploads/2023/04/business-contracts-feature.jpg',
    value: 350000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Vertical Integration Monolith',
    type: 'Corporate',
    description: 'Own the entire supply chain from dirt to retail.',
    effect: 'Manufacturing Yield +50%',
    imageUrl: 'https://images.ctfassets.net/jdtwqhzvc2n1/59gHP9o0SQ1fPh8wWdktCR/ce1732caaa77c95e0cac2fad23fd1c87/a-crisp-image-of-a-shiny-rectangular-black-monolit-z5-lQG4JSGimVYyCGiAmCg-sgZ6R0TATrOcCtUPwpzqBQ-transformed.jpeg',
    value: 400000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Orbital Data Center',
    type: 'Corporate',
    description: 'Servers placed in low earth orbit, untouchable by terrestrial law enforcement.',
    effect: 'Data Seizure Immunity',
    imageUrl: 'https://i.ytimg.com/vi/d-YcVLq98Ew/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCbPchcpJB-eTvV45XRNL7NN0DlMA',
    value: 650000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Consumer Data Monopoly',
    type: 'Corporate',
    description: 'Acquire the largest data-broker on earth. You know what people want before they do.',
    effect: 'Retail Income +40%',
    imageUrl: 'https://t3.ftcdn.net/jpg/04/57/16/42/360_F_457164229_FaiMTcNIxkopVDFV99dLqWKGJthT9XTt.jpg',
    value: 320000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Underground Tech Incubator',
    type: 'Corporate',
    description: 'A massive underground R&D facility where ethics committees don\'t exist.',
    effect: 'Project Success Rate +25%',
    imageUrl: 'https://png.pngtree.com/thumb_back/fh260/background/20260103/pngtree-futuristic-meeting-room-with-high-tech-equipment-setup-image_21006942.webp',
    value: 280000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Crisis PR Firm Retainer',
    type: 'Corporate',
    description: 'The most ruthless spin-doctors on the planet, ready to defend your brand.',
    effect: 'Crime Detection Heat Gain -50%',
    imageUrl: 'https://forgeconcepts.com/cdn/shop/files/BlackSep23.jpg?v=1763916011&width=1920',
    value: 75000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Sovereign Debt Default Insurance',
    type: 'Corporate',
    description: 'If a country collapses, you actually make money.',
    effect: 'Immune to Macro Recessions',
    imageUrl: 'https://d1-invdn-com.investing.com/content/pica484edcbf30fadc461ab24569e21895b.jpg',
    value: 500000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Global Franchise Rollout',
    type: 'Corporate',
    description: 'Aggressive global expansion of your core retail assets.',
    effect: 'Growth Axis +20',
    imageUrl: 'https://www.theworldfolio.com/img_db/interviews/interview-67f5ed6290c00.jpg',
    value: 150000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Corporate Espionage Satellite',
    type: 'Corporate',
    description: 'A privately owned spy satellite monitoring competitor shipping lanes.',
    effect: 'Intel Gathering +100%',
    imageUrl: 'https://img-s-msn-com.akamaized.net/tenant/amp/entityid/BB1oopBu.img?w=800&h=415&q=60&m=2&f=jpg',
    value: 220000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Robotics Workforce Automation',
    type: 'Corporate',
    description: 'Replace 80% of human laborers with unresting robotic counterparts.',
    effect: 'Opex -30%, Heat +10',
    imageUrl: 'https://www.heatsign.com/wp-content/uploads/2025/03/smart_manufacturing1.png',
    value: 380000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Crypto Exchage Liquidity Protocol',
    type: 'Corporate',
    description: 'Manipulate digital asset markets with impunity.',
    effect: 'Crypto Trading Yield +50%',
    imageUrl: 'https://www.ment.tech/wp-content/uploads/2025/12/Top-7-Crypto-Liquidity-Providers-for-2026.webp',
    value: 110000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Cartel Distribution Network',
    type: 'Corporate',
    description: 'Leverage unregulated delivery routes for hyper-fast logistics.',
    effect: 'Transport Efficiency +40%',
    imageUrl: 'https://www.founderjar.com/wp-content/uploads/2023/10/1.-The-Feebles-Best-Big-Cartel-Website-Example.jpeg',
    value: 160000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Corporate Religion Status',
    type: 'Corporate',
    description: 'Reclassify your primary enterprise as a tax-exempt religion.',
    effect: 'Corporate Tax = 0%',
    imageUrl: 'https://www.shutterstock.com/image-vector/jesus-saves-black-white-pixel-260nw-2742076109.jpg',
    value: 950000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Private Intelligence Agency',
    type: 'Corporate',
    description: 'A corporate CIA dedicated solely to your bottom line.',
    effect: 'Eliminates all Rival Intelligence',
    imageUrl: 'https://i.mscdn.ai/blog-images/what-is-flux-2-pro.png?fm=auto&w=1200&fit=cover',
    value: 480000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Megacity Construction Rights',
    type: 'Corporate',
    description: 'Total control over building a ground-up \'smart city\'.',
    effect: 'Real Estate Income +100%',
    imageUrl: 'https://static.dezeen.com/uploads/2022/10/world-cup-qatar-2022-amnesty-international-report_dezeen_2364_col_0.jpg',
    value: 850000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Neural Implant Data Harvesting',
    type: 'Corporate',
    description: 'Mandatory company implants that feed raw consumer intent straight to marketing.',
    effect: 'Marketing ROI +80%',
    imageUrl: 'https://image.dongascience.com/Photo/2024/04/1713766130626.jpg',
    value: 600000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Asteroid Mining Consortium',
    type: 'Corporate',
    description: 'Dwarf terrestrial metal yields by capturing near-earth asteroids.',
    effect: 'Raw Material Costs = 0',
    imageUrl: 'https://cdn.mos.cms.futurecdn.net/S4gxNffbsqpD7ZeC4DAtXJ.jpg',
    value: 1200000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Zero-Point Energy Generator',
    type: 'Corporate',
    description: 'Limitless, free energy for your operational nodes.',
    effect: 'Energy Sector Dominance',
    imageUrl: 'https://images.stockcake.com/public/6/7/c/67c68f5e-b411-42c0-be02-f7a39954f431/cyberpunk-energy-grid-stockcake.jpg',
    value: 1500000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Suboceanic Cable Tap',
    type: 'Corporate',
    description: 'Intercept literally 10% of all global internet traffic.',
    effect: 'Cyber Ops Success +50%',
    imageUrl: 'https://media.wired.com/photos/69950bde8c00b2792288b5b8/master/w_1600,c_limit/TAT8_FMstudioC1_DSF0144FINAL.jpeg',
    value: 800000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Synthetic Biology Monopoly',
    type: 'Corporate',
    description: 'Control the patents for the fundamental building blocks of future life.',
    effect: 'Pharma Yield +100%',
    imageUrl: 'https://www.asbmb.org/getattachment/3b4ec6eb-1c84-4d51-896b-3ed9809d08d7/Sicomm-Pasin-900x506.jpg?lang=en-US&width=900&height=506&ext=.jpg',
    value: 950000000,
    owned: false
  },
  {
    id: generateId('perk'),
    name: 'Post-Scarcity AI Overlord',
    type: 'Corporate',
    description: 'Hand over corporate strategy to an AGI that guarantees infinite growth.',
    effect: 'Game Over: You Win.',
    imageUrl: 'https://media.licdn.com/dms/image/v2/D4E12AQEtzKaFCRTp-g/article-cover_image-shrink_720_1280/B4EZwWWhXLKoAM-/0/1769901531540?e=2147483647&v=beta&t=UQuysrGWSAxp6gDO7okal6xb5PaPqNa6j30J7Efrmjo',
    value: 5000000000,
    owned: false
  },
];
