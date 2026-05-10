import { useState, useEffect, useRef, useCallback } from "react";

// ── MOCK DATA ────────────────────────────────────────────────────────────
const NODES = [
  { id: 1, name: "Deutsche Finanz HQ", type: "finance", owner: "player", lat: 52.52, lon: 13.405, level: 3, income: 42000, status: "operational" },
  { id: 2, name: "The Brass Tap", type: "venue", owner: "player", lat: 48.86, lon: 2.35, level: 2, income: 8500, status: "operational" },
  { id: 3, name: "Nordic R&D Lab", type: "tech", owner: "player", lat: 59.33, lon: 18.07, level: 1, income: 15200, status: "building", endsIn: "2d 14h" },
  { id: 4, name: "Gulf Oil Platform", type: "oil_gas", owner: "player", lat: 25.3, lon: 55.3, level: 4, income: 128000, status: "operational" },
  { id: 5, name: "Shanghai Logistics Hub", type: "manufacturing", owner: "player", lat: 31.23, lon: 121.47, level: 2, income: 34000, status: "operational" },
  { id: 6, name: "Zurich Pharma Campus", type: "pharma", owner: "market", lat: 47.37, lon: 8.54, capex: 2400000, opex: 85000 },
  { id: 7, name: "Lagos Energy Grid", type: "energy", owner: "market", lat: 6.45, lon: 3.4, capex: 890000, opex: 32000 },
  { id: 8, name: "São Paulo Tower", type: "venue", owner: "market", lat: -23.55, lon: -46.63, capex: 450000, opex: 18000 },
  { id: 9, name: "Mumbai Tech Park", type: "tech", owner: "market", lat: 19.08, lon: 72.88, capex: 1800000, opex: 62000 },
  { id: 10, name: "Cairo Trade Center", type: "finance", owner: "rival", lat: 30.04, lon: 31.24, level: 3, income: 52000 },
  { id: 11, name: "Rival Refinery", type: "oil_gas", owner: "rival", lat: 55.75, lon: 37.62, level: 5, income: 210000 },
  { id: 12, name: "Singapore Port", type: "manufacturing", owner: "player", lat: 1.35, lon: 103.82, level: 3, income: 67000, status: "operational" },
];

const TRADE_ROUTES = [
  { from: [55.3, 25.3], to: [103.82, 1.35], type: "sea", active: true },
  { from: [13.405, 52.52], to: [2.35, 48.86], type: "rail", active: true },
  { from: [121.47, 31.23], to: [103.82, 1.35], type: "air", active: true },
  { from: [18.07, 59.33], to: [13.405, 52.52], type: "truck", active: true },
];

const DEPT_PROJECTS = [
  { id: "hr1", dept: "HR", name: "Recruitment Drive", cost: 15000, focus: 2, success: 85, effect: "+2 staff capacity, +3 Growth", icon: "U" },
  { id: "hr2", dept: "HR", name: "Employee Training", cost: 8000, focus: 1, success: 92, effect: "+10% dept efficiency", icon: "G" },
  { id: "tf1", dept: "Trading", name: "Algorithm Backtest", cost: 25000, focus: 3, success: 70, effect: "+15% trading income", icon: "C" },
  { id: "tf2", dept: "Trading", name: "Market Analysis", cost: 12000, focus: 1, success: 88, effect: "Reveal 2 undervalued nodes", icon: "S" },
  { id: "mk1", dept: "Marketing", name: "Brand Campaign", cost: 35000, focus: 2, success: 78, effect: "+20% regional sentiment", icon: "B" },
  { id: "mk2", dept: "Marketing", name: "Influencer Partnership", cost: 18000, focus: 1, success: 82, effect: "+500 followers", icon: "I" },
  { id: "rd1", dept: "R&D", name: "Product Innovation", cost: 50000, focus: 4, success: 55, effect: "+25% throughput, +5 Growth", icon: "P" },
  { id: "rd2", dept: "R&D", name: "Patent Filing", cost: 20000, focus: 2, success: 65, effect: "IP protection +1 product", icon: "F" },
  { id: "fn1", dept: "Finance", name: "Tax Optimisation", cost: 30000, focus: 2, success: 75, effect: "-3% effective tax rate", icon: "T" },
  { id: "fn2", dept: "Finance", name: "IPO Readiness", cost: 100000, focus: 5, success: 45, effect: "Unlock Public Company path", icon: "R" },
  { id: "fn3", dept: "Finance", name: "Quarterly Audit", cost: 10000, focus: 1, success: 95, effect: "+5 Governance", icon: "A" },
  { id: "lg1", dept: "Legal", name: "Compliance Review", cost: 15000, focus: 1, success: 90, effect: "-15% crime detection", icon: "L" },
  { id: "lg2", dept: "Legal", name: "Government Relations", cost: 40000, focus: 3, success: 60, effect: "+8 Power axis", icon: "G" },
];

const CARDS = [
  { name: "Elena Voss", role: "Supply Chain Manager", tier: "Gold", multiplier: 1.35, stat: "+35% logistics throughput" },
  { name: "James Chen", role: "Quantitative Analyst", tier: "Diamond", multiplier: 1.55, stat: "+55% trading algorithm yield" },
  { name: "Amara Osei", role: "Security Specialist", tier: "Silver", multiplier: 1.15, stat: "-15% crime detection rate" },
];

const TICKER_EVENTS = [
  { text: "EUR/USD 1.0842 +0.12%", type: "fx" },
  { text: "BTC $67,421 -1.8%", type: "crypto" },
  { text: "CRUDE $78.42/bbl +2.1%", type: "commodity" },
  { text: "INTEL: Nordic R&D Lab construction 68% complete", type: "intel" },
  { text: "AI DIRECTOR: Trade blockade forming in Strait of Hormuz", type: "alert" },
  { text: "CRIME: Heat level stable at 23/100", type: "crime" },
  { text: "BOARD: Q2 vote in 14 days — CEO approval at 72%", type: "board" },
  { text: "ETH $3,891 +0.4%", type: "crypto" },
  { text: "SENTINEL: Investment memo ready for Zurich Pharma", type: "intel" },
  { text: "MACRO: ECB rate decision tomorrow — volatility expected", type: "alert" },
  { text: "GBP/EUR 0.8621 -0.05%", type: "fx" },
  { text: "RIVAL: Moscow Cartel acquired Lagos infrastructure", type: "alert" },
];

const CRIMES = [
  { name: "Tax Evasion", detection: 15, penalty: "2x", axisHit: "Gov -15", heat: "+12" },
  { name: "Insider Trading", detection: 8, penalty: "3x", axisHit: "Gov -20", heat: "+18" },
  { name: "Money Laundering", detection: 3, penalty: "5x", axisHit: "Gov -30", heat: "+25" },
  { name: "Bribery", detection: 6, penalty: "2.5x", axisHit: "Gov -10, Power +5", heat: "+15" },
];

const BANKS = [
  { name: "Deutsche Finanz", audit: "1.0x", desc: "Standard audit. No modifier." },
  { name: "Banque Suisse", audit: "0.7x", desc: "Reduced detection. 2x penalty." },
  { name: "Banco Cayman", audit: "0.4x", desc: "Minimal detection. 3x penalty if caught." },
];

// ── UTILITY ─────────────────────────────────────────────────────────
const fmt = (n) => n >= 1e6 ? `€${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `€${(n/1e3).toFixed(0)}K` : `€${n}`;

const SECTOR_COLORS = {
  finance: "#00e5ff", tech: "#7c3aed", oil_gas: "#f59e0b", manufacturing: "#6366f1",
  energy: "#10b981", pharma: "#ec4899", venue: "#a78bfa",
};
const OWNER_GLOW = { player: "#10b981", market: "#ef4444", rival: "#f59e0b" };
const TIER_COLORS = { Bronze: "#cd7f32", Silver: "#c0c0c0", Gold: "#ffd700", Diamond: "#b9f2ff" };

// ── COMPONENTS ──────────────────────────────────────────────────────

function GlowDot({ x, y, color, size = 8, pulse = false, onClick, label }) {
  return (
    <g onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <circle cx={x} cy={y} r={size * 2.5} fill={color} opacity={0.08} />
      <circle cx={x} cy={y} r={size * 1.6} fill={color} opacity={0.15} />
      <circle cx={x} cy={y} r={size} fill={color} opacity={0.9} stroke={color} strokeWidth={1} />
      {pulse && (
        <circle cx={x} cy={y} r={size} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6}>
          <animate attributeName="r" from={size} to={size * 3} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {label && <text x={x} y={y - size - 6} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">{label}</text>}
    </g>
  );
}

function ArcRoute({ x1, y1, x2, y2, color, dashed }) {
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - 30 - Math.abs(x2 - x1) * 0.08;
  return (
    <path
      d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
      fill="none" stroke={color} strokeWidth={1.2} opacity={0.5}
      strokeDasharray={dashed ? "6,4" : "none"}
    >
      <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
    </path>
  );
}

function MapView({ nodes, routes, showRoutes, onNodeClick, selectedNode }) {
  const toX = (lon) => ((lon + 180) / 360) * 900 + 50;
  const toY = (lat) => ((90 - lat) / 180) * 450 + 25;
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 500" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="bg-grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0f1729" />
          <stop offset="100%" stopColor="#060a12" />
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="2" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="1000" height="500" fill="url(#bg-grad)" />
      {/* Grid lines */}
      {[...Array(19)].map((_, i) => <line key={`h${i}`} x1={50} y1={25 + i * 25} x2={950} y2={25 + i * 25} stroke="#1e293b" strokeWidth={0.3} opacity={0.4} />)}
      {[...Array(37)].map((_, i) => <line key={`v${i}`} x1={50 + i * 25} y1={25} x2={50 + i * 25} y2={475} stroke="#1e293b" strokeWidth={0.3} opacity={0.4} />)}
      {/* Simplified continent outlines */}
      <text x={180} y={180} fill="#1e293b" fontSize="40" fontFamily="monospace" opacity={0.15}>EUROPE</text>
      <text x={630} y={220} fill="#1e293b" fontSize="40" fontFamily="monospace" opacity={0.15}>ASIA</text>
      <text x={230} y={300} fill="#1e293b" fontSize="40" fontFamily="monospace" opacity={0.15}>AFRICA</text>
      <text x={90} y={380} fill="#1e293b" fontSize="25" fontFamily="monospace" opacity={0.12}>S. AMERICA</text>
      {/* Trade routes */}
      {showRoutes && routes.map((r, i) => {
        const colors = { sea: "#0ea5e9", rail: "#a78bfa", air: "#f472b6", truck: "#fbbf24" };
        return <ArcRoute key={i} x1={toX(r.from[0])} y1={toY(r.from[1])} x2={toX(r.to[0])} y2={toY(r.to[1])} color={colors[r.type]} dashed={r.type === "truck"} />;
      })}
      {/* Nodes */}
      <g filter="url(#glow)">
        {nodes.map(n => (
          <GlowDot
            key={n.id} x={toX(n.lon)} y={toY(n.lat)}
            color={OWNER_GLOW[n.owner]}
            size={n.owner === "player" ? (n.level || 1) * 2.5 + 4 : 5}
            pulse={n.status === "building" || (selectedNode?.id === n.id)}
            onClick={() => onNodeClick(n)}
            label={n.owner === "player" ? n.name.split(" ").slice(-1)[0] : ""}
          />
        ))}
      </g>
      {/* Legend */}
      <g transform="translate(60, 430)">
        <circle cx={0} cy={0} r={4} fill="#10b981" /><text x={10} y={3} fill="#64748b" fontSize="8" fontFamily="monospace">OWNED</text>
        <circle cx={70} cy={0} r={4} fill="#ef4444" /><text x={80} y={3} fill="#64748b" fontSize="8" fontFamily="monospace">MARKET</text>
        <circle cx={145} cy={0} r={4} fill="#f59e0b" /><text x={155} y={3} fill="#64748b" fontSize="8" fontFamily="monospace">RIVAL</text>
      </g>
    </svg>
  );
}

function Ticker({ events }) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 32, background: "rgba(6,10,18,0.95)", borderTop: "1px solid #1e293b", overflow: "hidden", zIndex: 30, display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 40, animation: "scroll 60s linear infinite", whiteSpace: "nowrap", paddingLeft: "100%" }}>
        {[...events, ...events].map((e, i) => {
          const colors = { fx: "#00e5ff", crypto: "#7c3aed", commodity: "#f59e0b", intel: "#10b981", alert: "#ef4444", crime: "#f59e0b", board: "#a78bfa" };
          return <span key={i} style={{ fontFamily: "monospace", fontSize: 10, color: colors[e.type] || "#64748b", letterSpacing: "0.05em" }}>{e.text}</span>;
        })}
      </div>
      <style>{`@keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

function AxisBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>
        <span>{label}</span><span style={{ color }}>{value}/100</span>
      </div>
      <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 0.6s" }} />
      </div>
    </div>
  );
}

function WalletCard({ label, balance, sub }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 6, padding: "8px 12px", flex: 1 }}>
      <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 18, color: "#e2e8f0", fontWeight: 700 }}>{balance}</div>
      {sub && <div style={{ fontFamily: "monospace", fontSize: 8, color: "#10b981" }}>{sub}</div>}
    </div>
  );
}

function DeptCard({ project, onClick }) {
  const deptColors = { HR: "#10b981", Trading: "#00e5ff", Marketing: "#f472b6", "R&D": "#7c3aed", Finance: "#f59e0b", Legal: "#6366f1" };
  const c = deptColors[project.dept] || "#64748b";
  return (
    <div onClick={onClick} style={{ background: "#111827", border: `1px solid ${c}33`, borderRadius: 8, padding: 12, cursor: "pointer", transition: "all 0.2s", minWidth: 200 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = c; e.currentTarget.style.boxShadow = `0 0 20px ${c}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = `${c}33`; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: c, textTransform: "uppercase", letterSpacing: "0.15em", background: `${c}15`, padding: "2px 6px", borderRadius: 3 }}>{project.dept}</span>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b" }}>{project.success}% success</span>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>{project.name}</div>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: "#94a3b8", marginBottom: 8 }}>{project.effect}</div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #1e293b", paddingTop: 6 }}>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#f59e0b" }}>{fmt(project.cost)}</span>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b" }}>{project.focus} focus sessions</span>
      </div>
    </div>
  );
}

function NodeDetail({ node, onClose }) {
  if (!node) return null;
  const isOwned = node.owner === "player";
  const isMarket = node.owner === "market";
  const c = SECTOR_COLORS[node.type] || "#64748b";
  return (
    <div style={{ position: "absolute", right: 0, top: 0, bottom: 32, width: 320, background: "rgba(10,14,23,0.97)", borderLeft: "1px solid #1e293b", zIndex: 25, padding: 16, overflowY: "auto", backdropFilter: "blur(12px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontFamily: "monospace", fontSize: 8, color: c, textTransform: "uppercase", letterSpacing: "0.15em", background: `${c}15`, padding: "3px 8px", borderRadius: 3 }}>{node.type.replace("_", " & ")}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}>x</button>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 16, color: "#e2e8f0", fontWeight: 700, marginBottom: 4 }}>{node.name}</div>
      <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", marginBottom: 16 }}>
        {node.lat.toFixed(2)}N, {node.lon.toFixed(2)}E
      </div>

      {isOwned && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#111827", borderRadius: 6, padding: 8, textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 2 }}>LEVEL</div>
              <div style={{ fontFamily: "monospace", fontSize: 20, color: c, fontWeight: 700 }}>{node.level}/5</div>
            </div>
            <div style={{ background: "#111827", borderRadius: 6, padding: 8, textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 2 }}>INCOME/MO</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, color: "#10b981", fontWeight: 700 }}>{fmt(node.income)}</div>
            </div>
          </div>
          {node.status === "building" && (
            <div style={{ background: "#f59e0b15", border: "1px solid #f59e0b33", borderRadius: 6, padding: 8, marginBottom: 12 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#f59e0b", marginBottom: 4 }}>UNDER CONSTRUCTION</div>
              <div style={{ height: 4, background: "#1e293b", borderRadius: 2 }}>
                <div style={{ height: "100%", width: "68%", background: "#f59e0b", borderRadius: 2 }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3))", borderRadius: 2, animation: "shimmer 1.5s infinite" }} />
                </div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#f59e0b", marginTop: 4 }}>Completes in {node.endsIn}</div>
            </div>
          )}
          {/* Card Slots */}
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Card Roster</div>
          {CARDS.map((card, i) => (
            <div key={i} style={{ background: "#111827", border: `1px solid ${TIER_COLORS[card.tier]}33`, borderRadius: 6, padding: 8, marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 4, background: `${TIER_COLORS[card.tier]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 14, color: TIER_COLORS[card.tier], fontWeight: 700, border: `1px solid ${TIER_COLORS[card.tier]}44` }}>
                {card.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#e2e8f0", fontWeight: 600 }}>{card.name}</div>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: TIER_COLORS[card.tier] }}>{card.tier} {card.role}</div>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: "#10b981" }}>{card.stat}</div>
              </div>
            </div>
          ))}
          <button style={{ width: "100%", padding: "8px 0", background: `${c}20`, border: `1px solid ${c}55`, borderRadius: 6, color: c, fontFamily: "monospace", fontSize: 10, cursor: "pointer", marginTop: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Upgrade to Level {node.level + 1}
          </button>
        </>
      )}

      {isMarket && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "#111827", borderRadius: 6, padding: 8, textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 2 }}>CAPEX</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, color: "#ef4444", fontWeight: 700 }}>{fmt(node.capex)}</div>
            </div>
            <div style={{ background: "#111827", borderRadius: 6, padding: 8, textAlign: "center" }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 2 }}>OPEX/MO</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, color: "#f59e0b", fontWeight: 700 }}>{fmt(node.opex)}</div>
            </div>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Acquisition Method</div>
          <button style={{ width: "100%", padding: "10px 0", background: "#10b98120", border: "1px solid #10b98155", borderRadius: 6, color: "#10b981", fontFamily: "monospace", fontSize: 10, cursor: "pointer", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            BUILD IT — {fmt(node.capex * 0.6)} + 14 days
          </button>
          <button style={{ width: "100%", padding: "10px 0", background: "#ef444420", border: "1px solid #ef444455", borderRadius: 6, color: "#ef4444", fontFamily: "monospace", fontSize: 10, cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            BUY IT (ACQUISITION) — {fmt(node.capex)} instant
          </button>
        </>
      )}

      {node.owner === "rival" && (
        <div style={{ marginTop: 8 }}>
          <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b22", borderRadius: 6, padding: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#f59e0b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Rival Intelligence</div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b" }}>Data encrypted. Requires Shadow Operations Level 3 to decrypt.</div>
            <div style={{ fontFamily: "monospace", fontSize: 20, color: "#f59e0b33", marginTop: 8, letterSpacing: "0.3em" }}>REDACTED</div>
          </div>
          <button style={{ width: "100%", padding: "10px 0", background: "#ef444415", border: "1px solid #ef444440", borderRadius: 6, color: "#ef4444", fontFamily: "monospace", fontSize: 10, cursor: "pointer", marginTop: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Initiate M&A Cyber-Strike
          </button>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────────────
export default function AegisEmpireMVP() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedNode, setSelectedNode] = useState(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [showDefcon, setShowDefcon] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [mavenOpen, setMavenOpen] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packRevealed, setPackRevealed] = useState(false);
  const [cmdInput, setCmdInput] = useState("");

  const gameState = {
    personal: 47200, company: 312500, netWorth: 1842000,
    growth: 45, governance: 38, impact: 22, power: 15,
    structure: "Privately Held (LLC)", tax: "15%", heat: 23,
    followers: 2847, ceoApproval: 72,
  };

  const CMD_ITEMS = [
    { label: "Buy Infrastructure", desc: "Browse available nodes on the market", key: "market" },
    { label: "Run Department Project", desc: "Execute a project from your departments", key: "dept" },
    { label: "Open Pack", desc: "Pull manager and specialist cards", key: "pack" },
    { label: "View Trade Routes", desc: "Toggle logistics overlay on map", key: "routes" },
    { label: "Tax Routing Setup", desc: "Configure capital flow through shell nodes", key: "tax" },
    { label: "Execute Crime", desc: "Access DEFCON warfare panel", key: "crime" },
    { label: "Deploy Sentinel Agent", desc: "Generate investment memo (costs Q-Coins)", key: "sentinel" },
    { label: "Change Corporate Structure", desc: "Upgrade to Partnership, LLC, or Public", key: "structure" },
    { label: "Activate Maven AI", desc: "Enable autonomous empire management", key: "maven" },
    { label: "Scan for Opportunities", desc: "Intelligence scan for undervalued nodes", key: "scan" },
  ];
  const filtered = CMD_ITEMS.filter(c => c.label.toLowerCase().includes(cmdInput.toLowerCase()) || c.desc.toLowerCase().includes(cmdInput.toLowerCase()));

  const handleCmd = (key) => {
    setTerminalOpen(false);
    setCmdInput("");
    if (key === "routes") setShowRoutes(r => !r);
    if (key === "crime") setShowDefcon(true);
    if (key === "dept") setActiveTab("departments");
    if (key === "market") setActiveTab("marketplace");
    if (key === "maven") setMavenOpen(true);
    if (key === "pack") { setPackOpen(true); setPackRevealed(false); }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setTerminalOpen(t => !t); }
      if (e.key === "Escape") { setTerminalOpen(false); setSelectedNode(null); setShowDefcon(false); setMavenOpen(false); setPackOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const TABS = [
    { key: "overview", label: "OVERVIEW" },
    { key: "departments", label: "DEPARTMENTS" },
    { key: "marketplace", label: "MARKET" },
    { key: "crime", label: "DEFCON" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#060a12", fontFamily: "'Inter', -apple-system, sans-serif", overflow: "hidden" }}>
      {/* Map */}
      <MapView nodes={NODES} routes={TRADE_ROUTES} showRoutes={showRoutes} onNodeClick={setSelectedNode} selectedNode={selectedNode} />

      {/* Top Bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40, background: "rgba(6,10,18,0.9)", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 30, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 13, color: "#00e5ff", fontWeight: 700, letterSpacing: "0.15em" }}>AEGIS</span>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b" }}>|</span>
          <span style={{ fontFamily: "monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.05em" }}>EMPIRE COMMAND</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "CORPORATE", active: true, color: "#10b981" },
              { label: "ROUTES", active: showRoutes, color: "#0ea5e9", onClick: () => setShowRoutes(r => !r) },
              { label: "THREATS", active: false, color: "#ef4444" },
              { label: "SENTIMENT", active: false, color: "#a78bfa" },
              { label: "ESG", active: false, color: "#10b981" },
            ].map(t => (
              <button key={t.label} onClick={t.onClick} style={{
                padding: "2px 8px", fontFamily: "monospace", fontSize: 8, border: `1px solid ${t.active ? t.color : "#1e293b"}`,
                background: t.active ? `${t.color}20` : "transparent", color: t.active ? t.color : "#475569",
                borderRadius: 3, cursor: "pointer", letterSpacing: "0.1em"
              }}>{t.label}</button>
            ))}
          </div>
          <button onClick={() => setTerminalOpen(true)} style={{
            padding: "3px 12px", fontFamily: "monospace", fontSize: 9, border: "1px solid #1e293b",
            background: "#111827", color: "#64748b", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
          }}>
            <span style={{ color: "#00e5ff" }}>&#9654;</span> COMMAND <span style={{ color: "#475569", fontSize: 8 }}>Ctrl+K</span>
          </button>
        </div>
      </div>

      {/* Left Rail */}
      {leftOpen && (
        <div style={{ position: "absolute", left: 0, top: 40, bottom: 32, width: 320, background: "rgba(10,14,23,0.97)", borderRight: "1px solid #1e293b", zIndex: 20, display: "flex", flexDirection: "column", backdropFilter: "blur(12px)" }}>
          {/* Wallets */}
          <div style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <WalletCard label="Personal" balance={fmt(gameState.personal)} />
              <WalletCard label="Company" balance={fmt(gameState.company)} sub={`+${fmt(294700)}/mo`} />
            </div>
            <div style={{ marginTop: 8, background: "#111827", borderRadius: 6, padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b" }}>NET WORTH</span>
              <span style={{ fontFamily: "monospace", fontSize: 14, color: "#e2e8f0", fontWeight: 700 }}>{fmt(gameState.netWorth)}</span>
            </div>
          </div>

          {/* Structure + Axes */}
          <div style={{ padding: 12, borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 9, color: "#7c3aed", background: "#7c3aed15", padding: "2px 6px", borderRadius: 3 }}>{gameState.structure}</span>
              <span style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b" }}>Tax: {gameState.tax}</span>
            </div>
            <AxisBar label="GROWTH" value={gameState.growth} color="#00e5ff" />
            <AxisBar label="GOVERNANCE" value={gameState.governance} color="#10b981" />
            <AxisBar label="IMPACT" value={gameState.impact} color="#a78bfa" />
            <AxisBar label="POWER" value={gameState.power} color="#f59e0b" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b" }}>
                HEAT: <span style={{ color: gameState.heat > 50 ? "#ef4444" : "#f59e0b" }}>{gameState.heat}/100</span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b" }}>
                FOLLOWERS: <span style={{ color: "#00e5ff" }}>{gameState.followers.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1e293b" }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, padding: "8px 0", fontFamily: "monospace", fontSize: 8, letterSpacing: "0.1em",
                color: activeTab === t.key ? "#00e5ff" : "#475569", background: "transparent",
                border: "none", borderBottom: activeTab === t.key ? "2px solid #00e5ff" : "2px solid transparent",
                cursor: "pointer"
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {activeTab === "overview" && (
              <>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Owned Assets ({NODES.filter(n => n.owner === "player").length})</div>
                {NODES.filter(n => n.owner === "player").map(n => (
                  <div key={n.id} onClick={() => setSelectedNode(n)} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 6, padding: 8, marginBottom: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = SECTOR_COLORS[n.type]}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}
                  >
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#e2e8f0" }}>{n.name}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 8, color: SECTOR_COLORS[n.type] }}>{n.type.replace("_", " & ")} L{n.level}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {n.status === "building" ? (
                        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#f59e0b" }}>BUILDING</span>
                      ) : (
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#10b981" }}>{fmt(n.income)}/mo</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === "departments" && (
              <>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Department Projects (EA FC Matrix)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {DEPT_PROJECTS.map(p => <DeptCard key={p.id} project={p} onClick={() => {}} />)}
                </div>
              </>
            )}

            {activeTab === "marketplace" && (
              <>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Available Infrastructure</div>
                {NODES.filter(n => n.owner === "market").map(n => (
                  <div key={n.id} onClick={() => setSelectedNode(n)} style={{ background: "#111827", border: "1px solid #ef444433", borderRadius: 6, padding: 10, marginBottom: 8, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#ef444433"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>{n.name}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 8, color: SECTOR_COLORS[n.type], background: `${SECTOR_COLORS[n.type]}15`, padding: "2px 6px", borderRadius: 3 }}>{n.type.replace("_", " & ")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#ef4444" }}>CAPEX: {fmt(n.capex)}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#f59e0b" }}>OPEX: {fmt(n.opex)}/mo</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === "crime" && (
              <>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#ef4444", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>DEFCON Warfare Panel</div>
                <div style={{ background: "#111827", borderRadius: 6, padding: 8, marginBottom: 12, textAlign: "center" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 4 }}>HEAT LEVEL</div>
                  <div style={{ fontFamily: "monospace", fontSize: 28, color: gameState.heat > 50 ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>{gameState.heat}</div>
                  <div style={{ height: 6, background: "#1e293b", borderRadius: 3, marginTop: 4 }}>
                    <div style={{ height: "100%", width: `${gameState.heat}%`, background: `linear-gradient(90deg, #10b981, #f59e0b, #ef4444)`, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 6 }}>ACTIVE BANK</div>
                {BANKS.map(b => (
                  <div key={b.name} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 6, padding: 8, marginBottom: 6 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "#e2e8f0" }}>{b.name} <span style={{ color: "#f59e0b" }}>({b.audit} audit)</span></div>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b" }}>{b.desc}</div>
                  </div>
                ))}
                <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginBottom: 6, marginTop: 12 }}>AVAILABLE OPERATIONS</div>
                {CRIMES.map(c => (
                  <div key={c.name} style={{ background: "#11182790", border: "1px solid #ef444422", borderRadius: 6, padding: 8, marginBottom: 6, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "#ef444422"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "#ef4444", fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 8, color: "#f59e0b" }}>+{c.heat} heat</span>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#64748b", marginTop: 2 }}>Detection: {c.detection}% | Penalty: {c.penalty} | {c.axisHit}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Node Detail Panel (Right) */}
      <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />

      {/* Command Terminal (cmdk-style) */}
      {terminalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120, backdropFilter: "blur(4px)" }}
          onClick={() => setTerminalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, background: "#0f1729", border: "1px solid #1e293b", borderRadius: 12, boxShadow: "0 25px 60px rgba(0,0,0,0.6)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#00e5ff", fontSize: 14 }}>&#9654;</span>
              <input
                autoFocus value={cmdInput} onChange={e => setCmdInput(e.target.value)}
                placeholder="Type a command..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e8f0", fontFamily: "monospace", fontSize: 13 }}
              />
              <span style={{ fontFamily: "monospace", fontSize: 8, color: "#475569", border: "1px solid #1e293b", padding: "2px 6px", borderRadius: 3 }}>ESC</span>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {filtered.map(c => (
                <div key={c.key} onClick={() => handleCmd(c.key)}
                  style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #1e293b10", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#00e5ff08"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0" }}>{c.label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Maven AI Panel */}
      {mavenOpen && (
        <div style={{ position: "absolute", top: 40, right: selectedNode ? 320 : 0, bottom: 32, width: 380, background: "rgba(10,14,23,0.98)", borderLeft: "1px solid #7c3aed33", zIndex: 25, display: "flex", flexDirection: "column", backdropFilter: "blur(12px)" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 12px #7c3aed" }} />
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#7c3aed", fontWeight: 700, letterSpacing: "0.15em" }}>MAVEN AI</span>
              <span style={{ fontFamily: "monospace", fontSize: 8, color: "#10b981", background: "#10b98115", padding: "1px 6px", borderRadius: 10 }}>ACTIVE</span>
            </div>
            <button onClick={() => setMavenOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14 }}>x</button>
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
            <div style={{ background: "#7c3aed10", border: "1px solid #7c3aed22", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#7c3aed", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.15em" }}>Autonomous Recommendation</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", lineHeight: 1.6 }}>
                Priority acquisition detected: <span style={{ color: "#ef4444" }}>Zurich Pharma Campus</span> is undervalued by 23% relative to sector median. Current CAPEX of €2.4M will generate estimated €180K/month at L3 with your existing card roster. ROI breakeven: 13.3 months.
              </div>
            </div>
            <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b22", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#f59e0b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.15em" }}>Storm Warning</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", lineHeight: 1.6 }}>
                Macro signal: ECB rate decision in 24h. Historical correlation shows 73% probability of EUR-denominated asset repricing. Recommend hedging Gulf Oil Platform exposure via Banque Suisse forex desk.
              </div>
            </div>
            <div style={{ background: "#10b98110", border: "1px solid #10b98122", borderRadius: 8, padding: 12 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: "#10b981", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.15em" }}>Route Optimization</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", lineHeight: 1.6 }}>
                Redirecting Shanghai → Singapore route via air freight saves 4.2 days transit time at +€12K/month OPEX. Net throughput increase: +18%. Recommend approval.
              </div>
            </div>
            <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 8, color: "#64748b", textAlign: "center" }}>MAVEN RETAINER: €500K/MONTH FROM SANDBOX BALANCE</div>
          </div>
        </div>
      )}

      {/* Pack Opening Overlay */}
      {packOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
          onClick={() => setPackOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ textAlign: "center" }}>
            {!packRevealed ? (
              <div>
                <div style={{ width: 200, height: 280, background: "linear-gradient(135deg, #1a1a2e, #16213e)", border: "2px solid #ffd70066", borderRadius: 12, margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 40px rgba(255,215,0,0.15)", transition: "all 0.3s" }}
                  onClick={() => setPackRevealed(true)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(255,215,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(255,215,0,0.15)"; }}
                >
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 24, color: "#ffd700", fontWeight: 700, letterSpacing: "0.1em" }}>Q</div>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#ffd70088", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.2em" }}>Quantico Pack</div>
                    <div style={{ fontFamily: "monospace", fontSize: 7, color: "#64748b", marginTop: 8 }}>TAP TO REVEAL</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { name: "Marcus Webb", role: "Operations Director", tier: "Gold", stat: "+30% venue throughput" },
                  { name: "Yuki Tanaka", role: "Risk Analyst", tier: "Silver", stat: "-12% audit detection" },
                  { name: "Fatima Al-Rashid", role: "Logistics Expert", tier: "Diamond", stat: "+45% route efficiency" },
                ].map((card, i) => (
                  <div key={i} style={{
                    width: 160, height: 220, background: "linear-gradient(135deg, #111827, #1a2236)", border: `2px solid ${TIER_COLORS[card.tier]}66`,
                    borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 30px ${TIER_COLORS[card.tier]}22`,
                    animation: `fadeIn 0.5s ease ${i * 0.15}s both`
                  }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${TIER_COLORS[card.tier]}20`, border: `2px solid ${TIER_COLORS[card.tier]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 20, color: TIER_COLORS[card.tier], fontWeight: 700, marginBottom: 8 }}>
                      {card.name[0]}
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: TIER_COLORS[card.tier], textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>{card.tier}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", fontWeight: 600, textAlign: "center", marginBottom: 2 }}>{card.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#94a3b8", marginBottom: 8 }}>{card.role}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#10b981", background: "#10b98115", padding: "2px 8px", borderRadius: 10 }}>{card.stat}</div>
                  </div>
                ))}
              </div>
            )}
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
          </div>
        </div>
      )}

      {/* HUD Buttons */}
      <div style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 8 }}>
        {[
          { label: "MAVEN AI", color: "#7c3aed", onClick: () => setMavenOpen(m => !m) },
          { label: "OPEN PACK", color: "#ffd700", onClick: () => { setPackOpen(true); setPackRevealed(false); } },
          { label: "INTEL HUB", color: "#f59e0b", onClick: () => {} },
        ].map(b => (
          <button key={b.label} onClick={b.onClick} style={{
            padding: "5px 16px", fontFamily: "monospace", fontSize: 9, border: `1px solid ${b.color}44`,
            background: `${b.color}10`, color: `${b.color}aa`, borderRadius: 20, cursor: "pointer",
            letterSpacing: "0.1em", transition: "all 0.2s", backdropFilter: "blur(8px)"
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.color = b.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${b.color}44`; e.currentTarget.style.color = `${b.color}aa`; }}
          >{b.label}</button>
        ))}
      </div>

      {/* Ticker */}
      <Ticker events={TICKER_EVENTS} />

      {/* Left rail toggle */}
      <button onClick={() => setLeftOpen(l => !l)} style={{
        position: "absolute", left: leftOpen ? 320 : 0, top: "50%", transform: "translateY(-50%)",
        zIndex: 25, width: 20, height: 40, background: "#0f1729", border: "1px solid #1e293b",
        borderLeft: leftOpen ? "none" : "1px solid #1e293b", borderRadius: leftOpen ? "0 4px 4px 0" : "4px",
        color: "#64748b", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center"
      }}>{leftOpen ? "<" : ">"}</button>
    </div>
  );
}
