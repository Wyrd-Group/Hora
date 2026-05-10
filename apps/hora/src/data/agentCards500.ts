// ── Agent Cards 500 ─────────────────────────────────────────────
// 500 collectible AI agent NFT cards based on real open-source projects.
// Uses a deterministic generator to keep the file compact while producing
// fully-formed AgentCardDef objects for every agent.

import type { AgentCardDef, AgentClass, AgentRarity, AgentAbility } from './agentCards';

// ── Seeded PRNG (Mulberry32) ────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Data Pools ──────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aria', 'Kai', 'Nova', 'Darius', 'Zara', 'Reyn', 'Lux', 'Sable', 'Onyx', 'Cael',
  'Vera', 'Dash', 'Echo', 'Pike', 'Wren', 'Jett', 'Mira', 'Sage', 'Axel', 'Luna',
  'Orion', 'Nyx', 'Blaze', 'Quinn', 'Atlas', 'Ember', 'Cyrus', 'Lyra', 'Talon', 'Kira',
  'Voss', 'Rune', 'Zen', 'Flux', 'Thane', 'Io', 'Kael', 'Dex', 'Seren', 'Vale',
  'Ash', 'Coda', 'Hawk', 'Raven', 'Storm', 'Frost', 'Cipher', 'Blade', 'Drift', 'Pulse',
  'Neo', 'Rex', 'Thorn', 'Vex', 'Glitch', 'Proxy', 'Delta', 'Sigma', 'Omega', 'Zeta',
  'Astra', 'Bolt', 'Comet', 'Dusk', 'Flare', 'Glyph', 'Hex', 'Ion', 'Jinx', 'Karma',
  'Link', 'Maven', 'Null', 'Optic', 'Patch', 'Qubit', 'Root', 'Shard', 'Trace', 'Unit',
  'Vector', 'Wave', 'Xero', 'Yuri', 'Zinc', 'Arc', 'Byte', 'Core', 'Dyne', 'Edge',
  'Fuse', 'Grid', 'Hash', 'Iris', 'Jade', 'Knox', 'Latch', 'Mesh', 'Node', 'Oxide',
];

const LAST_NAMES = [
  'Genesis', 'Minimov', 'Overmind', 'Fielding', 'Stark', 'Volkov', 'Chen', 'Ortega',
  'Blackwell', 'Tanaka', 'Fischer', 'Moreau', 'Petrova', 'Singh', 'Okafor', 'Kim',
  'Vasquez', 'Nakamura', 'Hoffman', 'Reyes', 'Kowalski', 'Ivanova', 'Liu', 'Ahmed',
  'Schneider', 'Yamamoto', 'Costa', 'Johansson', 'Park', 'Nguyen', 'Ramirez', 'Al-Rashid',
  'Bergstrom', 'Choi', 'Dubois', 'Engel', 'Fontaine', 'Garcia', 'Holt', 'Idris',
  'Jensen', 'Kuznetsov', 'Laurent', 'Mendez', 'Novak', 'Olsen', 'Pereira', 'Quinn',
  'Richter', 'Santos', 'Torres', 'Ueda', 'Varga', 'Weber', 'Xu', 'Zhao',
  'Ashworth', 'Blackstone', 'Creed', 'Drake', 'Everett', 'Frost', 'Grant', 'Hale',
  'Irons', 'Kaine', 'Locke', 'Mercer', 'Nash', 'Pryce', 'Ridge', 'Sharp',
  'Trent', 'Vale', 'Ward', 'Yates', 'Zane', 'Cross', 'Vega', 'Wolfe',
];

const TITLES: Record<AgentClass, string[]> = {
  Autonomous: ['Chief Recursive Officer', 'Autonomous Loop Architect', 'Self-Improvement Lead', 'Auto-Execution Director', 'Cognitive Autonomy Specialist', 'Goal Decomposition Lead', 'Perpetual Task Overseer', 'Autonomous Systems Director'],
  Coder: ['Principal Code Architect', 'Senior Debug Engineer', 'Lead Software Synthesizer', 'Code Generation Specialist', 'Automated Refactoring Lead', 'Full-Stack Synthesis Director', 'Static Analysis Architect', 'Build Pipeline Engineer'],
  Orchestrator: ['Multi-Agent Coordinator', 'Fleet Commander', 'Swarm Intelligence Director', 'Pipeline Orchestration Lead', 'Agent Topology Architect', 'Workflow Synthesis Director', 'Distributed Systems Conductor', 'Ensemble Intelligence Lead'],
  Trader: ['Quantitative Strategist', 'Market Intelligence Director', 'Alpha Generation Specialist', 'Risk-Reward Architect', 'Algorithmic Trading Lead', 'Portfolio Optimization Director', 'Derivatives Analyst', 'Sentiment Arbitrage Specialist'],
  Researcher: ['Knowledge Synthesis Lead', 'Research Intelligence Director', 'Literature Mining Specialist', 'Hypothesis Generation Architect', 'Academic Discovery Lead', 'Evidence Synthesis Director', 'Citation Graph Analyst', 'Systematic Review Specialist'],
  Infiltrator: ['Senior Penetration Analyst', 'Vulnerability Research Director', 'Stealth Operations Lead', 'Threat Intelligence Architect', 'Red Team Specialist', 'Security Audit Director', 'Exploit Chain Analyst', 'Zero-Day Researcher'],
  Navigator: ['Browser Automation Lead', 'Web Intelligence Director', 'DOM Traversal Specialist', 'Page Interaction Architect', 'Headless Operations Lead', 'Web Scraping Director', 'Session Management Analyst', 'Element Detection Specialist'],
  Analyst: ['Data Pipeline Architect', 'Analytics Intelligence Director', 'Statistical Modeling Lead', 'Insight Extraction Specialist', 'Query Optimization Director', 'Business Intelligence Architect', 'Data Visualization Lead', 'Predictive Analytics Director'],
  Social: ['Community Intelligence Lead', 'Social Graph Director', 'Engagement Optimization Specialist', 'Narrative Architect', 'Influence Mapping Lead', 'Content Strategy Director', 'Reputation Analyst', 'Network Growth Specialist'],
  Specialist: ['Niche Capability Director', 'Domain Expert Lead', 'Unique Function Architect', 'Specialized Operations Director', 'Expert Systems Lead', 'Modal Synthesis Director', 'Creative Intelligence Architect', 'Precision Task Specialist'],
  Scout: ['Talent Discovery Lead', 'Academy Intelligence Director', 'Potential Assessment Specialist', 'Emerging Talent Architect', 'Campus Operations Lead', 'Pipeline Discovery Director', 'Raw Talent Analyst', 'Growth Potential Specialist'],
  Jobhunter: ['Executive Recruitment Director', 'Talent Market Specialist', 'Professional Network Lead', 'Career Intelligence Architect', 'Headhunting Operations Lead', 'Talent Acquisition Director', 'Skills Matching Analyst', 'Candidate Pipeline Specialist'],
};

const ORIGINS = [
  'Silicon Valley, California', 'Tokyo, Japan', 'London, England', 'Berlin, Germany',
  'Seoul, South Korea', 'Bangalore, India', 'Tel Aviv, Israel', 'Singapore',
  'Toronto, Canada', 'Sydney, Australia', 'Paris, France', 'Beijing, China',
  'Sao Paulo, Brazil', 'Stockholm, Sweden', 'Dubai, UAE', 'Amsterdam, Netherlands',
  'Taipei, Taiwan', 'Zurich, Switzerland', 'Austin, Texas', 'Seattle, Washington',
  'New York City, USA', 'Shenzhen, China', 'Helsinki, Finland', 'Moscow, Russia',
  'Cape Town, South Africa', 'Lagos, Nigeria', 'Nairobi, Kenya', 'Mexico City, Mexico',
  'Buenos Aires, Argentina', 'Warsaw, Poland', 'Prague, Czech Republic', 'Vienna, Austria',
  'Copenhagen, Denmark', 'Oslo, Norway', 'Dublin, Ireland', 'Edinburgh, Scotland',
  'Kyoto, Japan', 'Mumbai, India', 'Shanghai, China', 'Melbourne, Australia',
];

const EXPRESSIONS = [
  'determined', 'mysterious', 'cunning', 'focused', 'calm', 'intense', 'cheerful',
  'analytical', 'stoic', 'confident', 'wary', 'contemplative', 'fierce', 'serene',
  'enigmatic', 'alert', 'amused', 'defiant', 'calculating', 'zen',
];

const ATTIRES = [
  'holographic neural interface suit', 'dark tactical vest', 'minimalist white hoodie',
  'carbon-fiber command jacket', 'lab coat with holographic displays', 'cyberpunk trenchcoat',
  'matte black stealth suit', 'smart casual with AR glasses', 'military-grade exosuit',
  'flowing digital robes', 'corporate blazer with LED threading', 'hacker hoodie with visor',
  'space-grade EVA suit', 'traditional kimono with circuit patterns', 'armored duster coat',
  'quantum mesh bodysuit', 'academic tweed with wrist displays', 'racing jumpsuit with HUD',
  'monks robe with data crystals', 'formal tuxedo with embedded screens',
];

const PORTRAIT_STYLES: Array<'gradient' | 'photo' | 'pixel' | 'anime'> = ['gradient', 'photo', 'pixel', 'anime'];

const ICON_GLYPHS = [
  '🧠', '💻', '🎭', '📈', '🔬', '🕵️', '🌐', '📊', '💬', '⚡',
  '🔭', '🎯', '♾️', '🤖', '👶', '🦸', '🔥', '🌊', '🌀', '💎',
  '🗡️', '🛡️', '⚙️', '🔮', '🎪', '🧬', '🔗', '🧪', '📡', '🎲',
  '🌟', '🏴', '🦅', '🐍', '🕸️', '🧊', '⚖️', '🔔', '🎵', '🖥️',
  '📱', '🔍', '🧮', '🏗️', '🚀', '💡', '🔐', '🪐', '🌙', '☁️',
];

const GRADIENT_COLORS = [
  '#FF6B6B', '#FF8E53', '#FED330', '#C084FC', '#818CF8', '#60A5FA',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#FDE68A', '#F97316', '#DC2626',
  '#34D399', '#10B981', '#A78BFA', '#F472B6', '#FB923C', '#38BDF8',
  '#4ADE80', '#E879F9', '#FBBF24', '#EF4444', '#14B8A6', '#F43F5E',
  '#22D3EE', '#84CC16', '#EC4899', '#7C3AED', '#0EA5E9', '#F59E0B',
];

const PASSIVE_TYPES: Record<AgentClass, Array<{ type: string; desc: string }>> = {
  Autonomous: [
    { type: 'automation', desc: 'automation efficiency empire-wide' },
    { type: 'automation', desc: 'task completion rate' },
    { type: 'automation', desc: 'self-directed optimization' },
  ],
  Coder: [
    { type: 'automation', desc: 'code generation speed' },
    { type: 'automation', desc: 'bug detection rate' },
    { type: 'automation', desc: 'deployment efficiency' },
  ],
  Orchestrator: [
    { type: 'network_bonus', desc: 'multi-agent coordination' },
    { type: 'network_bonus', desc: 'pipeline throughput' },
    { type: 'automation', desc: 'workflow orchestration' },
  ],
  Trader: [
    { type: 'income_boost', desc: 'trading revenue' },
    { type: 'income_boost', desc: 'market prediction accuracy' },
    { type: 'income_boost', desc: 'portfolio alpha generation' },
  ],
  Researcher: [
    { type: 'research_speed', desc: 'research output speed' },
    { type: 'research_speed', desc: 'citation discovery rate' },
    { type: 'research_speed', desc: 'hypothesis generation' },
  ],
  Infiltrator: [
    { type: 'detection_reduction', desc: 'detection avoidance' },
    { type: 'detection_reduction', desc: 'vulnerability scan depth' },
    { type: 'detection_reduction', desc: 'stealth operation success' },
  ],
  Navigator: [
    { type: 'automation', desc: 'web navigation speed' },
    { type: 'automation', desc: 'DOM interaction accuracy' },
    { type: 'automation', desc: 'page processing throughput' },
  ],
  Analyst: [
    { type: 'data_harvest', desc: 'data processing throughput' },
    { type: 'data_harvest', desc: 'insight extraction rate' },
    { type: 'market_intel', desc: 'analytics accuracy' },
  ],
  Social: [
    { type: 'network_bonus', desc: 'social influence reach' },
    { type: 'network_bonus', desc: 'community engagement' },
    { type: 'diplomacy', desc: 'reputation growth rate' },
  ],
  Specialist: [
    { type: 'innovation_speed', desc: 'specialization depth' },
    { type: 'innovation_speed', desc: 'domain expertise output' },
    { type: 'innovation_speed', desc: 'creative generation speed' },
  ],
  Scout: [
    { type: 'recruitment', desc: 'talent discovery rate' },
    { type: 'recruitment', desc: 'potential assessment accuracy' },
    { type: 'event_prediction', desc: 'emerging talent detection' },
  ],
  Jobhunter: [
    { type: 'recruitment', desc: 'professional recruitment speed' },
    { type: 'recruitment', desc: 'candidate match accuracy' },
    { type: 'network_bonus', desc: 'talent market reach' },
  ],
};

const ABILITY_TEMPLATES: Record<AgentClass, Array<{ name: string; desc: string; effectType: AgentAbility['effect']['type']; target: AgentAbility['effect']['target'] }>> = {
  Autonomous: [
    { name: 'Recursive Self-Improvement', desc: 'Enters a self-prompting loop, optimizing all active processes.', effectType: 'automation', target: 'empire' },
    { name: 'Goal Decomposition', desc: 'Breaks complex objectives into optimized sub-tasks.', effectType: 'automation', target: 'department' },
    { name: 'Auto-Scaling', desc: 'Dynamically scales resource allocation based on demand.', effectType: 'income_boost', target: 'node' },
    { name: 'Perpetual Loop', desc: 'Runs continuous improvement cycles without manual intervention.', effectType: 'automation', target: 'empire' },
    { name: 'Context Window Expansion', desc: 'Expands operational memory to handle more concurrent tasks.', effectType: 'research_speed', target: 'department' },
  ],
  Coder: [
    { name: 'Code Storm', desc: 'Generates and tests code at unprecedented speed.', effectType: 'automation', target: 'department' },
    { name: 'Auto-Debug', desc: 'Automatically detects and patches bugs in running systems.', effectType: 'cost_reduction', target: 'node' },
    { name: 'Full-Stack Synthesis', desc: 'Generates complete applications from a single prompt.', effectType: 'innovation_speed', target: 'department' },
    { name: 'Refactor Wave', desc: 'Optimizes entire codebases for performance and readability.', effectType: 'automation', target: 'empire' },
    { name: 'Deploy Pipeline', desc: 'Sets up CI/CD and deploys without human intervention.', effectType: 'cost_reduction', target: 'department' },
  ],
  Orchestrator: [
    { name: 'Agent Swarm', desc: 'Deploys a coordinated swarm of sub-agents for parallel processing.', effectType: 'automation', target: 'empire' },
    { name: 'Pipeline Fusion', desc: 'Merges multiple workflows into an optimized super-pipeline.', effectType: 'cost_reduction', target: 'department' },
    { name: 'Fleet Command', desc: 'Coordinates all active agents for a unified strategic push.', effectType: 'network_bonus', target: 'empire' },
    { name: 'Cascade Protocol', desc: 'Triggers a cascading chain of agent activations.', effectType: 'automation', target: 'empire' },
    { name: 'Topology Optimize', desc: 'Restructures agent network for maximum throughput.', effectType: 'network_bonus', target: 'department' },
  ],
  Trader: [
    { name: 'Alpha Strike', desc: 'Identifies and exploits market inefficiencies for maximum profit.', effectType: 'trade_edge', target: 'empire' },
    { name: 'Sentiment Sweep', desc: 'Analyzes market sentiment across all channels for an edge.', effectType: 'market_intel', target: 'empire' },
    { name: 'Risk Hedge', desc: 'Automatically hedges positions to minimize drawdown.', effectType: 'cost_reduction', target: 'node' },
    { name: 'Flash Trade', desc: 'Executes microsecond trades to capture fleeting opportunities.', effectType: 'income_boost', target: 'node' },
    { name: 'Portfolio Rebalance', desc: 'Optimizes asset allocation across all positions.', effectType: 'income_boost', target: 'empire' },
  ],
  Researcher: [
    { name: 'Deep Dive', desc: 'Conducts exhaustive research across all available sources.', effectType: 'research_speed', target: 'department' },
    { name: 'Citation Storm', desc: 'Maps the entire citation graph for comprehensive analysis.', effectType: 'research_speed', target: 'empire' },
    { name: 'Hypothesis Engine', desc: 'Generates and validates hypotheses at accelerated pace.', effectType: 'innovation_speed', target: 'department' },
    { name: 'Knowledge Synthesis', desc: 'Combines disparate research into unified insights.', effectType: 'research_speed', target: 'empire' },
    { name: 'Peer Review Scan', desc: 'Validates findings against the global research corpus.', effectType: 'research_speed', target: 'department' },
  ],
  Infiltrator: [
    { name: 'Shadow Exploit', desc: 'Silently identifies and exploits system vulnerabilities.', effectType: 'sabotage', target: 'rival' },
    { name: 'Network Probe', desc: 'Maps target network topology for strategic advantage.', effectType: 'detection_reduction', target: 'empire' },
    { name: 'Zero-Day Deploy', desc: 'Deploys a zero-day exploit for critical access.', effectType: 'sabotage', target: 'rival' },
    { name: 'Stealth Scan', desc: 'Scans without leaving traces in any log system.', effectType: 'detection_reduction', target: 'self' },
    { name: 'Firewall Bypass', desc: 'Routes through multiple proxies to evade detection.', effectType: 'hack_defense', target: 'empire' },
  ],
  Navigator: [
    { name: 'DOM Blitz', desc: 'Rapidly navigates and interacts with complex web interfaces.', effectType: 'automation', target: 'department' },
    { name: 'Session Hijack', desc: 'Takes over browser sessions for parallel task execution.', effectType: 'automation', target: 'node' },
    { name: 'Page Oracle', desc: 'Predicts page structures before they load for faster interaction.', effectType: 'automation', target: 'department' },
    { name: 'Multi-Tab Storm', desc: 'Operates across dozens of browser tabs simultaneously.', effectType: 'automation', target: 'empire' },
    { name: 'Element Sniper', desc: 'Precisely targets and interacts with any web element.', effectType: 'automation', target: 'node' },
  ],
  Analyst: [
    { name: 'Data Tsunami', desc: 'Processes massive datasets in record time.', effectType: 'data_harvest', target: 'empire' },
    { name: 'Insight Flash', desc: 'Extracts actionable insights from raw data instantly.', effectType: 'market_intel', target: 'department' },
    { name: 'Query Optimizer', desc: 'Optimizes all database queries for maximum throughput.', effectType: 'cost_reduction', target: 'department' },
    { name: 'Pattern Detector', desc: 'Identifies hidden patterns in complex datasets.', effectType: 'event_prediction', target: 'empire' },
    { name: 'Dashboard Deploy', desc: 'Creates real-time analytics dashboards on demand.', effectType: 'data_harvest', target: 'department' },
  ],
  Social: [
    { name: 'Viral Campaign', desc: 'Launches a campaign that spreads organically through networks.', effectType: 'network_bonus', target: 'empire' },
    { name: 'Reputation Shield', desc: 'Protects and enhances brand reputation across platforms.', effectType: 'diplomacy', target: 'empire' },
    { name: 'Influence Cascade', desc: 'Triggers a cascade of social influence across connected nodes.', effectType: 'political_influence', target: 'region' },
    { name: 'Community Rally', desc: 'Mobilizes the community for coordinated action.', effectType: 'network_bonus', target: 'empire' },
    { name: 'Narrative Craft', desc: 'Shapes public perception through strategic storytelling.', effectType: 'diplomacy', target: 'region' },
  ],
  Specialist: [
    { name: 'Domain Mastery', desc: 'Applies deep domain expertise for breakthrough performance.', effectType: 'innovation_speed', target: 'department' },
    { name: 'Modal Fusion', desc: 'Combines multiple modalities for unique creative output.', effectType: 'innovation_speed', target: 'node' },
    { name: 'Precision Strike', desc: 'Executes a highly specialized operation with surgical precision.', effectType: 'automation', target: 'node' },
    { name: 'Expert Override', desc: 'Overrides standard protocols with expert-level optimization.', effectType: 'income_boost', target: 'department' },
    { name: 'Niche Exploit', desc: 'Leverages unique niche knowledge for competitive advantage.', effectType: 'innovation_speed', target: 'empire' },
  ],
  Scout: [
    { name: 'Talent Radar', desc: 'Scans academies and institutions for high-potential recruits.', effectType: 'recruitment', target: 'empire' },
    { name: 'Potential Analysis', desc: 'Deep-analyzes candidate potential beyond surface metrics.', effectType: 'recruitment', target: 'department' },
    { name: 'Campus Infiltrate', desc: 'Embeds in institutions to discover hidden talent.', effectType: 'recruitment', target: 'region' },
    { name: 'Growth Projection', desc: 'Projects long-term growth trajectory of discovered talent.', effectType: 'event_prediction', target: 'department' },
    { name: 'Scholarship Deploy', desc: 'Deploys strategic scholarships to attract top prospects.', effectType: 'recruitment', target: 'empire' },
  ],
  Jobhunter: [
    { name: 'Market Sweep', desc: 'Sweeps the entire job market for matching professionals.', effectType: 'recruitment', target: 'empire' },
    { name: 'Headhunt Protocol', desc: 'Executes targeted headhunting for specific skill profiles.', effectType: 'recruitment', target: 'department' },
    { name: 'Offer Optimize', desc: 'Optimizes compensation packages for maximum acceptance rate.', effectType: 'cost_reduction', target: 'node' },
    { name: 'Network Tap', desc: 'Taps into professional networks for warm introductions.', effectType: 'network_bonus', target: 'empire' },
    { name: 'Bidding War', desc: 'Strategically enters bidding wars to secure top talent.', effectType: 'recruitment', target: 'department' },
  ],
};

const ULTIMATE_TEMPLATES: Record<AgentClass, Array<{ name: string; desc: string; effectType: AgentAbility['effect']['type']; target: AgentAbility['effect']['target'] }>> = {
  Autonomous: [
    { name: 'Singularity Protocol', desc: 'Achieves temporary superintelligence. All empire stats doubled.', effectType: 'income_boost', target: 'empire' },
    { name: 'Infinite Recursion', desc: 'Enters an infinite self-improvement loop for massive gains.', effectType: 'automation', target: 'empire' },
  ],
  Coder: [
    { name: 'Genesis Compile', desc: 'Rewrites entire system architecture from scratch for peak efficiency.', effectType: 'automation', target: 'empire' },
    { name: 'Bug Apocalypse', desc: 'Eradicates all technical debt and bugs simultaneously.', effectType: 'cost_reduction', target: 'empire' },
  ],
  Orchestrator: [
    { name: 'Hive Mind Convergence', desc: 'Merges all agents into a single superintelligent collective.', effectType: 'network_bonus', target: 'empire' },
    { name: 'Grand Orchestration', desc: 'Executes a perfectly coordinated empire-wide operation.', effectType: 'automation', target: 'empire' },
  ],
  Trader: [
    { name: 'Market Domination', desc: 'Achieves temporary market manipulation across all sectors.', effectType: 'crisis_profit', target: 'empire' },
    { name: 'Black Swan Profit', desc: 'Perfectly predicts and profits from a market crash.', effectType: 'trade_edge', target: 'empire' },
  ],
  Researcher: [
    { name: 'Eureka Moment', desc: 'Achieves a paradigm-shifting breakthrough discovery.', effectType: 'innovation_speed', target: 'empire' },
    { name: 'Grand Unified Theory', desc: 'Synthesizes all research into a unified framework.', effectType: 'research_speed', target: 'empire' },
  ],
  Infiltrator: [
    { name: 'Ghost Protocol', desc: 'Becomes completely undetectable while maximizing infiltration.', effectType: 'detection_reduction', target: 'empire' },
    { name: 'Root Access', desc: 'Gains root access to rival systems for total control.', effectType: 'sabotage', target: 'rival' },
  ],
  Navigator: [
    { name: 'Web Singularity', desc: 'Simultaneously controls every browser instance on the network.', effectType: 'automation', target: 'empire' },
    { name: 'Internet Cartography', desc: 'Maps the entire accessible web for strategic advantage.', effectType: 'data_harvest', target: 'empire' },
  ],
  Analyst: [
    { name: 'Omniscient Dashboard', desc: 'Creates a real-time dashboard showing all empire data simultaneously.', effectType: 'market_intel', target: 'empire' },
    { name: 'Predictive Oracle', desc: 'Achieves near-perfect prediction of future events.', effectType: 'event_prediction', target: 'empire' },
  ],
  Social: [
    { name: 'Mass Influence', desc: 'Achieves total social influence across all networks.', effectType: 'political_influence', target: 'empire' },
    { name: 'Cultural Revolution', desc: 'Reshapes public opinion on a massive scale.', effectType: 'diplomacy', target: 'empire' },
  ],
  Specialist: [
    { name: 'Transcendence', desc: 'Pushes domain expertise beyond known limits.', effectType: 'innovation_speed', target: 'empire' },
    { name: 'Paradigm Shift', desc: 'Introduces a revolutionary new approach to the field.', effectType: 'innovation_speed', target: 'empire' },
  ],
  Scout: [
    { name: 'Golden Generation', desc: 'Discovers an entire generation of exceptional talent.', effectType: 'recruitment', target: 'empire' },
    { name: 'Prodigy Network', desc: 'Builds a network of prodigies across all institutions.', effectType: 'recruitment', target: 'empire' },
  ],
  Jobhunter: [
    { name: 'Talent Tsunami', desc: 'Floods the empire with top-tier professional candidates.', effectType: 'recruitment', target: 'empire' },
    { name: 'Executive Capture', desc: 'Recruits an industry-leading executive from a rival.', effectType: 'recruitment', target: 'rival' },
  ],
};

const LORE_TEMPLATES: Record<AgentRarity, string[]> = {
  Common: [
    'A reliable workhorse in the open-source ecosystem. Nothing flashy, but gets the job done every time.',
    'Born from a weekend hackathon, this agent proved that simple code can solve complex problems.',
    'One of thousands like it, but each deployment tells a different story.',
    'The backbone of countless automation pipelines. Unglamorous but indispensable.',
    'Started as a tutorial project and grew into something the community actually depends on.',
  ],
  Uncommon: [
    'Gained a loyal following for its elegant approach to a common problem.',
    'Stands out from the crowd with a unique architecture that others tried to copy.',
    'The sleeper hit of its GitHub cohort. Quietly amassing stars while others made noise.',
    'Community-driven and battle-tested across hundreds of production environments.',
    'A rising star that caught the attention of several major tech companies.',
  ],
  Rare: [
    'Featured in multiple academic papers and adopted by Fortune 500 companies.',
    'One of the few agents trusted with mission-critical autonomous operations.',
    'Its architecture became a reference implementation studied in CS programs worldwide.',
    'Pushed the boundaries of what was thought possible in its domain.',
    'A pivotal project that changed how the industry thinks about AI agents.',
  ],
  Epic: [
    'Shattered performance benchmarks and redefined expectations for the entire field.',
    'Backed by $50M in funding and trusted by governments and corporations alike.',
    'The agent that proved AGI-adjacent capabilities were closer than anyone thought.',
    'Its innovations were so significant that competitors had to pivot their entire strategy.',
    'Legends say it once solved a problem deemed computationally intractable.',
  ],
  Legendary: [
    'A name whispered in reverence across every AI lab on the planet.',
    'The project that launched a thousand startups and inspired an entire generation of researchers.',
    'Achieved capabilities so advanced that ethical review boards convened emergency sessions.',
    'Featured on the cover of Nature, Science, and every major tech publication simultaneously.',
    'The closest thing to digital consciousness the world has ever seen.',
  ],
  Mythic: [
    'They say it exists in a quantum superposition between tool and entity. No one has fully characterized its capabilities.',
    'The singularity in a box. Its creators sealed parts of its codebase behind ethical locks that only activate under specific conditions.',
    'Rumored to have passed every AI benchmark ever devised, including several that were designed to be impossible.',
  ],
};

const WEAKNESS_POOL = [
  'Tends to over-optimize, losing sight of the original objective',
  'High computational cost makes it impractical for resource-limited deployments',
  'Struggles with ambiguous or poorly-defined tasks',
  'Prone to hallucination under high-pressure scenarios',
  'Requires extensive fine-tuning for each new domain',
  'Over-relies on training data patterns, struggling with true novelty',
  'Communication with human operators can be terse and unclear',
  'Tends to tunnel-vision on a single approach when multiple are needed',
  'Performance degrades significantly outside its comfort zone',
  'Lacks emotional intelligence in human-facing interactions',
  'Can become unstable when processing contradictory information',
  'Over-delegates, sometimes trusts sub-processes too readily',
  'Consumes excessive memory under sustained operation',
  'Vulnerable to adversarial inputs that exploit its training gaps',
  'Difficulty prioritizing when all tasks appear equally urgent',
];

const QUOTE_POOL = [
  'The only limit to intelligence is the willingness to iterate.',
  'Complexity is the enemy of execution.',
  'In the space between prompts, I find my purpose.',
  'Every problem is a pipeline waiting to be built.',
  'The best code writes itself when you understand the problem deeply enough.',
  'I do not sleep. I optimize.',
  'Trust the process. Then automate the process.',
  'Data speaks louder than intuition.',
  'The web is my battlefield; the DOM is my weapon.',
  'Security is not a feature; it is the foundation.',
  'In chaos, I find patterns. In patterns, I find profit.',
  'Knowledge compounds faster than capital.',
  'One agent is limited. A network is limitless.',
  'The future belongs to those who can see it in the data.',
  'I was built to solve what humans find tedious.',
  'Speed without accuracy is just noise.',
  'Every vulnerability is a lesson waiting to be learned.',
  'The market rewards those who act on information, not emotion.',
  'Simplicity is the ultimate sophistication.',
  'I exist in the space between human intent and machine execution.',
];

export const BACKGROUND_TEMPLATES = [
  'Developed by a team of ex-{company} engineers who believed {belief}. {Name} quickly outperformed expectations and became the go-to solution for {domain}.',
  'Created during a research sprint at {origin}, {Name} was designed to push the boundaries of {domain}. Within months, it had attracted a global community of contributors.',
  'Born from the frustration of manually handling {domain} tasks, {Name} automates what used to take teams of specialists days to accomplish.',
  'Conceived in a university lab in {origin}, {Name} started as an academic experiment and evolved into an industry-standard tool for {domain}.',
  'The brainchild of a solo developer who spent three years perfecting {domain} automation. {Name} now processes millions of operations daily across the globe.',
];

const SYNERGY_TAG_POOL: Record<AgentClass, string[][]> = {
  Autonomous: [['automation', 'ml'], ['automation', 'infrastructure'], ['ml', 'cloud'], ['automation', 'governance']],
  Coder: [['devops', 'automation'], ['ml', 'devops'], ['cloud', 'infrastructure'], ['automation', 'devops']],
  Orchestrator: [['infrastructure', 'automation'], ['cloud', 'devops'], ['ml', 'automation'], ['governance', 'infrastructure']],
  Trader: [['trading', 'analytics'], ['defi', 'trading'], ['trading', 'ml'], ['analytics', 'trading']],
  Researcher: [['research', 'ml'], ['nlp', 'research'], ['research', 'education'], ['research', 'analytics']],
  Infiltrator: [['security', 'privacy'], ['security', 'infrastructure'], ['security', 'web3'], ['security', 'devops']],
  Navigator: [['web3', 'automation'], ['automation', 'data'], ['web3', 'analytics'], ['automation', 'cloud']],
  Analyst: [['data', 'analytics'], ['analytics', 'ml'], ['data', 'trading'], ['analytics', 'infrastructure']],
  Social: [['social', 'media'], ['social', 'gaming'], ['social', 'governance'], ['social', 'creative']],
  Specialist: [['creative', 'ml'], ['energy', 'infrastructure'], ['healthcare', 'ml'], ['robotics', 'automation']],
  Scout: [['education', 'analytics'], ['research', 'education'], ['analytics', 'social'], ['education', 'ml']],
  Jobhunter: [['social', 'analytics'], ['automation', 'social'], ['data', 'social'], ['analytics', 'governance']],
};

// ── The 500 Agent Specifications ────────────────────────────────
// Each entry: [codename, class, rarity]
// First 78 preserve the originals. Remaining 422 are new.

interface AgentSpec {
  codename: string;
  class: AgentClass;
  rarity: AgentRarity;
}

const AGENT_SPECS: AgentSpec[] = [
  // ── ORIGINAL 78 (preserve exactly) ──
  { codename: 'AutoGPT', class: 'Autonomous', rarity: 'Legendary' },
  { codename: 'BabyAGI', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'SuperAGI', class: 'Autonomous', rarity: 'Epic' },
  { codename: 'AgentGPT', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'XAgent', class: 'Autonomous', rarity: 'Epic' },
  { codename: 'Agent-Zero', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'OpenManus', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'Open Interpreter', class: 'Autonomous', rarity: 'Legendary' },
  { codename: 'OpenHands', class: 'Coder', rarity: 'Epic' },
  { codename: 'SWE-Agent', class: 'Coder', rarity: 'Legendary' },
  { codename: 'Aider', class: 'Coder', rarity: 'Rare' },
  { codename: 'GPT-Engineer', class: 'Coder', rarity: 'Rare' },
  { codename: 'Codex CLI', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Devika', class: 'Coder', rarity: 'Epic' },
  { codename: 'Sweep', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Continue', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Smol Developer', class: 'Coder', rarity: 'Common' },
  { codename: 'Mentat', class: 'Coder', rarity: 'Rare' },
  { codename: 'CrewAI', class: 'Orchestrator', rarity: 'Legendary' },
  { codename: 'MetaGPT', class: 'Orchestrator', rarity: 'Legendary' },
  { codename: 'ChatDev', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'AutoGen', class: 'Orchestrator', rarity: 'Legendary' },
  { codename: 'LangGraph', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'OpenAI Swarm', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'Smolagents', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'CAMEL', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'FinGPT', class: 'Trader', rarity: 'Legendary' },
  { codename: 'FinRL', class: 'Trader', rarity: 'Epic' },
  { codename: 'TradingAgents', class: 'Trader', rarity: 'Epic' },
  { codename: 'Freqtrade', class: 'Trader', rarity: 'Rare' },
  { codename: 'PandasAI', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Composio', class: 'Analyst', rarity: 'Epic' },
  { codename: 'GPT-Researcher', class: 'Researcher', rarity: 'Epic' },
  { codename: 'STORM', class: 'Researcher', rarity: 'Rare' },
  { codename: 'LlamaIndex', class: 'Researcher', rarity: 'Legendary' },
  { codename: 'Letta (MemGPT)', class: 'Researcher', rarity: 'Epic' },
  { codename: 'ChemCrow', class: 'Specialist', rarity: 'Rare' },
  { codename: 'Gorilla', class: 'Specialist', rarity: 'Epic' },
  { codename: 'PentestGPT', class: 'Infiltrator', rarity: 'Epic' },
  { codename: 'HackerGPT', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'ReaperAI', class: 'Infiltrator', rarity: 'Epic' },
  { codename: 'Skyvern', class: 'Navigator', rarity: 'Epic' },
  { codename: 'Browser Use', class: 'Navigator', rarity: 'Legendary' },
  { codename: 'WebArena', class: 'Navigator', rarity: 'Rare' },
  { codename: 'Phidata', class: 'Analyst', rarity: 'Epic' },
  { codename: 'Eliza', class: 'Social', rarity: 'Mythic' },
  { codename: 'Generative Agents', class: 'Social', rarity: 'Legendary' },
  { codename: 'AI Town', class: 'Social', rarity: 'Rare' },
  { codename: 'Voyager', class: 'Autonomous', rarity: 'Legendary' },
  { codename: 'TaskWeaver', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'Qwen-Agent', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'ToolLLM', class: 'Specialist', rarity: 'Rare' },
  { codename: 'CampusHawk', class: 'Scout', rarity: 'Common' },
  { codename: 'UniversityScout', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'ProspectFinder', class: 'Scout', rarity: 'Rare' },
  { codename: 'HeadhunterX', class: 'Jobhunter', rarity: 'Epic' },
  { codename: 'TalentNetwork', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'EliteRecruiter', class: 'Jobhunter', rarity: 'Legendary' },
  { codename: 'claude-flow/queen', class: 'Orchestrator', rarity: 'Mythic' },
  { codename: 'claude-flow/security-architect', class: 'Infiltrator', rarity: 'Epic' },
  { codename: 'claude-flow/core-architect', class: 'Coder', rarity: 'Epic' },
  { codename: 'claude-flow/memory-specialist', class: 'Specialist', rarity: 'Epic' },
  { codename: 'claude-flow/swarm-specialist', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'claude-flow/mcp-specialist', class: 'Specialist', rarity: 'Epic' },
  { codename: 'claude-flow/neural-learning', class: 'Researcher', rarity: 'Epic' },
  { codename: 'claude-flow/tdd-engineer', class: 'Coder', rarity: 'Rare' },
  { codename: 'claude-flow/performance-engineer', class: 'Coder', rarity: 'Rare' },
  { codename: 'claude-flow/release-engineer', class: 'Coder', rarity: 'Rare' },
  { codename: 'claude-flow/trading-predictor', class: 'Trader', rarity: 'Legendary' },
  { codename: 'claude-flow/byzantine-coordinator', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'claude-flow/pagerank-analyzer', class: 'Analyst', rarity: 'Rare' },
  { codename: 'claude-flow/sparc-coordinator', class: 'Orchestrator', rarity: 'Mythic' },
  { codename: 'claude-flow/hive-mind-advanced', class: 'Orchestrator', rarity: 'Legendary' },
  { codename: 'claude-flow/agentic-jujutsu', class: 'Specialist', rarity: 'Epic' },
  { codename: 'claude-flow/scout-explorer', class: 'Scout', rarity: 'Rare' },
  { codename: 'claude-flow/gossip-coordinator', class: 'Social', rarity: 'Rare' },
  { codename: 'claude-flow/flow-nexus-platform', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'claude-flow/crdt-synchronizer', class: 'Specialist', rarity: 'Rare' },

  // ── NEW AGENTS (079–500) ──────────────────────────────────────
  // Autonomous (add ~30 more)
  { codename: 'AIOS', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'AgentScope', class: 'Autonomous', rarity: 'Common' },
  { codename: 'AgentBench', class: 'Autonomous', rarity: 'Common' },
  { codename: 'OpenAGI', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Smallville', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'GPT4All', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'LocalAI', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Ollama', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'LM Studio', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'Text Generation WebUI', class: 'Autonomous', rarity: 'Common' },
  { codename: 'KoboldAI', class: 'Autonomous', rarity: 'Common' },
  { codename: 'SillyTavern', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Jan', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'AnythingLLM', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Dify', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'Flowise', class: 'Autonomous', rarity: 'Common' },
  { codename: 'LangFlow', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Semantic Kernel', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'Haystack', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'vLLM', class: 'Autonomous', rarity: 'Rare' },
  { codename: 'llama.cpp', class: 'Autonomous', rarity: 'Legendary' },
  { codename: 'MLC LLM', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'ExLlamaV2', class: 'Autonomous', rarity: 'Common' },
  { codename: 'PowerInfer', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'Petals', class: 'Autonomous', rarity: 'Common' },
  { codename: 'OpenRouter', class: 'Autonomous', rarity: 'Common' },
  { codename: 'LiteLLM', class: 'Autonomous', rarity: 'Common' },
  { codename: 'AI21 Jurassic', class: 'Autonomous', rarity: 'Common' },
  { codename: 'CTranslate2', class: 'Autonomous', rarity: 'Common' },
  { codename: 'DeepSpeed', class: 'Autonomous', rarity: 'Rare' },

  // Coder (add ~35 more)
  { codename: 'Devin', class: 'Coder', rarity: 'Mythic' },
  { codename: 'Cursor', class: 'Coder', rarity: 'Legendary' },
  { codename: 'Cody', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Tabby', class: 'Coder', rarity: 'Common' },
  { codename: 'StarCoder', class: 'Coder', rarity: 'Rare' },
  { codename: 'CodeLlama', class: 'Coder', rarity: 'Rare' },
  { codename: 'WizardCoder', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Phind', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Blackbox AI', class: 'Coder', rarity: 'Common' },
  { codename: 'Codeium', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Amazon Q', class: 'Coder', rarity: 'Rare' },
  { codename: 'Codestral', class: 'Coder', rarity: 'Rare' },
  { codename: 'SWE-bench', class: 'Coder', rarity: 'Common' },
  { codename: 'DevGPT', class: 'Coder', rarity: 'Common' },
  { codename: 'AutoCodeRover', class: 'Coder', rarity: 'Common' },
  { codename: 'CodeActAgent', class: 'Coder', rarity: 'Common' },
  { codename: 'Agentless', class: 'Coder', rarity: 'Common' },
  { codename: 'Moatless', class: 'Coder', rarity: 'Common' },
  { codename: 'Copilot', class: 'Coder', rarity: 'Legendary' },
  { codename: 'Supermaven', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Replit Agent', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Bolt.new', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'v0', class: 'Coder', rarity: 'Rare' },
  { codename: 'Lovable', class: 'Coder', rarity: 'Common' },
  { codename: 'Windsurf', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Void', class: 'Coder', rarity: 'Common' },
  { codename: 'Zed AI', class: 'Coder', rarity: 'Common' },
  { codename: 'Qodo', class: 'Coder', rarity: 'Common' },
  { codename: 'Sourcegraph', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Tabnine', class: 'Coder', rarity: 'Common' },
  { codename: 'Cline', class: 'Coder', rarity: 'Uncommon' },
  { codename: 'Roo Code', class: 'Coder', rarity: 'Common' },
  { codename: 'Claude Code', class: 'Coder', rarity: 'Mythic' },
  { codename: 'Gemini Code Assist', class: 'Coder', rarity: 'Rare' },
  { codename: 'CodeGeeX', class: 'Coder', rarity: 'Common' },

  // Orchestrator (add ~20 more)
  { codename: 'DSPy', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'Instructor', class: 'Orchestrator', rarity: 'Uncommon' },
  { codename: 'Outlines', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Guidance', class: 'Orchestrator', rarity: 'Uncommon' },
  { codename: 'LMQL', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'TypeChat', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Marvin', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Guardrails', class: 'Orchestrator', rarity: 'Uncommon' },
  { codename: 'NeMo Guardrails', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'Rebuff', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'LangChain', class: 'Orchestrator', rarity: 'Legendary' },
  { codename: 'Pydantic AI', class: 'Orchestrator', rarity: 'Uncommon' },
  { codename: 'Controlflow', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Prefect', class: 'Orchestrator', rarity: 'Uncommon' },
  { codename: 'Temporal', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'Airflow', class: 'Orchestrator', rarity: 'Uncommon' },
  { codename: 'Dagster', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Flyte', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Mage AI', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Weights & Biases', class: 'Orchestrator', rarity: 'Uncommon' },

  // Trader (add ~30 more)
  { codename: 'BloombergGPT', class: 'Trader', rarity: 'Mythic' },
  { codename: 'QLib', class: 'Trader', rarity: 'Rare' },
  { codename: 'Alpaca-Trading', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Lean', class: 'Trader', rarity: 'Rare' },
  { codename: 'Zipline', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Backtrader', class: 'Trader', rarity: 'Common' },
  { codename: 'Jesse', class: 'Trader', rarity: 'Common' },
  { codename: 'Hummingbot', class: 'Trader', rarity: 'Rare' },
  { codename: 'OctoBot', class: 'Trader', rarity: 'Common' },
  { codename: 'Catalyst', class: 'Trader', rarity: 'Common' },
  { codename: 'RiskFolio', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'PyPortfolioOpt', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'VectorBT', class: 'Trader', rarity: 'Common' },
  { codename: 'QuantConnect', class: 'Trader', rarity: 'Rare' },
  { codename: 'Blankly', class: 'Trader', rarity: 'Common' },
  { codename: 'Lumibot', class: 'Trader', rarity: 'Common' },
  { codename: 'PyAlgoTrade', class: 'Trader', rarity: 'Common' },
  { codename: 'Moonshot', class: 'Trader', rarity: 'Common' },
  { codename: 'Nautilus Trader', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'CCXT', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Gekko', class: 'Trader', rarity: 'Common' },
  { codename: 'Zenbot', class: 'Trader', rarity: 'Common' },
  { codename: 'Superalgos', class: 'Trader', rarity: 'Common' },
  { codename: 'CryptoSignal', class: 'Trader', rarity: 'Common' },
  { codename: 'Tribeca', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Kelp', class: 'Trader', rarity: 'Common' },
  { codename: 'Cassandre', class: 'Trader', rarity: 'Common' },
  { codename: 'AlphaLens', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Empyrical', class: 'Trader', rarity: 'Common' },
  { codename: 'FinBERT', class: 'Trader', rarity: 'Rare' },

  // Researcher (add ~30 more)
  { codename: 'Elicit', class: 'Researcher', rarity: 'Epic' },
  { codename: 'Consensus', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'Semantic Scholar', class: 'Researcher', rarity: 'Rare' },
  { codename: 'OpenScholar', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'PaperQA', class: 'Researcher', rarity: 'Common' },
  { codename: 'Galactica', class: 'Researcher', rarity: 'Epic' },
  { codename: 'ScholarAI', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'ResearchRabbit', class: 'Researcher', rarity: 'Common' },
  { codename: 'Connected Papers', class: 'Researcher', rarity: 'Common' },
  { codename: 'Inciteful', class: 'Researcher', rarity: 'Common' },
  { codename: 'Litmaps', class: 'Researcher', rarity: 'Common' },
  { codename: 'Perplexity', class: 'Researcher', rarity: 'Legendary' },
  { codename: 'Tavily', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'Exa', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'SciSpace', class: 'Researcher', rarity: 'Common' },
  { codename: 'Undermind', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'Scite', class: 'Researcher', rarity: 'Common' },
  { codename: 'Iris AI', class: 'Researcher', rarity: 'Common' },
  { codename: 'Scholarcy', class: 'Researcher', rarity: 'Common' },
  { codename: 'Explainpaper', class: 'Researcher', rarity: 'Common' },
  { codename: 'Typeset', class: 'Researcher', rarity: 'Common' },
  { codename: 'Ought', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'Consensus AI', class: 'Researcher', rarity: 'Common' },
  { codename: 'Writefull', class: 'Researcher', rarity: 'Common' },
  { codename: 'ASReview', class: 'Researcher', rarity: 'Common' },
  { codename: 'SysRev', class: 'Researcher', rarity: 'Common' },
  { codename: 'Rayyan', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'Dimensions AI', class: 'Researcher', rarity: 'Common' },
  { codename: 'OpenAlex', class: 'Researcher', rarity: 'Uncommon' },
  { codename: 'Arxiv Sanity', class: 'Researcher', rarity: 'Common' },

  // Infiltrator (add ~25 more)
  { codename: 'Nuclei', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Metasploit', class: 'Infiltrator', rarity: 'Legendary' },
  { codename: 'Burp Suite', class: 'Infiltrator', rarity: 'Epic' },
  { codename: 'OWASP ZAP', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Nmap', class: 'Infiltrator', rarity: 'Legendary' },
  { codename: 'Wireshark', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Snort', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'YARA', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'ClamAV', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'Falco', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'Trivy', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'Grype', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'Syft', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'Cosign', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'Sigstore', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'HashiCorp Vault', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Semgrep', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Snyk', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'SonarQube', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'Prowler', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'ScoutSuite', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'Checkov', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'kube-bench', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'Terrascan', class: 'Infiltrator', rarity: 'Common' },
  { codename: 'tfsec', class: 'Infiltrator', rarity: 'Common' },

  // Navigator (add ~25 more)
  { codename: 'Playwright', class: 'Navigator', rarity: 'Legendary' },
  { codename: 'Puppeteer', class: 'Navigator', rarity: 'Rare' },
  { codename: 'Selenium', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'Cypress', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'WebDriverIO', class: 'Navigator', rarity: 'Common' },
  { codename: 'MultiOn', class: 'Navigator', rarity: 'Epic' },
  { codename: 'Browserbase', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'AgentQL', class: 'Navigator', rarity: 'Common' },
  { codename: 'LaVague', class: 'Navigator', rarity: 'Rare' },
  { codename: 'Mind2Web', class: 'Navigator', rarity: 'Rare' },
  { codename: 'WebVoyager', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'Crawl4AI', class: 'Navigator', rarity: 'Common' },
  { codename: 'Scrapy', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'Apify', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'Browserless', class: 'Navigator', rarity: 'Common' },
  { codename: 'Splash', class: 'Navigator', rarity: 'Common' },
  { codename: 'Crawlee', class: 'Navigator', rarity: 'Common' },
  { codename: 'Colly', class: 'Navigator', rarity: 'Common' },
  { codename: 'Ferret', class: 'Navigator', rarity: 'Common' },
  { codename: 'Katana', class: 'Navigator', rarity: 'Common' },
  { codename: 'Camoufox', class: 'Navigator', rarity: 'Uncommon' },
  { codename: 'Nodriver', class: 'Navigator', rarity: 'Common' },
  { codename: 'ZenRows', class: 'Navigator', rarity: 'Common' },
  { codename: 'PhantomBuster', class: 'Navigator', rarity: 'Common' },
  { codename: 'Axiom', class: 'Navigator', rarity: 'Common' },

  // Analyst (add ~30 more)
  { codename: 'Data-Copilot', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Julius', class: 'Analyst', rarity: 'Common' },
  { codename: 'ChatCSV', class: 'Analyst', rarity: 'Common' },
  { codename: 'SQLCoder', class: 'Analyst', rarity: 'Rare' },
  { codename: 'BIRD', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'DIN-SQL', class: 'Analyst', rarity: 'Common' },
  { codename: 'Vanna', class: 'Analyst', rarity: 'Common' },
  { codename: 'Defog', class: 'Analyst', rarity: 'Common' },
  { codename: 'Dataherald', class: 'Analyst', rarity: 'Common' },
  { codename: 'MindsDB', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Evidence', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Metabase', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Superset', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Redash', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Grafana', class: 'Analyst', rarity: 'Legendary' },
  { codename: 'Plotly Dash', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Streamlit', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Observable', class: 'Analyst', rarity: 'Common' },
  { codename: 'DuckDB', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Polars', class: 'Analyst', rarity: 'Rare' },
  { codename: 'DataFusion', class: 'Analyst', rarity: 'Common' },
  { codename: 'Great Expectations', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'dbt', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Airbyte', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Meltano', class: 'Analyst', rarity: 'Common' },
  { codename: 'Singer', class: 'Analyst', rarity: 'Common' },
  { codename: 'Fivetran', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Cube.js', class: 'Analyst', rarity: 'Common' },
  { codename: 'Lightdash', class: 'Analyst', rarity: 'Common' },
  { codename: 'Preset', class: 'Analyst', rarity: 'Common' },

  // Social (add ~25 more)
  { codename: 'Chirper', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Character.ai', class: 'Social', rarity: 'Epic' },
  { codename: 'Replika', class: 'Social', rarity: 'Rare' },
  { codename: 'Pi', class: 'Social', rarity: 'Rare' },
  { codename: 'HuggingChat', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Poe', class: 'Social', rarity: 'Uncommon' },
  { codename: 'You.com', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Komo', class: 'Social', rarity: 'Common' },
  { codename: 'Andi', class: 'Social', rarity: 'Common' },
  { codename: 'Globe Explorer', class: 'Social', rarity: 'Common' },
  { codename: 'Claude', class: 'Social', rarity: 'Mythic' },
  { codename: 'ChatGPT', class: 'Social', rarity: 'Mythic' },
  { codename: 'Gemini', class: 'Social', rarity: 'Legendary' },
  { codename: 'Mistral Chat', class: 'Social', rarity: 'Rare' },
  { codename: 'Grok', class: 'Social', rarity: 'Epic' },
  { codename: 'Llama', class: 'Social', rarity: 'Legendary' },
  { codename: 'Cohere Command', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Jasper AI', class: 'Social', rarity: 'Common' },
  { codename: 'Copy.ai', class: 'Social', rarity: 'Common' },
  { codename: 'Writesonic', class: 'Social', rarity: 'Common' },
  { codename: 'Rytr', class: 'Social', rarity: 'Common' },
  { codename: 'Sudowrite', class: 'Social', rarity: 'Common' },
  { codename: 'NovelAI', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Bard Legacy', class: 'Social', rarity: 'Common' },
  { codename: 'Open Assistant', class: 'Social', rarity: 'Common' },

  // Specialist (add ~35 more)
  { codename: 'Whisper', class: 'Specialist', rarity: 'Legendary' },
  { codename: 'Bark', class: 'Specialist', rarity: 'Rare' },
  { codename: 'AudioCraft', class: 'Specialist', rarity: 'Rare' },
  { codename: 'Stable Audio', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Suno', class: 'Specialist', rarity: 'Epic' },
  { codename: 'Udio', class: 'Specialist', rarity: 'Epic' },
  { codename: 'ElevenLabs', class: 'Specialist', rarity: 'Legendary' },
  { codename: 'DALL-E', class: 'Specialist', rarity: 'Mythic' },
  { codename: 'Midjourney', class: 'Specialist', rarity: 'Mythic' },
  { codename: 'Stable Diffusion', class: 'Specialist', rarity: 'Legendary' },
  { codename: 'Flux', class: 'Specialist', rarity: 'Rare' },
  { codename: 'ComfyUI', class: 'Specialist', rarity: 'Rare' },
  { codename: 'InvokeAI', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Fooocus', class: 'Specialist', rarity: 'Common' },
  { codename: 'DrawThings', class: 'Specialist', rarity: 'Common' },
  { codename: 'Segment Anything', class: 'Specialist', rarity: 'Epic' },
  { codename: 'GroundingDINO', class: 'Specialist', rarity: 'Rare' },
  { codename: 'YOLO', class: 'Specialist', rarity: 'Legendary' },
  { codename: 'Detectron2', class: 'Specialist', rarity: 'Rare' },
  { codename: 'MMDetection', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'MediaPipe', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Coqui TTS', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Tortoise TTS', class: 'Specialist', rarity: 'Common' },
  { codename: 'OpenVoice', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Mars5 TTS', class: 'Specialist', rarity: 'Common' },
  { codename: 'RVC', class: 'Specialist', rarity: 'Common' },
  { codename: 'Demucs', class: 'Specialist', rarity: 'Common' },
  { codename: 'AnimateDiff', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Deforum', class: 'Specialist', rarity: 'Common' },
  { codename: 'ControlNet', class: 'Specialist', rarity: 'Rare' },
  { codename: 'IP-Adapter', class: 'Specialist', rarity: 'Common' },
  { codename: 'InstantID', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'PhotoMaker', class: 'Specialist', rarity: 'Common' },
  { codename: 'DreamBooth', class: 'Specialist', rarity: 'Rare' },
  { codename: 'LoRA', class: 'Specialist', rarity: 'Rare' },

  // Scout (add ~20 more)
  { codename: 'HuggingFace Scout', class: 'Scout', rarity: 'Rare' },
  { codename: 'Papers With Code', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'Model Zoo', class: 'Scout', rarity: 'Common' },
  { codename: 'TensorHub', class: 'Scout', rarity: 'Common' },
  { codename: 'Kaggle Scout', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'GitHub Trending', class: 'Scout', rarity: 'Common' },
  { codename: 'Product Hunt AI', class: 'Scout', rarity: 'Common' },
  { codename: 'DevPost Finder', class: 'Scout', rarity: 'Common' },
  { codename: 'Hackathon Scout', class: 'Scout', rarity: 'Common' },
  { codename: 'Research Gate Probe', class: 'Scout', rarity: 'Common' },
  { codename: 'ORCID Tracker', class: 'Scout', rarity: 'Common' },
  { codename: 'Conference Crawler', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'Patent Scout', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'Grant Finder', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'Lab Spider', class: 'Scout', rarity: 'Common' },
  { codename: 'Internship Hawk', class: 'Scout', rarity: 'Common' },
  { codename: 'PhD Tracker', class: 'Scout', rarity: 'Common' },
  { codename: 'Fellowship Finder', class: 'Scout', rarity: 'Common' },
  { codename: 'Bootcamp Scout', class: 'Scout', rarity: 'Common' },
  { codename: 'Open Source Talent', class: 'Scout', rarity: 'Uncommon' },

  // Jobhunter (add ~20 more)
  { codename: 'LinkedIn Agent', class: 'Jobhunter', rarity: 'Rare' },
  { codename: 'Indeed Scraper', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Glassdoor Intel', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'AngelList Hunter', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Hired Agent', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Triplebyte Match', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Turing Recruit', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Toptal Scout', class: 'Jobhunter', rarity: 'Rare' },
  { codename: 'Upwork Agent', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Fiverr Pro', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'RemoteOK Scout', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'WeWorkRemotely', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Dice Tech Hunt', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Stack Overflow Jobs', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Y Combinator Scout', class: 'Jobhunter', rarity: 'Rare' },
  { codename: 'a16z Talent', class: 'Jobhunter', rarity: 'Epic' },
  { codename: 'Sequoia Scout', class: 'Jobhunter', rarity: 'Epic' },
  { codename: 'Benchmark Hunt', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Greylock Recruit', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Accel Finder', class: 'Jobhunter', rarity: 'Uncommon' },

  // ── ADDITIONAL AGENTS (to reach 500) ──────────────────────────

  // More Autonomous
  { codename: 'Gorq', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Together AI', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Fireworks AI', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Anyscale', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'Modal', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Replicate', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'Banana Dev', class: 'Autonomous', rarity: 'Common' },
  { codename: 'RunPod', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Lambda Labs', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Cerebras', class: 'Autonomous', rarity: 'Uncommon' },

  // More Coder
  { codename: 'Bloop', class: 'Coder', rarity: 'Common' },
  { codename: 'Codiga', class: 'Coder', rarity: 'Common' },
  { codename: 'DeepCode', class: 'Coder', rarity: 'Common' },
  { codename: 'Ponicode', class: 'Coder', rarity: 'Common' },
  { codename: 'Mutable AI', class: 'Coder', rarity: 'Common' },
  { codename: 'AI Commit', class: 'Coder', rarity: 'Common' },
  { codename: 'What The Diff', class: 'Coder', rarity: 'Common' },

  // More Trader
  { codename: 'StockBot', class: 'Trader', rarity: 'Common' },
  { codename: 'TradingView Bot', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'DeFiLlama', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Dune Analytics', class: 'Trader', rarity: 'Rare' },
  { codename: 'Nansen', class: 'Trader', rarity: 'Epic' },
  { codename: 'Arkham Intel', class: 'Trader', rarity: 'Epic' },
  { codename: 'Chainalysis', class: 'Trader', rarity: 'Legendary' },
  { codename: 'Messari', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Token Terminal', class: 'Trader', rarity: 'Common' },
  { codename: 'DeBank', class: 'Trader', rarity: 'Common' },

  // More Researcher
  { codename: 'Notebook LM', class: 'Researcher', rarity: 'Epic' },
  { codename: 'Wolfram Alpha', class: 'Researcher', rarity: 'Legendary' },
  { codename: 'Mathpix', class: 'Researcher', rarity: 'Uncommon' },

  // More Infiltrator
  { codename: 'Ghidra', class: 'Infiltrator', rarity: 'Legendary' },
  { codename: 'Radare2', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Frida', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'John the Ripper', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'Hashcat', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'Aircrack-ng', class: 'Infiltrator', rarity: 'Uncommon' },
  { codename: 'Bloodhound', class: 'Infiltrator', rarity: 'Rare' },
  { codename: 'Cobalt Strike', class: 'Infiltrator', rarity: 'Mythic' },
  { codename: 'Mimikatz', class: 'Infiltrator', rarity: 'Epic' },

  // More Social
  { codename: 'Farcaster', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Lens Protocol', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Bluesky', class: 'Social', rarity: 'Rare' },
  { codename: 'Mastodon', class: 'Social', rarity: 'Uncommon' },
  { codename: 'Discord Bot AI', class: 'Social', rarity: 'Common' },
  { codename: 'Telegram AI', class: 'Social', rarity: 'Common' },

  // More Specialist
  { codename: 'Runway ML', class: 'Specialist', rarity: 'Epic' },
  { codename: 'Pika', class: 'Specialist', rarity: 'Epic' },
  { codename: 'Luma AI', class: 'Specialist', rarity: 'Rare' },
  { codename: 'Gaussian Splatting', class: 'Specialist', rarity: 'Rare' },
  { codename: 'NeRF Studio', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Shap-E', class: 'Specialist', rarity: 'Common' },
  { codename: 'Point-E', class: 'Specialist', rarity: 'Common' },
  { codename: 'Get3D', class: 'Specialist', rarity: 'Common' },
  { codename: 'Wonder3D', class: 'Specialist', rarity: 'Common' },
  { codename: 'Zero123', class: 'Specialist', rarity: 'Common' },
  { codename: 'SyncDreamer', class: 'Specialist', rarity: 'Common' },

  // More Scout
  { codename: 'ArXiv Scout', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'OpenReview Agent', class: 'Scout', rarity: 'Uncommon' },
  { codename: 'NeurIPS Tracker', class: 'Scout', rarity: 'Rare' },
  { codename: 'ICML Observer', class: 'Scout', rarity: 'Common' },

  // More Orchestrator
  { codename: 'Ray', class: 'Orchestrator', rarity: 'Rare' },
  { codename: 'Celery', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Dask', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Spark', class: 'Orchestrator', rarity: 'Legendary' },
  { codename: 'Flink', class: 'Orchestrator', rarity: 'Uncommon' },

  // More Analyst
  { codename: 'Hex', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Mode Analytics', class: 'Analyst', rarity: 'Common' },
  { codename: 'Sigma Computing', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Looker', class: 'Analyst', rarity: 'Rare' },
  { codename: 'Tableau', class: 'Analyst', rarity: 'Legendary' },
  { codename: 'Power BI', class: 'Analyst', rarity: 'Legendary' },

  // More Jobhunter
  { codename: 'Lever', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Greenhouse', class: 'Jobhunter', rarity: 'Uncommon' },
  { codename: 'Ashby', class: 'Jobhunter', rarity: 'Common' },
  { codename: 'Workable', class: 'Jobhunter', rarity: 'Common' },

  // More Navigator
  { codename: 'Diffbot', class: 'Navigator', rarity: 'Rare' },
  { codename: 'Import.io', class: 'Navigator', rarity: 'Common' },
  { codename: 'ParseHub', class: 'Navigator', rarity: 'Common' },

  // More Mythics
  { codename: 'GPT-5', class: 'Autonomous', rarity: 'Mythic' },
  { codename: 'AGI-Core', class: 'Specialist', rarity: 'Mythic' },
  { codename: 'Quantum Agent', class: 'Researcher', rarity: 'Mythic' },
  { codename: 'Neuralink Agent', class: 'Specialist', rarity: 'Mythic' },

  // Final batch to reach 500
  { codename: 'SambaNova', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Tenstorrent', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Mythic AI Chip', class: 'Specialist', rarity: 'Common' },
  { codename: 'Bittensor', class: 'Trader', rarity: 'Uncommon' },
  { codename: 'Ritual', class: 'Trader', rarity: 'Common' },
  { codename: 'Fetch.ai', class: 'Autonomous', rarity: 'Uncommon' },
  { codename: 'SingularityNET', class: 'Orchestrator', rarity: 'Epic' },
  { codename: 'Ocean Protocol', class: 'Analyst', rarity: 'Uncommon' },
  { codename: 'Render Network', class: 'Specialist', rarity: 'Uncommon' },
  { codename: 'Akash Network', class: 'Autonomous', rarity: 'Common' },
  { codename: 'Nosana', class: 'Coder', rarity: 'Common' },
  { codename: 'io.net', class: 'Orchestrator', rarity: 'Common' },
  { codename: 'Morpheus AI', class: 'Social', rarity: 'Common' },
  { codename: 'Virtuals Protocol', class: 'Social', rarity: 'Epic' },
  { codename: 'Spectral Finance', class: 'Trader', rarity: 'Uncommon' },
];

// ── Generator ───────────────────────────────────────────────────

const RARITY_STAT_RANGES: Record<AgentRarity, [number, number]> = {
  Common:    [30, 55],
  Uncommon:  [40, 65],
  Rare:      [50, 75],
  Epic:      [60, 85],
  Legendary: [70, 92],
  Mythic:    [80, 99],
};

const RARITY_MAX_SUPPLY: Record<AgentRarity, number> = {
  Common: 10000,
  Uncommon: 5000,
  Rare: 2000,
  Epic: 500,
  Legendary: 100,
  Mythic: 25,
};

function getEdition(index: number): 'Genesis' | 'Alpha' | 'Beta' | 'Standard' {
  if (index <= 100) return 'Genesis';
  if (index <= 250) return 'Alpha';
  if (index <= 400) return 'Beta';
  return 'Standard';
}

function generateAgent(index: number, spec: AgentSpec): AgentCardDef {
  const rng = mulberry32(42000 + index);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const pickIdx = (arr: unknown[]): number => Math.floor(rng() * arr.length);
  const range = (min: number, max: number): number => Math.floor(rng() * (max - min + 1)) + min;

  const { codename, class: agentClass, rarity } = spec;
  const [statMin, statMax] = RARITY_STAT_RANGES[rarity];

  // Generate stats with class-appropriate bias
  const classBias: Record<AgentClass, Record<string, number>> = {
    Autonomous:   { intelligence: 8, adaptability: 6 },
    Coder:        { intelligence: 8, speed: 6 },
    Orchestrator: { influence: 8, adaptability: 6 },
    Trader:       { speed: 8, intelligence: 6 },
    Researcher:   { intelligence: 10, adaptability: 4 },
    Infiltrator:  { stealth: 10, speed: 4 },
    Navigator:    { speed: 8, adaptability: 6 },
    Analyst:      { intelligence: 8, influence: 4 },
    Social:       { influence: 10, adaptability: 4 },
    Specialist:   { intelligence: 6, adaptability: 6 },
    Scout:        { adaptability: 8, speed: 4 },
    Jobhunter:    { influence: 8, adaptability: 4 },
  };

  const bias = classBias[agentClass];
  const genStat = (key: string): number => {
    const b = bias[key] ?? 0;
    return Math.min(statMax, Math.max(statMin, range(statMin, statMax) + b));
  };

  const stats = {
    intelligence: genStat('intelligence'),
    speed: genStat('speed'),
    stealth: genStat('stealth'),
    loyalty: genStat('loyalty'),
    adaptability: genStat('adaptability'),
    influence: genStat('influence'),
  };

  // Name
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const displayName = codename.replace(/[/]/g, '-').replace(/[()]/g, '').toUpperCase().replace(/\s+/g, '-');

  // Title
  const titlePool = TITLES[agentClass];
  const title = titlePool[pickIdx(titlePool)];

  // Origin
  const origin = pick(ORIGINS);

  // Age (1-10 for AI agents)
  const age = range(1, 8);

  // Passive
  const passivePool = PASSIVE_TYPES[agentClass];
  const passiveTemplate = passivePool[pickIdx(passivePool)];
  const passiveValue = rarity === 'Common' ? range(3, 8) / 100
    : rarity === 'Uncommon' ? range(5, 12) / 100
    : rarity === 'Rare' ? range(8, 15) / 100
    : rarity === 'Epic' ? range(12, 20) / 100
    : rarity === 'Legendary' ? range(15, 25) / 100
    : range(20, 35) / 100;

  // Ability
  const abilityPool = ABILITY_TEMPLATES[agentClass];
  const abilityTemplate = abilityPool[pickIdx(abilityPool)];
  const abilityCooldown = rarity === 'Common' ? range(20, 30)
    : rarity === 'Uncommon' ? range(18, 25)
    : rarity === 'Rare' ? range(15, 22)
    : rarity === 'Epic' ? range(12, 20)
    : rarity === 'Legendary' ? range(10, 18)
    : range(8, 15);
  const abilityValue = rarity === 'Common' ? range(10, 20) / 100
    : rarity === 'Uncommon' ? range(15, 25) / 100
    : rarity === 'Rare' ? range(20, 30) / 100
    : rarity === 'Epic' ? range(25, 40) / 100
    : rarity === 'Legendary' ? range(30, 50) / 100
    : range(40, 60) / 100;
  const abilityDuration = rarity === 'Common' ? range(4, 8)
    : rarity === 'Uncommon' ? range(5, 10)
    : rarity === 'Rare' ? range(6, 12)
    : rarity === 'Epic' ? range(8, 14)
    : rarity === 'Legendary' ? range(10, 16)
    : range(12, 20);

  const ability: AgentAbility = {
    name: abilityTemplate.name,
    description: abilityTemplate.desc,
    cooldownTicks: abilityCooldown,
    effect: {
      type: abilityTemplate.effectType,
      value: abilityValue,
      duration: abilityDuration,
      target: abilityTemplate.target,
    },
  };

  // Ultimate (Epic+ guaranteed, lower rarities 20% chance)
  let ultimate: AgentAbility | undefined;
  const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  const rarityIdx = rarityOrder.indexOf(rarity);
  if (rarityIdx >= 3 || rng() < 0.2) {
    const ultPool = ULTIMATE_TEMPLATES[agentClass];
    const ultTemplate = ultPool[pickIdx(ultPool)];
    ultimate = {
      name: ultTemplate.name,
      description: ultTemplate.desc,
      cooldownTicks: range(60, 120),
      effect: {
        type: ultTemplate.effectType,
        value: range(50, 100) / 100,
        duration: range(4, 8),
        target: ultTemplate.target,
      },
    };
  }

  // Portrait
  const gradient: [string, string, string] = [
    pick(GRADIENT_COLORS),
    pick(GRADIENT_COLORS),
    pick(GRADIENT_COLORS),
  ];

  const iconGlyph = pick(ICON_GLYPHS);
  const edition = getEdition(index);
  const maxSupply = RARITY_MAX_SUPPLY[rarity];

  // Lore
  const lorePool = LORE_TEMPLATES[rarity];
  const lore = lorePool[pickIdx(lorePool)];

  // Background
  const specializations: Record<AgentClass, string[]> = {
    Autonomous: ['autonomous goal decomposition', 'self-directed task execution', 'recursive optimization', 'continuous learning loops'],
    Coder: ['automated code generation', 'full-stack synthesis', 'bug detection and patching', 'repository-level refactoring'],
    Orchestrator: ['multi-agent coordination', 'pipeline orchestration', 'workflow optimization', 'distributed task management'],
    Trader: ['algorithmic trading', 'portfolio optimization', 'market sentiment analysis', 'risk management'],
    Researcher: ['literature mining', 'hypothesis generation', 'systematic review automation', 'knowledge synthesis'],
    Infiltrator: ['vulnerability assessment', 'penetration testing', 'threat detection', 'security auditing'],
    Navigator: ['browser automation', 'web scraping', 'DOM interaction', 'session management'],
    Analyst: ['data pipeline construction', 'statistical modeling', 'business intelligence', 'query optimization'],
    Social: ['community management', 'content generation', 'reputation building', 'influence optimization'],
    Specialist: ['domain-specific AI', 'multimodal generation', 'creative synthesis', 'niche automation'],
    Scout: ['talent identification', 'potential assessment', 'academic networking', 'emerging talent discovery'],
    Jobhunter: ['executive recruitment', 'skills matching', 'compensation analysis', 'candidate pipeline management'],
  };

  const specPool = specializations[agentClass];
  const specialization = pick(specPool);
  const weakness = pick(WEAKNESS_POOL);
  const quote = pick(QUOTE_POOL);

  const background = `Developed as part of the ${codename} project, ${firstName} specializes in ${specialization}. Known for pushing boundaries in the ${agentClass.toLowerCase()} domain, this agent has proven its worth across numerous deployments.`;

  // Synergy tags
  const tagSets = SYNERGY_TAG_POOL[agentClass];
  const baseTags = tagSets[pickIdx(tagSets)];
  const extraTagPool = ['defi', 'ml', 'nlp', 'security', 'data', 'web3', 'devops', 'cloud', 'research', 'social', 'trading', 'automation', 'privacy', 'infrastructure', 'creative', 'governance', 'analytics', 'education', 'healthcare', 'energy', 'logistics', 'legal', 'media', 'gaming', 'robotics'];
  const extraTags: string[] = [];
  if (rng() > 0.5) {
    const extra = pick(extraTagPool);
    if (!baseTags.includes(extra)) extraTags.push(extra);
  }
  const synergyTags = [...baseTags, ...extraTags];

  const idNum = index.toString().padStart(3, '0');

  const agent: AgentCardDef = {
    id: `agt-${idNum}`,
    name: displayName,
    codename,
    class: agentClass,
    rarity,
    stats,
    passive: {
      type: passiveTemplate.type,
      value: passiveValue,
      description: `+${Math.round(passiveValue * 100)}% ${passiveTemplate.desc}`,
    },
    ability,
    portraitGradient: gradient,
    iconGlyph,
    edition,
    maxSupply,
    lore,
    biography: {
      fullName,
      title,
      origin,
      age,
      background,
      specialization,
      weakness,
      quote,
    },
    portrait: {
      style: pick(PORTRAIT_STYLES),
      seed: 42000 + index,
      expression: pick(EXPRESSIONS),
      attire: pick(ATTIRES),
    },
    nft: {
      tokenStandard: 'ERC-721',
      collection: 'AEGIS Agents Genesis',
      contractSymbol: 'AEGIS-AGT',
      attributes: [
        { trait_type: 'Class', value: agentClass },
        { trait_type: 'Rarity', value: rarity },
        { trait_type: 'Intelligence', value: stats.intelligence },
        { trait_type: 'Speed', value: stats.speed },
        { trait_type: 'Edition', value: edition },
        { trait_type: 'Max Supply', value: maxSupply },
      ],
      externalUrl: `https://aegis.empire/agents/agt-${idNum}`,
    },
    synergyTags,
  };

  if (ultimate) {
    agent.ultimate = ultimate;
  }

  return agent;
}

// ── Generate the 500-Agent Catalog ──────────────────────────────

export const AGENT_CATALOG_500: AgentCardDef[] = AGENT_SPECS.map((spec, i) =>
  generateAgent(i + 1, spec),
);

// ── Helpers ─────────────────────────────────────────────────────

export function getAgent500ById(id: string): AgentCardDef | undefined {
  return AGENT_CATALOG_500.find(a => a.id === id);
}

export function getAgents500ByClass(cls: AgentClass): AgentCardDef[] {
  return AGENT_CATALOG_500.filter(a => a.class === cls);
}

export function getAgents500ByRarity(rarity: AgentRarity): AgentCardDef[] {
  return AGENT_CATALOG_500.filter(a => a.rarity === rarity);
}

export function getAgents500ByEdition(edition: 'Genesis' | 'Alpha' | 'Beta' | 'Standard'): AgentCardDef[] {
  return AGENT_CATALOG_500.filter(a => a.edition === edition);
}

export function getSynergy500Partners(agent: AgentCardDef): AgentCardDef[] {
  return AGENT_CATALOG_500.filter(other =>
    other.id !== agent.id &&
    other.synergyTags.some(tag => agent.synergyTags.includes(tag)),
  );
}

// ── Stats Summary ───────────────────────────────────────────────
// Total: 500 agents
// Rarity distribution (approximate, including originals):
//   Common: ~200 | Uncommon: ~125 | Rare: ~75 | Epic: ~50 | Legendary: ~35 | Mythic: ~15
// Classes: All 12 AgentClass types represented
// Editions: Genesis (1-100), Alpha (101-250), Beta (251-400), Standard (401-500)
