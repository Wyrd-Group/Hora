// ══════════════════════════════════════════════════════════════════
// Blockchain Store — Zustand persistence layer for the AEGIS Chain
// ══════════════════════════════════════════════════════════════════

import { createPersistedStore } from './createPersistedStore';
import {
  AegisChain,
  CHAIN_CONFIG,
  createTransaction,
  type Block,
  type ChainTransaction,
  type ChainState,
  type TokenOwnership,
} from '../lib/aegisChain';

// ── Types ────────────────────────────────────────────────────────

interface BlockchainStoreState {
  // Serialized chain state
  chainData: ChainState | null;
  initialized: boolean;
  validator: string;

  // Explorer state
  selectedBlock: number | null;
  selectedTx: string | null;

  // Actions
  initChain: (validator?: string) => void;
  recordMint: (tokenId: string, cardId: string, metadata?: Record<string, string | number | boolean>) => string;
  recordTransfer: (tokenId: string, cardId: string, from: string, to: string, metadata?: Record<string, string | number | boolean>) => string;
  recordBurn: (tokenId: string, cardId: string, metadata?: Record<string, string | number | boolean>) => string;
  recordList: (tokenId: string, cardId: string, price: number) => string;
  recordDelist: (tokenId: string, cardId: string) => string;
  recordDeploy: (tokenId: string, cardId: string, nodeId: string) => string;
  recordRecall: (tokenId: string, cardId: string) => string;
  recordLevelUp: (tokenId: string, cardId: string, newLevel: number) => string;
  recordAbilityUse: (tokenId: string, cardId: string, abilityName: string) => string;
  recordContractSign: (tokenId: string, cardId: string, salary: number, termLength: number) => string;
  recordContractEnd: (tokenId: string, cardId: string, reason: string) => string;
  recordBoost: (tokenId: string, cardId: string, stat: string, value: number) => string;
  recordSpecialCard: (tokenId: string, cardId: string, specialType: string) => string;
  flushBlock: () => Block | null;
  validateChain: () => { valid: boolean; errors: string[] };

  // Queries
  getBlock: (height: number) => Block | undefined;
  getLatestBlock: () => Block | undefined;
  getTransaction: (txId: string) => ChainTransaction | undefined;
  getTokenHistory: (tokenId: string) => ChainTransaction[];
  getTokenOwner: (tokenId: string) => string | undefined;
  getTokenLedger: () => Record<string, TokenOwnership>;
  getChainHeight: () => number;
  getTotalTransactions: () => number;
  getAllBlocks: () => Block[];
  getPendingTransactions: () => ChainTransaction[];
  getStats: () => {
    chainHeight: number;
    totalTransactions: number;
    pendingCount: number;
    tokensTracked: number;
    activeTokens: number;
    burnedTokens: number;
    validator: string;
  };

  // Explorer actions
  selectBlock: (height: number | null) => void;
  selectTransaction: (txId: string | null) => void;
  setValidator: (name: string) => void;
}

// ── Chain Instance Management ────────────────────────────────────

let _chain: AegisChain | null = null;

function getChain(state: { chainData: ChainState | null; validator: string }): AegisChain {
  if (!_chain) {
    if (state.chainData) {
      _chain = AegisChain.deserialize(state.chainData, state.validator);
    } else {
      _chain = new AegisChain(state.validator);
      _chain.createGenesis();
    }
  }
  return _chain;
}

function persistChain(chain: AegisChain): Partial<BlockchainStoreState> {
  return { chainData: chain.serialize() };
}

// ── Helper ───────────────────────────────────────────────────────

function submitAndPersist(
  get: () => BlockchainStoreState,
  set: (partial: Partial<BlockchainStoreState>) => void,
  tx: ChainTransaction,
): string {
  const chain = getChain(get());
  const txId = chain.submitTransaction(tx);
  set(persistChain(chain));
  return txId;
}

// ── Store ────────────────────────────────────────────────────────

export const useBlockchainStore = createPersistedStore<BlockchainStoreState>(
  'aegis-blockchain-v1',
  (set, get) => ({
    chainData: null,
    initialized: false,
    validator: 'AEGIS Empire',
    selectedBlock: null,
    selectedTx: null,

    initChain: (validator = 'AEGIS Empire') => {
      _chain = new AegisChain(validator);
      _chain.createGenesis();
      set({
        chainData: _chain.serialize(),
        initialized: true,
        validator,
      });
    },

    // ── Record Transactions ────────────────────────────────

    recordMint: (tokenId, cardId, metadata = {}) => {
      const tx = createTransaction('MINT', tokenId, cardId, 'GENESIS', 'PLAYER', {
        ...metadata,
        standard: CHAIN_CONFIG.tokenStandard,
        contract: CHAIN_CONFIG.contractAddress,
      });
      return submitAndPersist(get, set, tx);
    },

    recordTransfer: (tokenId, cardId, from, to, metadata = {}) => {
      const tx = createTransaction('TRANSFER', tokenId, cardId, from, to, metadata);
      return submitAndPersist(get, set, tx);
    },

    recordBurn: (tokenId, cardId, metadata = {}) => {
      const tx = createTransaction('BURN', tokenId, cardId, 'PLAYER', 'BURNED', metadata);
      return submitAndPersist(get, set, tx);
    },

    recordList: (tokenId, cardId, price) => {
      const tx = createTransaction('LIST', tokenId, cardId, 'PLAYER', 'MARKET', { price });
      return submitAndPersist(get, set, tx);
    },

    recordDelist: (tokenId, cardId) => {
      const tx = createTransaction('DELIST', tokenId, cardId, 'MARKET', 'PLAYER', {});
      return submitAndPersist(get, set, tx);
    },

    recordDeploy: (tokenId, cardId, nodeId) => {
      const tx = createTransaction('DEPLOY', tokenId, cardId, 'PLAYER', nodeId, {});
      return submitAndPersist(get, set, tx);
    },

    recordRecall: (tokenId, cardId) => {
      const tx = createTransaction('RECALL', tokenId, cardId, 'DEPLOYED', 'PLAYER', {});
      return submitAndPersist(get, set, tx);
    },

    recordLevelUp: (tokenId, cardId, newLevel) => {
      const tx = createTransaction('LEVEL_UP', tokenId, cardId, 'PLAYER', 'PLAYER', { newLevel });
      return submitAndPersist(get, set, tx);
    },

    recordAbilityUse: (tokenId, cardId, abilityName) => {
      const tx = createTransaction('ABILITY_USE', tokenId, cardId, 'PLAYER', 'PLAYER', { ability: abilityName });
      return submitAndPersist(get, set, tx);
    },

    recordContractSign: (tokenId, cardId, salary, termLength) => {
      const tx = createTransaction('CONTRACT_SIGN', tokenId, cardId, 'PLAYER', 'PLAYER', { salary, termLength });
      return submitAndPersist(get, set, tx);
    },

    recordContractEnd: (tokenId, cardId, reason) => {
      const tx = createTransaction('CONTRACT_END', tokenId, cardId, 'PLAYER', 'PLAYER', { reason });
      return submitAndPersist(get, set, tx);
    },

    recordBoost: (tokenId, cardId, stat, value) => {
      const tx = createTransaction('BOOST', tokenId, cardId, 'PLAYER', 'PLAYER', { stat, value });
      return submitAndPersist(get, set, tx);
    },

    recordSpecialCard: (tokenId, cardId, specialType) => {
      const tx = createTransaction('SPECIAL_CARD', tokenId, cardId, 'PLAYER', 'PLAYER', { specialType });
      return submitAndPersist(get, set, tx);
    },

    flushBlock: () => {
      const chain = getChain(get());
      const block = chain.flush();
      if (block) set(persistChain(chain));
      return block;
    },

    validateChain: () => {
      const chain = getChain(get());
      return chain.validateChain();
    },

    // ── Queries ────────────────────────────────────────────

    getBlock: (height) => getChain(get()).getBlock(height),
    getLatestBlock: () => getChain(get()).getLatestBlock(),
    getTransaction: (txId) => getChain(get()).getTransaction(txId),
    getTokenHistory: (tokenId) => getChain(get()).getTokenHistory(tokenId),
    getTokenOwner: (tokenId) => getChain(get()).getTokenOwner(tokenId),
    getTokenLedger: () => getChain(get()).getTokenLedger(),
    getChainHeight: () => getChain(get()).getChainHeight(),
    getTotalTransactions: () => getChain(get()).getTotalTransactions(),
    getAllBlocks: () => getChain(get()).getAllBlocks(),
    getPendingTransactions: () => getChain(get()).getPendingTransactions(),
    getStats: () => getChain(get()).getStats(),

    // ── Explorer ───────────────────────────────────────────

    selectBlock: (height) => set({ selectedBlock: height }),
    selectTransaction: (txId) => set({ selectedTx: txId }),
    setValidator: (name) => {
      const chain = getChain(get());
      chain.setValidator(name);
      set({ validator: name, ...persistChain(chain) });
    },
  }),
);
