/**
 * AgentRoster — Full agent card management panel.
 *
 * Tabs:
 * 1. COLLECTION — View and manage owned agent cards
 * 2. RECRUIT — Open agent packs with AP
 * 3. CATALOG — Browse all 50 agent cards
 * 4. MARKET — Buy/sell agent cards
 */

import { useState, useMemo } from 'react';
import { useAgentCardStore } from '../../store/agentCardStore';
import { useCardEconomyStore } from '../../store/cardEconomyStore';
import {
  AGENT_CATALOG,
  AGENT_PACK_TYPES,
  AGENT_RARITY_CONFIG,
  AGENT_CLASS_CONFIG,
  getAgentById,
} from '../../data/agentCards';
import AgentCard, { AgentCardMini } from './AgentCard';

// ── Tab Header ──────────────────────────────────────────────────

const TABS = ['COLLECTION', 'RECRUIT', 'CATALOG', 'MARKET'];

function TabBar({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, padding: '0 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: '8px 16px', fontFamily: 'monospace', fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            background: active === tab ? 'rgba(255,255,255,0.06)' : 'transparent',
            color: active === tab ? '#00F0FF' : 'rgba(255,255,255,0.4)',
            border: 'none', borderBottom: active === tab ? '2px solid #00F0FF' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ── Collection Tab ──────────────────────────────────────────────

function CollectionTab({ onSelectAgent }) {
  const agents = useAgentCardStore(s => s.agents);
  const deployAgent = useAgentCardStore(s => s.deployAgent);
  const recallAgent = useAgentCardStore(s => s.recallAgent);
  const quickSellAgent = useAgentCardStore(s => s.quickSellAgent);
  const awardAegisPoints = useCardEconomyStore(s => s.awardAegisPoints);
  const [filter, setFilter] = useState('all');
  const [selectedMint, setSelectedMint] = useState(null);

  const agentList = useMemo(() => {
    const list = Object.values(agents);
    if (filter === 'deployed') return list.filter(a => a.deployedTo);
    if (filter === 'available') return list.filter(a => !a.deployedTo && !a.isLocked);
    if (filter !== 'all') return list.filter(a => {
      const def = getAgentById(a.cardId);
      return def?.class === filter;
    });
    return list;
  }, [agents, filter]);

  const selectedAgent = selectedMint ? agents[selectedMint] : null;

  const handleSell = (mintId) => {
    const value = quickSellAgent(mintId);
    if (value > 0) {
      awardAegisPoints(value, 'agent_quick_sell');
      setSelectedMint(null);
    }
  };

  const classes = ['all', 'deployed', 'available', ...Object.keys(AGENT_CLASS_CONFIG)];

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', padding: 16 }}>
      {/* Left: List */}
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {classes.map(cls => (
            <button
              key={cls}
              onClick={() => setFilter(cls)}
              style={{
                padding: '3px 8px', borderRadius: 4,
                fontFamily: 'monospace', fontSize: 8,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: filter === cls ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: filter === cls ? '#00F0FF' : 'rgba(255,255,255,0.4)',
                border: filter === cls ? '1px solid rgba(0,240,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
              }}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Count */}
        <div style={{
          fontFamily: 'monospace', fontSize: 9,
          color: 'rgba(255,255,255,0.35)',
        }}>
          {agentList.length} agent{agentList.length !== 1 ? 's' : ''}
        </div>

        {/* Agent list */}
        <div style={{
          flex: 1, overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {agentList.length === 0 && (
            <div style={{
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(255,255,255,0.3)', textAlign: 'center',
              padding: 20,
            }}>
              No agents found. Open packs to recruit!
            </div>
          )}
          {agentList.map(agent => (
            <AgentCardMini
              key={agent.mintId}
              cardId={agent.cardId}
              minted={agent}
              onClick={() => setSelectedMint(agent.mintId)}
            />
          ))}
        </div>
      </div>

      {/* Right: Selected card detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {selectedAgent ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <AgentCard
              cardId={selectedAgent.cardId}
              minted={selectedAgent}
              size="large"
              showActions={true}
              onDeploy={(mintId) => onSelectAgent?.(mintId)}
              onRecall={recallAgent}
            />
            {/* Quick sell */}
            {!selectedAgent.deployedTo && !selectedAgent.isLocked && (
              <button
                onClick={() => handleSell(selectedAgent.mintId)}
                style={{
                  padding: '6px 20px', borderRadius: 4,
                  fontFamily: 'monospace', fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer',
                }}
              >
                Quick Sell ({AGENT_RARITY_CONFIG[getAgentById(selectedAgent.cardId)?.rarity ?? 'Common'].quickSellValue}Q)
              </button>
            )}
          </div>
        ) : (
          <div style={{
            fontFamily: 'monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          }}>
            Select an agent to view details
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recruit Tab ─────────────────────────────────────────────────

function RecruitTab() {
  const openAgentPack = useAgentCardStore(s => s.openAgentPack);
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);
  const spendAegisPoints = useCardEconomyStore(s => s.spendAegisPoints);
  const [revealCards, setRevealCards] = useState([]);
  const [revealing, setRevealing] = useState(false);

  const handleOpenPack = (packId) => {
    const pack = AGENT_PACK_TYPES[packId];
    if (!pack || aegisPoints < pack.cost) return;

    if (!spendAegisPoints(pack.cost)) return;
    const result = openAgentPack(packId, pack.cost);
    if (!result) return;

    setRevealing(true);
    setRevealCards(result.minted);

    // Auto-dismiss after viewing
    setTimeout(() => setRevealing(false), 15000);
  };

  return (
    <div style={{ padding: 16 }}>
      {/* AP balance */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 20,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          BALANCE
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 22,
          fontWeight: 'bold', color: '#FBBF24',
        }}>
          {aegisPoints.toLocaleString()} AP
        </span>
      </div>

      {revealing && revealCards.length > 0 ? (
        /* Card reveal */
        <div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
            marginBottom: 16,
          }}>
            {revealCards.map((agent, i) => {
              const def = getAgentById(agent.cardId);
              return (
                <div key={agent.mintId} style={{
                  animation: `card-reveal 0.5s ${i * 0.15}s ease both`,
                }}>
                  <AgentCard cardId={agent.cardId} minted={agent} size="small" interactive={false} />
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setRevealing(false)}
              style={{
                padding: '8px 24px', borderRadius: 6,
                fontFamily: 'monospace', fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                background: 'rgba(0,240,255,0.1)', color: '#00F0FF',
                border: '1px solid rgba(0,240,255,0.3)', cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* Pack selection */
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {Object.values(AGENT_PACK_TYPES).map(pack => {
            const canAfford = aegisPoints >= pack.cost;
            return (
              <button
                key={pack.id}
                onClick={() => handleOpenPack(pack.id)}
                disabled={!canAfford}
                style={{
                  padding: 16, borderRadius: 8,
                  background: canAfford ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                  border: canAfford
                    ? '1px solid rgba(0,240,255,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  opacity: canAfford ? 1 : 0.4,
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 13,
                  fontWeight: 'bold', color: '#E2E8F0', marginBottom: 4,
                }}>
                  {pack.name}
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 9,
                  color: 'rgba(255,255,255,0.5)', marginBottom: 8,
                  lineHeight: 1.4,
                }}>
                  {pack.description}
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 14,
                  fontWeight: 'bold', color: '#FBBF24',
                }}>
                  {pack.cost.toLocaleString()} Q
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 8,
                  color: 'rgba(255,255,255,0.3)', marginTop: 4,
                  textTransform: 'uppercase',
                }}>
                  {pack.edition} Edition
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Catalog Tab ─────────────────────────────────────────────────

function CatalogTab() {
  const [selectedId, setSelectedId] = useState(null);
  const [classFilter, setClassFilter] = useState('all');

  const filtered = useMemo(() => {
    if (classFilter === 'all') return AGENT_CATALOG;
    return AGENT_CATALOG.filter(a => a.class === classFilter);
  }, [classFilter]);

  const selected = selectedId ? getAgentById(selectedId) : null;

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', padding: 16 }}>
      {/* Left: Catalog list */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Class filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <button
            onClick={() => setClassFilter('all')}
            style={{
              padding: '3px 8px', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 8,
              background: classFilter === 'all' ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.03)',
              color: classFilter === 'all' ? '#00F0FF' : 'rgba(255,255,255,0.4)',
              border: classFilter === 'all' ? '1px solid rgba(0,240,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
            }}
          >
            ALL ({AGENT_CATALOG.length})
          </button>
          {Object.entries(AGENT_CLASS_CONFIG).map(([cls, cfg]) => {
            const count = AGENT_CATALOG.filter(a => a.class === cls).length;
            return (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                style={{
                  padding: '3px 8px', borderRadius: 4,
                  fontFamily: 'monospace', fontSize: 8,
                  background: classFilter === cls ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                  color: classFilter === cls ? cfg.color : 'rgba(255,255,255,0.4)',
                  border: classFilter === cls ? `1px solid ${cfg.color}40` : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}
              >
                {cfg.icon} {cls} ({count})
              </button>
            );
          })}
        </div>

        {/* Card grid */}
        <div style={{
          flex: 1, overflow: 'auto',
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6, alignContent: 'start',
        }}>
          {filtered.map(agent => {
            const rc = AGENT_RARITY_CONFIG[agent.rarity];
            const cc = AGENT_CLASS_CONFIG[agent.class];
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                style={{
                  padding: 8, borderRadius: 6, textAlign: 'center',
                  background: selectedId === agent.id ? `${rc.color}15` : 'rgba(255,255,255,0.02)',
                  border: selectedId === agent.id ? `1px solid ${rc.color}40` : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{agent.iconGlyph}</div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 8, fontWeight: 'bold',
                  color: '#E2E8F0', lineHeight: 1.2,
                }}>
                  {agent.name}
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 6,
                  color: rc.color, marginTop: 2,
                }}>
                  {agent.rarity}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Selected card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected ? (
          <AgentCard cardId={selected.id} size="large" />
        ) : (
          <div style={{
            fontFamily: 'monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          }}>
            Select a card to preview
          </div>
        )}
      </div>
    </div>
  );
}

// ── Market Tab ──────────────────────────────────────────────────

function MarketTab() {
  const listings = useAgentCardStore(s => s.listings);
  const buyAgent = useAgentCardStore(s => s.buyAgent);
  const delistAgent = useAgentCardStore(s => s.delistAgent);
  const agents = useAgentCardStore(s => s.agents);
  const aegisPoints = useCardEconomyStore(s => s.aegisPoints);
  const spendAegisPoints = useCardEconomyStore(s => s.spendAegisPoints);
  const awardAegisPoints = useCardEconomyStore(s => s.awardAegisPoints);
  const listAgent = useAgentCardStore(s => s.listAgent);
  const [listingMintId, setListingMintId] = useState('');
  const [listingPrice, setListingPrice] = useState('');

  const handleBuy = (listingId, price) => {
    const fee = Math.ceil(price * 0.05);
    const total = price + fee;
    if (aegisPoints < total) return;
    if (!spendAegisPoints(total)) return;
    buyAgent(listingId);
  };

  const handleList = () => {
    if (!listingMintId || !listingPrice) return;
    const price = parseInt(listingPrice);
    if (isNaN(price) || price <= 0) return;
    listAgent(listingMintId, price);
    setListingMintId('');
    setListingPrice('');
  };

  const availableToList = Object.values(agents).filter(a => !a.deployedTo && !a.isLocked);

  return (
    <div style={{ padding: 16 }}>
      {/* List an agent */}
      <div style={{
        marginBottom: 16, padding: 12, borderRadius: 8,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        }}>
          LIST AN AGENT
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={listingMintId}
            onChange={e => setListingMintId(e.target.value)}
            style={{
              flex: 1, padding: '6px 8px', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 10,
              background: 'rgba(0,0,0,0.3)', color: '#E2E8F0',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <option value="">Select agent...</option>
            {availableToList.map(a => {
              const def = getAgentById(a.cardId);
              return (
                <option key={a.mintId} value={a.mintId}>
                  {def?.name ?? a.cardId} (LV.{a.level})
                </option>
              );
            })}
          </select>
          <input
            type="number"
            placeholder="Price (Q)"
            value={listingPrice}
            onChange={e => setListingPrice(e.target.value)}
            style={{
              width: 100, padding: '6px 8px', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 10,
              background: 'rgba(0,0,0,0.3)', color: '#FBBF24',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <button
            onClick={handleList}
            disabled={!listingMintId || !listingPrice}
            style={{
              padding: '6px 16px', borderRadius: 4,
              fontFamily: 'monospace', fontSize: 9,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              background: 'rgba(0,240,255,0.1)', color: '#00F0FF',
              border: '1px solid rgba(0,240,255,0.3)',
              cursor: listingMintId && listingPrice ? 'pointer' : 'not-allowed',
              opacity: listingMintId && listingPrice ? 1 : 0.4,
            }}
          >
            List
          </button>
        </div>
      </div>

      {/* Active listings */}
      <div style={{
        fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        MARKETPLACE ({listings.length} listing{listings.length !== 1 ? 's' : ''})
      </div>

      {listings.length === 0 ? (
        <div style={{
          fontFamily: 'monospace', fontSize: 10,
          color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 30,
        }}>
          No agents listed. Be the first to list!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {listings.map(listing => {
            const def = getAgentById(listing.cardId);
            if (!def) return null;
            const rc = AGENT_RARITY_CONFIG[def.rarity];
            const fee = Math.ceil(listing.price * 0.05);
            const total = listing.price + fee;
            const canAfford = aegisPoints >= total;

            return (
              <div key={listing.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${rc.color}20`,
              }}>
                <span style={{ fontSize: 20 }}>{def.iconGlyph}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold', color: '#E2E8F0',
                  }}>
                    {def.name}
                  </div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: 8, color: rc.color,
                  }}>
                    {def.rarity} • {def.class}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold', color: '#FBBF24',
                  }}>
                    {listing.price.toLocaleString()} Q
                  </div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)',
                  }}>
                    +{fee}Q fee
                  </div>
                </div>
                <button
                  onClick={() => handleBuy(listing.id, listing.price)}
                  disabled={!canAfford}
                  style={{
                    padding: '5px 14px', borderRadius: 4,
                    fontFamily: 'monospace', fontSize: 9,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: canAfford ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: canAfford ? '#10B981' : 'rgba(255,255,255,0.3)',
                    border: canAfford ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}
                >
                  Buy
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────

export default function AgentRoster({ onClose, onSelectAgent }) {
  const [tab, setTab] = useState('COLLECTION');
  const totalMinted = useAgentCardStore(s => s.totalMinted);
  const totalDeployed = useAgentCardStore(s => s.totalDeployed);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '90vw', maxWidth: 900, height: '85vh',
        background: 'rgba(10, 12, 16, 0.95)',
        border: '1px solid rgba(0,240,255,0.15)',
        borderRadius: 12, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(0,240,255,0.08)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 14,
                fontWeight: 'bold', color: '#E2E8F0', letterSpacing: '0.05em',
              }}>
                AGENT ROSTER
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)',
              }}>
                {totalMinted} minted • {totalDeployed} deployed • {AGENT_CATALOG.length} in catalog
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 14,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <TabBar active={tab} onChange={setTab} />

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tab === 'COLLECTION' && <CollectionTab onSelectAgent={onSelectAgent} />}
          {tab === 'RECRUIT' && <RecruitTab />}
          {tab === 'CATALOG' && <CatalogTab />}
          {tab === 'MARKET' && <MarketTab />}
        </div>
      </div>
    </div>
  );
}
