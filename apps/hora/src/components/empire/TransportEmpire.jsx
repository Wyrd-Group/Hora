import React, { useState, useMemo, useCallback } from 'react';
import { useEmpireStore } from '../../store/empireStore';
import AdCardInline from '../ads/AdCardInline';

const TRANSPORT_TYPES = [
  { key: 'airline', label: 'AIRLINE', icon: '✈️', color: '#10b981', nodeType: 'airport', foundCost: 500_000, desc: 'Operate passenger & cargo flights between airports.' },
  { key: 'shipping', label: 'SHIPPING LINE', icon: '🚢', color: '#0ea5e9', nodeType: 'port', foundCost: 350_000, desc: 'Run container ships and tankers between ports.' },
  { key: 'rail', label: 'RAIL COMPANY', icon: '🚂', color: '#a78bfa', nodeType: null, foundCost: 250_000, desc: 'Operate freight and passenger trains on land corridors.' },
];

export default function TransportEmpire() {
  const companyBalance = useEmpireStore(s => s.companyBalance);
  const nodes = useEmpireStore(s => s.nodes);
  const transportCompanies = useEmpireStore(s => s.transportCompanies);
  const infraFees = useEmpireStore(s => s.infraFees);
  const foundTransportCompany = useEmpireStore(s => s.foundTransportCompany);
  const openTransportRoute = useEmpireStore(s => s.openTransportRoute);
  const upgradeTransportCompany = useEmpireStore(s => s.upgradeTransportCompany);
  const setInfraFee = useEmpireStore(s => s.setInfraFee);

  const [tab, setTab] = useState('overview'); // overview | found | routes | fees
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyType, setNewCompanyType] = useState('airline');
  const [selectedHubId, setSelectedHubId] = useState('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const ownedNodes = useMemo(() => Object.values(nodes).filter(n => n.owner === 'player'), [nodes]);
  const ownedAirports = useMemo(() => ownedNodes.filter(n => n.type === 'airport'), [ownedNodes]);
  const ownedPorts = useMemo(() => ownedNodes.filter(n => n.type === 'port'), [ownedNodes]);
  const allAirports = useMemo(() => Object.values(nodes).filter(n => n.type === 'airport'), [nodes]);
  const allPorts = useMemo(() => Object.values(nodes).filter(n => n.type === 'port'), [nodes]);

  // Infrastructure that can serve as endpoints for routes
  const getValidEndpoints = useCallback((type) => {
    if (type === 'airline') return Object.values(nodes).filter(n => n.type === 'airport' && n.status === 'operational');
    if (type === 'shipping') return Object.values(nodes).filter(n => n.type === 'port' && n.status === 'operational');
    // Rail: any land-based operational node
    return Object.values(nodes).filter(n => n.status === 'operational' && !['airport', 'port'].includes(n.type));
  }, [nodes]);

  const handleFoundCompany = () => {
    if (!newCompanyName.trim()) { showToast('Enter a company name', 'error'); return; }
    if (!selectedHubId) { showToast('Select a hub', 'error'); return; }
    const ok = foundTransportCompany(newCompanyName.trim(), newCompanyType, selectedHubId);
    if (ok) {
      showToast(`${newCompanyName} founded!`);
      setNewCompanyName('');
      setSelectedHubId('');
      setTab('overview');
    } else {
      showToast('Insufficient funds or invalid hub', 'error');
    }
  };

  const handleOpenRoute = () => {
    if (!selectedCompanyId || !routeFrom || !routeTo) { showToast('Select company and both endpoints', 'error'); return; }
    if (routeFrom === routeTo) { showToast('Origin and destination must differ', 'error'); return; }
    const ok = openTransportRoute(selectedCompanyId, routeFrom, routeTo);
    if (ok) {
      showToast('Route opened!');
      setRouteFrom('');
      setRouteTo('');
    } else {
      showToast('Failed — check funds and endpoints', 'error');
    }
  };

  const totalRevenue = transportCompanies.reduce((sum, tc) => sum + tc.routes.reduce((s, r) => s + (r.active ? r.ticketRevenue * r.frequency : 0), 0), 0);
  const totalCosts = transportCompanies.reduce((sum, tc) => sum + tc.monthlyCost + tc.routes.reduce((s, r) => s + (r.active ? (r.fuelCost + r.landingFee) * r.frequency : 0), 0), 0);
  const totalFeeIncome = infraFees.filter(f => f.ownerIsPlayer).reduce((sum, f) => sum + f.feePerUse * f.usesPerTick, 0);
  const selectedCompany = transportCompanies.find(c => c.id === selectedCompanyId);

  return (
    <div className="font-mono text-[#E8E0D0]">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[120] px-4 py-2 rounded-md text-[11px] font-semibold"
          style={{ background: toast.type === 'error' ? 'rgba(239,68,68,0.92)' : 'rgba(16,185,129,0.92)', color: '#051018' }}>
          {toast.msg}
        </div>
      )}

      {/* Header Stats */}
      <div className="flex items-center gap-6 mb-4 px-1 text-[10px] text-white/55">
        <span>Companies: {transportCompanies.length}</span>
        <span>Routes: {transportCompanies.reduce((s, c) => s + c.routes.length, 0)}</span>
        <span className="text-emerald-400">Revenue: €{totalRevenue.toLocaleString()}/tick</span>
        <span className="text-rose-400">Costs: €{totalCosts.toLocaleString()}/tick</span>
        <span className="text-cyan-400">Infra Fees: €{totalFeeIncome.toLocaleString()}/tick</span>
        <span>Airports Owned: {ownedAirports.length}</span>
        <span>Ports Owned: {ownedPorts.length}</span>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'overview', label: 'Fleet Overview' },
          { key: 'found', label: 'Found Company' },
          { key: 'routes', label: 'Open Route' },
          { key: 'fees', label: 'Infrastructure Fees' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded text-[10px] uppercase tracking-[0.1em] border transition-all"
            style={{
              borderColor: tab === t.key ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)',
              background: tab === t.key ? 'rgba(0,229,255,0.08)' : 'transparent',
              color: tab === t.key ? '#00e5ff' : '#9C8E7E',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {transportCompanies.length === 0 && (
            <div className="text-center text-white/40 text-[10px] py-10">
              No transport companies founded yet. Buy an airport or port node, then found a company.
            </div>
          )}
          {transportCompanies.map(tc => {
            const typeDef = TRANSPORT_TYPES.find(t => t.key === tc.type);
            const netRevenue = tc.routes.reduce((s, r) => s + (r.active ? (r.ticketRevenue - r.fuelCost - r.landingFee) * r.frequency : 0), 0) - tc.monthlyCost;
            return (
              <div key={tc.id} className="rounded-lg border p-3" style={{ borderColor: `${typeDef?.color}33`, background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeDef?.icon}</span>
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: typeDef?.color }}>{tc.name}</div>
                      <div className="text-[9px] text-white/50">Level {tc.level} {typeDef?.label} • Fleet: {tc.fleet} vehicles • Rep: {tc.reputation}/100</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono ${netRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netRevenue >= 0 ? '+' : ''}€{netRevenue.toLocaleString()}/tick
                    </span>
                    <button onClick={() => upgradeTransportCompany(tc.id)}
                      className="px-2 py-1 rounded border text-[9px] uppercase"
                      style={{ borderColor: `${typeDef?.color}44`, color: typeDef?.color }}>
                      Upgrade (€{(150_000 * tc.level).toLocaleString()})
                    </button>
                  </div>
                </div>

                {tc.routes.length > 0 && (
                  <div className="grid gap-1 mt-2">
                    {tc.routes.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] text-[9px]">
                        <span className="text-white/70">{r.fromName} ↔ {r.toName}</span>
                        <div className="flex gap-3 text-white/50">
                          <span>Rev: €{(r.ticketRevenue * r.frequency).toLocaleString()}</span>
                          <span>Fuel: €{(r.fuelCost * r.frequency).toLocaleString()}</span>
                          <span>Fees: €{(r.landingFee * r.frequency).toLocaleString()}</span>
                          <span>Freq: {r.frequency}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {tc.routes.length === 0 && (
                  <div className="text-[9px] text-white/35 mt-1">No routes — go to "Open Route" to add one.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Found Company */}
      {tab === 'found' && (
        <div className="max-w-lg">
          <div className="text-[10px] text-white/60 mb-3">Found a new transport company. You need to own an airport (airline) or port (shipping) as your hub.</div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {TRANSPORT_TYPES.map(t => (
              <button key={t.key} onClick={() => { setNewCompanyType(t.key); setSelectedHubId(''); }}
                className="rounded-lg border p-3 text-left transition-all"
                style={{
                  borderColor: newCompanyType === t.key ? `${t.color}60` : 'rgba(255,255,255,0.08)',
                  background: newCompanyType === t.key ? `${t.color}10` : 'transparent',
                }}>
                <div className="text-lg mb-1">{t.icon}</div>
                <div className="text-[10px] font-semibold" style={{ color: t.color }}>{t.label}</div>
                <div className="text-[8px] text-white/50 mt-1">{t.desc}</div>
                <div className="text-[8px] mt-1" style={{ color: t.color }}>€{t.foundCost.toLocaleString()}</div>
              </button>
            ))}
          </div>

          <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
            placeholder="Company name..."
            className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-[11px] text-white/80 mb-2 focus:outline-none focus:border-cyan-500/30"
          />

          <select value={selectedHubId} onChange={e => setSelectedHubId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-[11px] text-white/80 mb-3 focus:outline-none">
            <option value="">Select hub node...</option>
            {(newCompanyType === 'airline' ? ownedAirports : newCompanyType === 'shipping' ? ownedPorts : ownedNodes).map(n => (
              <option key={n.id} value={n.id}>{n.name} (Lv.{n.level})</option>
            ))}
          </select>

          <button onClick={handleFoundCompany}
            className="px-4 py-2 rounded bg-emerald-600/80 text-[10px] uppercase tracking-[0.12em] text-white hover:bg-emerald-600 transition-colors">
            Found Company — €{(TRANSPORT_TYPES.find(t => t.key === newCompanyType)?.foundCost || 0).toLocaleString()}
          </button>
        </div>
      )}

      {/* Open Route */}
      {tab === 'routes' && (
        <div className="max-w-lg">
          <div className="text-[10px] text-white/60 mb-3">
            Open a new route between two nodes. You pay a one-time setup fee, then earn ticket revenue per tick.
            If you own the airport/port at each end, landing fees are waived — otherwise you pay the market rate.
          </div>

          <select value={selectedCompanyId || ''} onChange={e => { setSelectedCompanyId(e.target.value); setRouteFrom(''); setRouteTo(''); }}
            className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-[11px] text-white/80 mb-2 focus:outline-none">
            <option value="">Select company...</option>
            {transportCompanies.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.name} ({tc.type} Lv.{tc.level})</option>
            ))}
          </select>

          {selectedCompany && (() => {
            const endpoints = getValidEndpoints(selectedCompany.type);
            return (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select value={routeFrom} onChange={e => setRouteFrom(e.target.value)}
                    className="px-3 py-2 rounded bg-white/5 border border-white/10 text-[10px] text-white/80 focus:outline-none">
                    <option value="">Origin...</option>
                    {endpoints.map(n => (
                      <option key={n.id} value={n.id}>{n.name} {n.owner === 'player' ? '(owned)' : ''}</option>
                    ))}
                  </select>
                  <select value={routeTo} onChange={e => setRouteTo(e.target.value)}
                    className="px-3 py-2 rounded bg-white/5 border border-white/10 text-[10px] text-white/80 focus:outline-none">
                    <option value="">Destination...</option>
                    {endpoints.filter(n => n.id !== routeFrom).map(n => (
                      <option key={n.id} value={n.id}>{n.name} {n.owner === 'player' ? '(owned)' : ''}</option>
                    ))}
                  </select>
                </div>

                {routeFrom && routeTo && (() => {
                  const fromNode = nodes[routeFrom];
                  const toNode = nodes[routeTo];
                  if (!fromNode || !toNode) return null;
                  const dist = Math.sqrt(Math.pow(fromNode.lat - toNode.lat, 2) + Math.pow((fromNode.lon || 0) - (toNode.lon || 0), 2));
                  const routeCost = Math.round(50_000 + dist * 5_000);
                  const fromFee = fromNode.owner === 'player' ? 0 : Math.round(2_000 + (fromNode.level || 1) * 1_500);
                  const toFee = toNode.owner === 'player' ? 0 : Math.round(2_000 + (toNode.level || 1) * 1_500);
                  const baseRevenue = Math.round(8_000 + dist * 2_000 + (selectedCompany.level - 1) * 3_000);

                  return (
                    <div className="rounded border border-white/10 p-3 mb-3 bg-white/[0.02] text-[9px]">
                      <div className="grid grid-cols-2 gap-2 text-white/60">
                        <div>Setup Cost: <span className="text-amber-400">€{routeCost.toLocaleString()}</span></div>
                        <div>Est. Revenue: <span className="text-emerald-400">€{baseRevenue.toLocaleString()}/tick</span></div>
                        <div>Origin Fee: <span className={fromFee === 0 ? 'text-emerald-400' : 'text-rose-400'}>{fromFee === 0 ? 'FREE (owned)' : `€${fromFee.toLocaleString()}/use`}</span></div>
                        <div>Dest Fee: <span className={toFee === 0 ? 'text-emerald-400' : 'text-rose-400'}>{toFee === 0 ? 'FREE (owned)' : `€${toFee.toLocaleString()}/use`}</span></div>
                      </div>
                    </div>
                  );
                })()}

                <button onClick={handleOpenRoute}
                  className="px-4 py-2 rounded bg-cyan-600/80 text-[10px] uppercase tracking-[0.12em] text-white hover:bg-cyan-600 transition-colors">
                  Open Route
                </button>
              </>
            );
          })()}
        </div>
      )}

      <AdCardInline variant="wide" />

      {/* Infrastructure Fees */}
      {tab === 'fees' && (
        <div>
          <div className="text-[10px] text-white/60 mb-3">
            Set landing/docking fees on your owned airports and ports. Other companies pay this fee each time they use your infrastructure.
            Higher fees = more income but may reduce traffic over time.
          </div>

          {[...ownedAirports, ...ownedPorts].length === 0 ? (
            <div className="text-center text-white/40 text-[10px] py-8">
              No owned airports or ports. Buy one from the globe to start collecting fees.
            </div>
          ) : (
            <div className="grid gap-2">
              {[...ownedAirports, ...ownedPorts].map(node => {
                const existingFee = infraFees.find(f => f.nodeId === node.id);
                const currentFee = existingFee?.feePerUse || 0;
                return (
                  <div key={node.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2 bg-white/[0.02]">
                    <div>
                      <div className="text-[10px] font-semibold">{node.type === 'airport' ? '✈️' : '🚢'} {node.name}</div>
                      <div className="text-[9px] text-white/50">Level {node.level} • Uses/tick: ~{existingFee?.usesPerTick || Math.floor((node.level || 1) * 3 + 3)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-white/50">Fee/use:</span>
                      {[1000, 2500, 5000, 10000, 25000].map(fee => (
                        <button key={fee} onClick={() => setInfraFee(node.id, fee)}
                          className="px-2 py-0.5 rounded border text-[8px]"
                          style={{
                            borderColor: currentFee === fee ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)',
                            color: currentFee === fee ? '#10b981' : '#9C8E7E',
                            background: currentFee === fee ? 'rgba(16,185,129,0.1)' : 'transparent',
                          }}>
                          €{(fee / 1000).toFixed(fee < 1000 ? 1 : 0)}K
                        </button>
                      ))}
                      {currentFee > 0 && (
                        <span className="text-[9px] text-emerald-400 ml-2">
                          ~€{(currentFee * (existingFee?.usesPerTick || Math.floor((node.level || 1) * 3 + 3))).toLocaleString()}/tick
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
