import fs from 'fs';
const f = 'apps/empire/src/components/academy/ExchangeOS.jsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  "import { STOCKS, CRYPTO, FOREX, COMMODITIES, BONDS } from '../../data/instruments';",
  "import { STOCKS, CRYPTO, FOREX, COMMODITIES, BONDS, ALL_INSTRUMENTS } from '../../data/instruments';"
);

c = c.replace(
  `  const [selectedInst, setSelectedInst] = useState(STOCKS[0]);`,
  `  const [selectedInst, setSelectedInst] = useState(STOCKS[0]);
  const [marketSim, setMarketSim] = useState(null);

  useEffect(() => {
    const initialSim = {};
    ALL_INSTRUMENTS.forEach(inst => {
      const hist = [];
      let cur = inst.price * 0.98;
      for (let i=0; i<20; i++) {
        cur *= (1 + (Math.random() * 0.01 - 0.005));
        hist.push(cur);
      }
      hist[19] = inst.price;
      initialSim[inst.id] = { price: inst.price, change24h: inst.change24h || 0, history: hist };
    });
    setMarketSim(initialSim);

    const timer = setInterval(() => {
      setMarketSim(prev => {
        if (!prev) return prev;
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          const volatility = 0.003;
          const movement = 1 + (Math.random() * volatility * 2 - volatility);
          const newPrice = next[id].price * movement;
          const newHistory = [...next[id].history];
          newHistory.shift();
          newHistory.push(newPrice);
          next[id] = {
            price: newPrice,
            change24h: next[id].change24h + (movement > 1 ? 0.04 : -0.04),
            history: newHistory
          };
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);`
);

c = c.replace(
  `  const currentData = getTheme(activeTab);
  const changeIsPositive = (selectedInst?.change24h ?? 0) >= 0;
  const textChangeClass = changeIsPositive ? 'text-[#10b981]' : 'text-[#ef4444]';
  const bgChangeClass = changeIsPositive ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10';
  const changeColor = changeIsPositive ? '#10b981' : '#ef4444';
  const changeStr = (changeIsPositive ? '+' : '') + (selectedInst?.change24h ?? 0).toFixed(2) + '%';
  const displayPrice = activeTab === 'forex' ? (selectedInst?.price ?? 0).toFixed(4) : \`€\${(selectedInst?.price ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\`;`,
  `  const currentData = getTheme(activeTab);
  const simData = marketSim?.[selectedInst?.id] || { price: selectedInst?.price || 0, change24h: selectedInst?.change24h || 0, history: Array(20).fill(selectedInst?.price || 0) };
  
  const changeIsPositive = simData.change24h >= 0;
  const textChangeClass = changeIsPositive ? 'text-[#10b981]' : 'text-[#ef4444]';
  const bgChangeClass = changeIsPositive ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10';
  const changeColor = changeIsPositive ? '#10b981' : '#ef4444';
  const changeStr = (changeIsPositive ? '+' : '') + simData.change24h.toFixed(2) + '%';
  const displayPrice = activeTab === 'forex' ? simData.price.toFixed(4) : \`€\${simData.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\`;`
);

c = c.replace(
  `                    {activeList.slice(0, 8).map((inst, idx) => {
                       const isPos = inst.change24h >= 0;`,
  `                    {activeList.slice(0, 8).map((inst) => {
                       const localSim = marketSim?.[inst.id] || inst;
                       const isPos = localSim.change24h >= 0;`
);

c = c.replace(
  `                           <span className="text-white font-mono text-xs md:text-sm text-right">{activeTab === 'forex' ? inst.price.toFixed(4) : \`€\${inst.price.toLocaleString(undefined, {minimumFractionDigits: 2})}\`}</span>
                           <span className={\`\${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'} font-mono text-xs text-right hidden sm:block\`}>{(isPos ? '+' : '') + inst.change24h.toFixed(2)}%</span>`,
  `                           <span className="text-white font-mono text-xs md:text-sm text-right">{activeTab === 'forex' ? localSim.price.toFixed(4) : \`€\${localSim.price.toLocaleString(undefined, {minimumFractionDigits: 2})}\`}</span>
                           <span className={\`\${isPos ? 'text-[#10b981]' : 'text-[#ef4444]'} font-mono text-xs text-right hidden sm:block\`}>{(isPos ? '+' : '') + localSim.change24h.toFixed(2)}%</span>`
);

const svgStart = c.indexOf("                      {chartMode === 'candle' ? (");
const svgEnd = c.indexOf("                  </div>", svgStart);

if (svgStart > -1 && svgEnd > -1) {
  const replacementSvg = `                      {(() => {
                        const hist = simData.history;
                        const min = Math.min(...hist) * 0.999;
                        const max = Math.max(...hist) * 1.001;
                        const range = max - min || 1;
                        const points = hist.map((val, i) => \`\${(i / 19) * 100},\${20 - ((val - min) / range) * 20}\`);
                        const pathData = \`M \${points.join(' L ')}\`;
                        const areaData = \`M 0,20 L \${points.join(' L ')} L 100,20 Z\`;
                        const lastY = 20 - ((hist[19] - min) / range) * 20;

                        return chartMode === 'candle' ? (
                          <svg viewBox="0 0 100 20" className="absolute inset-0 w-full h-full opacity-90" preserveAspectRatio="none">
                             {hist.slice(1).map((val, i) => {
                               const prev = hist[i];
                               const up = val >= prev;
                               const x = (i / 18) * 98;
                               const yO = 20 - ((prev - min) / range) * 20;
                               const yC = 20 - ((val - min) / range) * 20;
                               const yH = Math.min(yO, yC) - Math.random() * 2;
                               const yL = Math.max(yO, yC) + Math.random() * 2;
                               const color = up ? '#10b981' : '#ef4444';
                               return (
                                 <g key={i}>
                                   <line x1={x+1} y1={yH} x2={x+1} y2={yL} stroke={color} strokeWidth="0.2"/>
                                   <rect x={x} y={Math.min(yO, yC)} width="2" height={Math.max(Math.abs(yO - yC), 0.5)} fill={color} />
                                 </g>
                               );
                             })}
                             <path d={\`M 0,\${lastY} L 100,-5\`} stroke="#f59e0b" strokeWidth="0.2" fill="none" opacity="0.3"/>
                             <circle cx="98" cy={lastY} r="0.8" fill="white" className="animate-pulse"></circle>
                             <rect x="88" y={lastY - 2} width="22" height="4" fill="#111827" stroke={currentData.chartStroke} strokeWidth="0.2" rx="0.5"></rect>
                             <text x="98" y={lastY - 0.5} fill="white" fontSize="1.5" textAnchor="end" className="font-mono">{displayPrice}</text>
                             <text x="98" y={lastY + 1} fill={currentData.changeColor} fontSize="1" textAnchor="end" className="font-mono">{changeStr}</text>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 100 20" className="absolute inset-0 w-full h-full opacity-80" preserveAspectRatio="none">
                             <defs>
                               <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                 <stop offset="0%" stopColor={currentData.chartStroke} stopOpacity="0.3"></stop>
                                 <stop offset="100%" stopColor={currentData.chartStroke} stopOpacity="0"></stop>
                               </linearGradient>
                             </defs>
                             <path d={areaData} fill="url(#chartGradient)"></path>
                             <path d={pathData} stroke={currentData.chartStroke} strokeWidth="0.4" fill="none" vectorEffect="non-scaling-stroke"></path>
                             <circle cx="98" cy={lastY} r="0.8" fill="white" className="animate-pulse"></circle>
                             <rect x="88" y={lastY - 2} width="22" height="4" fill="#111827" stroke={currentData.chartStroke} strokeWidth="0.2" rx="0.5"></rect>
                             <text x="98" y={lastY - 0.5} fill="white" fontSize="1.5" textAnchor="end" className="font-mono">{displayPrice}</text>
                             <text x="98" y={lastY + 1} fill={currentData.changeColor} fontSize="1" textAnchor="end" className="font-mono">{changeStr}</text>
                          </svg>
                        );
                      })()}`;
  c = c.substring(0, svgStart) + replacementSvg + "\n" + c.substring(svgEnd);
} else {
  console.log("SVG range not found");
}

fs.writeFileSync(f, c);
console.log("Patched successfully");
