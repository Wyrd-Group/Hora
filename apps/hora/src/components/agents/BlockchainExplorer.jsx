import React, { useState, useMemo } from 'react';
import { useBlockchainStore } from '../../store/blockchainStore';

// ── TX Type Colors ─────────────────────────────────────────────
const TX_COLORS = {
  MINT: 'text-emerald-400',
  TRANSFER: 'text-cyan-400',
  BURN: 'text-rose-400',
  LIST: 'text-amber-400',
  DELIST: 'text-gray-400',
  DEPLOY: 'text-blue-400',
  RECALL: 'text-indigo-400',
  LEVEL_UP: 'text-purple-400',
  ABILITY_USE: 'text-pink-400',
  CONTRACT_SIGN: 'text-teal-400',
  CONTRACT_END: 'text-orange-400',
  BOOST: 'text-yellow-400',
  SPECIAL_CARD: 'text-fuchsia-400',
};

const TX_ICONS = {
  MINT: '\u2728',
  TRANSFER: '\u21C4',
  BURN: '\uD83D\uDD25',
  LIST: '\uD83C\uDFEA',
  DELIST: '\u21A9',
  DEPLOY: '\uD83D\uDE80',
  RECALL: '\uD83C\uDFE0',
  LEVEL_UP: '\u2B06',
  ABILITY_USE: '\u26A1',
  CONTRACT_SIGN: '\uD83D\uDCDD',
  CONTRACT_END: '\uD83D\uDCCB',
  BOOST: '\uD83D\uDCAA',
  SPECIAL_CARD: '\u2B50',
};

function truncateHash(hash, len = 8) {
  if (!hash) return '???';
  return hash.slice(0, len) + '\u2026' + hash.slice(-4);
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Block Card ─────────────────────────────────────────────────
function BlockCard({ block, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isSelected
          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
          : 'bg-[rgba(24,22,18,0.85)] border-[rgba(232,224,208,0.08)] hover:border-[rgba(232,224,208,0.2)]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-cyan-400 font-mono text-xs font-bold">
          Block #{block.height}
        </span>
        <span className="text-[#9C8E7E] text-[10px] font-mono">
          {block.transactions.length} tx{block.transactions.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="text-[10px] text-[#9C8E7E] font-mono truncate">
        {truncateHash(block.hash, 12)}
      </div>
      <div className="text-[10px] text-[#9C8E7E]/60 mt-0.5">
        {formatTime(block.timestamp)}
      </div>
    </button>
  );
}

// ── Transaction Row ────────────────────────────────────────────
function TxRow({ tx, isSelected, onClick }) {
  const color = TX_COLORS[tx.type] || 'text-gray-400';
  const icon = TX_ICONS[tx.type] || '\u25CF';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 mb-1.5 ${
        isSelected
          ? 'bg-cyan-500/10 border-cyan-500/30'
          : 'bg-[rgba(24,22,18,0.6)] border-[rgba(232,224,208,0.05)] hover:border-[rgba(232,224,208,0.15)]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className={`font-mono text-xs font-bold ${color}`}>{tx.type}</span>
        <span className="text-[#9C8E7E] text-[10px] font-mono ml-auto">
          {truncateHash(tx.txId, 6)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#9C8E7E]/70 font-mono">
        <span>{tx.from}</span>
        <span className="text-cyan-500">{'\u2192'}</span>
        <span>{tx.to}</span>
      </div>
    </button>
  );
}

// ── Transaction Detail ─────────────────────────────────────────
function TxDetail({ tx }) {
  if (!tx) return null;
  const color = TX_COLORS[tx.type] || 'text-gray-400';

  return (
    <div className="bg-[rgba(24,22,18,0.9)] border border-[rgba(232,224,208,0.1)] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{TX_ICONS[tx.type] || '\u25CF'}</span>
        <span className={`font-mono text-sm font-bold ${color}`}>{tx.type}</span>
        <span className="text-[#9C8E7E] text-xs ml-auto">
          Block #{tx.blockHeight === -1 ? 'Pending' : tx.blockHeight}
        </span>
      </div>

      <div className="space-y-2 text-xs font-mono">
        <Row label="TX Hash" value={tx.txId} full />
        <Row label="Token" value={tx.tokenId} />
        <Row label="Card ID" value={tx.cardId} />
        <Row label="From" value={tx.from} />
        <Row label="To" value={tx.to} />
        <Row label="Time" value={formatTime(tx.timestamp)} />
        {Object.keys(tx.metadata).length > 0 && (
          <div className="pt-2 border-t border-[rgba(232,224,208,0.08)]">
            <span className="text-[#9C8E7E] text-[10px] uppercase tracking-wider">Metadata</span>
            {Object.entries(tx.metadata).map(([k, v]) => (
              <Row key={k} label={k} value={String(v)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, full }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#9C8E7E]/60 min-w-[70px] text-right shrink-0">{label}</span>
      <span className={`text-[#E8E0D0] ${full ? 'break-all' : 'truncate'}`}>{value}</span>
    </div>
  );
}

// ── Chain Stats Bar ────────────────────────────────────────────
function ChainStatsBar({ stats }) {
  const items = [
    { label: 'Blocks', value: stats.chainHeight, color: 'text-cyan-400' },
    { label: 'Transactions', value: stats.totalTransactions, color: 'text-emerald-400' },
    { label: 'Tokens', value: stats.tokensTracked, color: 'text-purple-400' },
    { label: 'Active', value: stats.activeTokens, color: 'text-blue-400' },
    { label: 'Burned', value: stats.burnedTokens, color: 'text-rose-400' },
    { label: 'Pending', value: stats.pendingCount, color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-[rgba(24,22,18,0.7)] border border-[rgba(232,224,208,0.06)] rounded-lg p-2 text-center">
          <div className={`font-mono text-sm font-bold ${color}`}>{value.toLocaleString()}</div>
          <div className="text-[9px] text-[#9C8E7E] uppercase tracking-wider mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Explorer ──────────────────────────────────────────────
export default function BlockchainExplorer() {
  const store = useBlockchainStore();
  const [selectedBlockHeight, setSelectedBlockHeight] = useState(null);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [view, setView] = useState('blocks'); // 'blocks' | 'tokens' | 'pending'
  const [validationResult, setValidationResult] = useState(null);

  // Initialize chain if needed
  if (!store.initialized) {
    store.initChain();
  }

  const stats = store.getStats();
  const blocks = store.getAllBlocks();
  const pendingTxs = store.getPendingTransactions();
  const tokenLedger = store.getTokenLedger();

  const selectedBlock = useMemo(
    () => selectedBlockHeight != null ? store.getBlock(selectedBlockHeight) : null,
    [selectedBlockHeight, blocks.length]
  );

  const selectedTx = useMemo(
    () => selectedTxId ? store.getTransaction(selectedTxId) : null,
    [selectedTxId, blocks.length]
  );

  const reversedBlocks = useMemo(() => [...blocks].reverse(), [blocks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-[#E8E0D0] font-mono text-sm font-bold tracking-wide">
            AEGIS Chain Explorer
          </h2>
          <p className="text-[#9C8E7E] text-[10px] font-mono mt-0.5">
            Sovereign Proof-of-Authority &bull; {stats.validator}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {store.getPendingTransactions().length > 0 && (
            <button
              onClick={() => store.flushBlock()}
              className="px-2 py-1 text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-colors"
            >
              Mine Block
            </button>
          )}
          <button
            onClick={() => {
              const result = store.validateChain();
              setValidationResult(result);
              setTimeout(() => setValidationResult(null), 5000);
            }}
            className="px-2 py-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-colors"
          >
            Validate
          </button>
          {validationResult && (
            <div className={`px-3 py-1.5 text-[10px] font-mono rounded border ${
              validationResult.valid
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {validationResult.valid
                ? 'Chain valid! All blocks verified.'
                : `Invalid: ${validationResult.errors?.[0] || 'Unknown error'}`}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <ChainStatsBar stats={stats} />

      {/* Tab Bar */}
      <div className="flex gap-1 mb-3">
        {[
          { id: 'blocks', label: 'Blocks' },
          { id: 'tokens', label: 'Token Ledger' },
          { id: 'pending', label: `Pending (${pendingTxs.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded transition-colors ${
              view === tab.id
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-[#9C8E7E] hover:text-[#E8E0D0] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'blocks' && (
          <div className="flex gap-3 h-full">
            {/* Block list */}
            <div className="w-1/3 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {reversedBlocks.map(block => (
                <BlockCard
                  key={block.height}
                  block={block}
                  isSelected={selectedBlockHeight === block.height}
                  onClick={() => {
                    setSelectedBlockHeight(block.height);
                    setSelectedTxId(null);
                  }}
                />
              ))}
              {blocks.length === 0 && (
                <p className="text-[#9C8E7E] text-xs font-mono text-center py-8">No blocks yet</p>
              )}
            </div>

            {/* Block detail / tx list */}
            <div className="w-1/3 overflow-y-auto pr-1 scrollbar-thin">
              {selectedBlock ? (
                <>
                  <div className="mb-2 p-2 bg-[rgba(24,22,18,0.7)] rounded-lg border border-[rgba(232,224,208,0.06)]">
                    <div className="text-[10px] font-mono text-[#9C8E7E] space-y-1">
                      <div className="text-cyan-400 font-bold text-xs mb-1">Block #{selectedBlock.height}</div>
                      <div className="break-all">Hash: {selectedBlock.hash}</div>
                      <div className="break-all">Prev: {truncateHash(selectedBlock.previousHash, 16)}</div>
                      <div>Merkle: {truncateHash(selectedBlock.merkleRoot, 16)}</div>
                      <div>Validator: {selectedBlock.validator}</div>
                      <div>{formatTime(selectedBlock.timestamp)}</div>
                    </div>
                  </div>
                  {selectedBlock.transactions.map(tx => (
                    <TxRow
                      key={tx.txId}
                      tx={tx}
                      isSelected={selectedTxId === tx.txId}
                      onClick={() => setSelectedTxId(tx.txId)}
                    />
                  ))}
                </>
              ) : (
                <p className="text-[#9C8E7E] text-xs font-mono text-center py-8">Select a block</p>
              )}
            </div>

            {/* TX detail */}
            <div className="w-1/3 overflow-y-auto scrollbar-thin">
              {selectedTx ? (
                <TxDetail tx={selectedTx} />
              ) : (
                <p className="text-[#9C8E7E] text-xs font-mono text-center py-8">Select a transaction</p>
              )}
            </div>
          </div>
        )}

        {view === 'tokens' && (
          <div className="overflow-y-auto h-full space-y-1.5 scrollbar-thin">
            {Object.values(tokenLedger).length === 0 ? (
              <p className="text-[#9C8E7E] text-xs font-mono text-center py-8">No tokens on-chain yet</p>
            ) : (
              Object.values(tokenLedger).map(token => (
                <div
                  key={token.tokenId}
                  className="bg-[rgba(24,22,18,0.7)] border border-[rgba(232,224,208,0.06)] rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#E8E0D0] font-mono text-xs font-bold truncate mr-2">
                      {token.tokenId}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      token.owner === 'BURNED' ? 'bg-rose-500/20 text-rose-400'
                        : token.owner === 'MARKET' ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {token.owner}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9C8E7E] font-mono space-y-0.5">
                    <div>Card: {token.cardId}</div>
                    <div>Minted in block #{token.mintBlock} &bull; {token.transactionHistory.length} txs</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'pending' && (
          <div className="overflow-y-auto h-full space-y-1.5 scrollbar-thin">
            {pendingTxs.length === 0 ? (
              <p className="text-[#9C8E7E] text-xs font-mono text-center py-8">Mempool empty</p>
            ) : (
              pendingTxs.map(tx => (
                <TxRow
                  key={tx.txId}
                  tx={tx}
                  isSelected={selectedTxId === tx.txId}
                  onClick={() => setSelectedTxId(tx.txId)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
