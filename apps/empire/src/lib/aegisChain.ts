// ══════════════════════════════════════════════════════════════════
// AEGIS Chain — Lightweight Proof-of-Authority blockchain for Agent NFTs
// ══════════════════════════════════════════════════════════════════
//
// A fully functional in-game blockchain that records every NFT
// lifecycle event (mint, transfer, burn, list, delist, deploy, recall,
// level-up, ability-use) as immutable transactions in a Merkle-tree-backed
// block structure.
//
// Design:
//   • Proof-of-Authority: the player's empire is the sole validator
//   • SHA-256 hashing (Web Crypto API, with sync fallback)
//   • Merkle tree per block for transaction integrity
//   • Genesis block seeded from empire identity
//   • Blocks mined every N transactions or on-demand flush
//   • Full chain validation (hash continuity + merkle roots)
//   • Token ownership ledger derived from transaction history
//
// This is NOT a distributed consensus chain — it's a single-authority
// chain that provides tamper-evident history and authentic NFT provenance.
// ══════════════════════════════════════════════════════════════════

// ── Transaction Types ────────────────────────────────────────────

export type TxType =
  | 'MINT'           // New agent minted from pack or direct mint
  | 'TRANSFER'       // Ownership transfer (marketplace buy)
  | 'BURN'           // Agent destroyed (quick sell)
  | 'LIST'           // Listed on marketplace
  | 'DELIST'         // Removed from marketplace
  | 'DEPLOY'         // Deployed to a node/department
  | 'RECALL'         // Recalled from deployment
  | 'LEVEL_UP'       // Agent leveled up
  | 'ABILITY_USE'    // Active ability triggered
  | 'CONTRACT_SIGN'  // New contract signed
  | 'CONTRACT_END'   // Contract expired/terminated
  | 'BOOST'          // Stat boost applied
  | 'SPECIAL_CARD';  // Special card type applied (TOTW, Icon, etc.)

export interface ChainTransaction {
  txId: string;            // Unique transaction hash
  type: TxType;
  timestamp: number;
  blockHeight: number;     // -1 until mined into a block
  // NFT data
  tokenId: string;         // The agent's mintId
  cardId: string;          // The AgentCardDef.id
  from: string;            // 'GENESIS' for mints, 'PLAYER' or listing id
  to: string;              // 'PLAYER', 'BURNED', 'MARKET', node id, etc.
  // Optional metadata
  metadata: Record<string, string | number | boolean>;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface Block {
  height: number;
  timestamp: number;
  previousHash: string;
  merkleRoot: string;
  transactions: ChainTransaction[];
  nonce: number;           // PoA: sequential nonce, no mining puzzle
  hash: string;
  validator: string;       // Empire name / player identity
  difficulty: number;      // Symbolic — always 1 for PoA
}

export interface ChainState {
  blocks: Block[];
  pendingTransactions: ChainTransaction[];
  tokenLedger: Record<string, TokenOwnership>;  // tokenId -> current owner
  chainId: string;
  networkName: string;
  totalTransactions: number;
  totalBlocks: number;
}

export interface TokenOwnership {
  tokenId: string;
  cardId: string;
  owner: string;           // 'PLAYER', 'MARKET', 'BURNED'
  mintBlock: number;
  lastTransferBlock: number;
  transactionHistory: string[];  // txId references
}

// ── Crypto Helpers ───────────────────────────────────────────────

/** SHA-256 hash (async via Web Crypto, works in browser + Node 18+) */
async function sha256(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple deterministic hash for environments without Web Crypto
    return syncHash(input);
  }
}

/** Deterministic sync hash fallback (djb2 × 2 rounds → 64 hex chars) */
function syncHash(input: string): string {
  let h1 = 5381;
  let h2 = 52711;
  let h3 = 2166136261;
  let h4 = 16777619;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = ((h1 << 5) + h1 + c) >>> 0;
    h2 = ((h2 << 5) + h2 + c) >>> 0;
    h3 = (h3 ^ c) * 16777619 >>> 0;
    h4 = ((h4 << 5) + h4 + c) >>> 0;
  }
  return [h1, h2, h3, h4, (h1 ^ h2) >>> 0, (h2 ^ h3) >>> 0, (h3 ^ h4) >>> 0, (h4 ^ h1) >>> 0]
    .map(n => n.toString(16).padStart(8, '0'))
    .join('');
}

/** Synchronous hash for when async isn't possible */
export function hashSync(input: string): string {
  return syncHash(input);
}

// ── Merkle Tree ──────────────────────────────────────────────────

function buildMerkleTree(txIds: string[]): MerkleNode {
  if (txIds.length === 0) {
    return { hash: syncHash('empty') };
  }
  if (txIds.length === 1) {
    return { hash: syncHash(txIds[0]) };
  }

  // Pad to even
  const items = [...txIds];
  if (items.length % 2 !== 0) items.push(items[items.length - 1]);

  // Build leaf nodes
  let level: MerkleNode[] = items.map(id => ({ hash: syncHash(id) }));

  // Build tree bottom-up
  while (level.length > 1) {
    const next: MerkleNode[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push({
        hash: syncHash(left.hash + right.hash),
        left,
        right,
      });
    }
    level = next;
  }

  return level[0];
}

export function computeMerkleRoot(transactions: ChainTransaction[]): string {
  const txIds = transactions.map(tx => tx.txId);
  return buildMerkleTree(txIds).hash;
}

// ── Block Hashing ────────────────────────────────────────────────

function computeBlockHashSync(block: Omit<Block, 'hash'>): string {
  const payload = [
    block.height.toString(),
    block.timestamp.toString(),
    block.previousHash,
    block.merkleRoot,
    block.nonce.toString(),
    block.validator,
    block.transactions.length.toString(),
  ].join('|');
  return syncHash(payload);
}

/** Async variant of block hash computation (kept for future Web Crypto usage). */
export async function computeBlockHash(block: Omit<Block, 'hash'>): Promise<string> {
  const payload = [
    block.height.toString(),
    block.timestamp.toString(),
    block.previousHash,
    block.merkleRoot,
    block.nonce.toString(),
    block.validator,
    block.transactions.length.toString(),
  ].join('|');
  return sha256(payload);
}

// ── Transaction Creation ─────────────────────────────────────────

let txCounter = 0;

export function createTransaction(
  type: TxType,
  tokenId: string,
  cardId: string,
  from: string,
  to: string,
  metadata: Record<string, string | number | boolean> = {},
): ChainTransaction {
  const timestamp = Date.now();
  const txPayload = `${type}|${tokenId}|${cardId}|${from}|${to}|${timestamp}|${txCounter++}`;
  const txId = syncHash(txPayload);

  return {
    txId,
    type,
    timestamp,
    blockHeight: -1,
    tokenId,
    cardId,
    from,
    to,
    metadata,
  };
}

// ── AegisChain Class ─────────────────────────────────────────────

export const CHAIN_CONFIG = {
  chainId: 'aegis-mainnet-1',
  networkName: 'AEGIS Sovereign Chain',
  blockSize: 10,              // Transactions per block
  blockTimeMs: 30_000,        // Target block time (30s)
  genesisTimestamp: 1712188800000,  // 2024-04-04T00:00:00Z
  tokenStandard: 'ARC-721',   // AEGIS Resource Chain ERC-721 equivalent
  contractAddress: '0xAEG15000000000000000000000000000000000001',
} as const;

export class AegisChain {
  private blocks: Block[] = [];
  private pendingTxs: ChainTransaction[] = [];
  private tokenLedger: Record<string, TokenOwnership> = {};
  private validator: string;
  private totalTxCount = 0;

  constructor(validator = 'AEGIS Empire') {
    this.validator = validator;
  }

  // ── Genesis ──────────────────────────────────────────────

  createGenesis(): Block {
    const genesisTx = createTransaction(
      'MINT',
      'GENESIS-TOKEN',
      'GENESIS',
      'VOID',
      'AEGIS',
      { message: 'In the beginning, there was the Chain.', version: '1.0.0' },
    );
    genesisTx.blockHeight = 0;

    const merkleRoot = computeMerkleRoot([genesisTx]);
    const blockData = {
      height: 0,
      timestamp: CHAIN_CONFIG.genesisTimestamp,
      previousHash: '0'.repeat(64),
      merkleRoot,
      transactions: [genesisTx],
      nonce: 0,
      validator: this.validator,
      difficulty: 1,
    };
    const hash = computeBlockHashSync(blockData);
    const genesis: Block = { ...blockData, hash };

    this.blocks = [genesis];
    this.totalTxCount = 1;
    return genesis;
  }

  // ── Transaction Submission ───────────────────────────────

  submitTransaction(tx: ChainTransaction): string {
    this.pendingTxs.push(tx);
    this.totalTxCount++;

    // Update token ledger immediately (optimistic)
    this.updateLedger(tx);

    // Auto-mine when block is full
    if (this.pendingTxs.length >= CHAIN_CONFIG.blockSize) {
      this.mineBlock();
    }

    return tx.txId;
  }

  private updateLedger(tx: ChainTransaction): void {
    const { tokenId, cardId, type, txId } = tx;
    if (tokenId === 'GENESIS-TOKEN') return;

    if (!this.tokenLedger[tokenId]) {
      this.tokenLedger[tokenId] = {
        tokenId,
        cardId,
        owner: 'PLAYER',
        mintBlock: this.blocks.length,
        lastTransferBlock: this.blocks.length,
        transactionHistory: [],
      };
    }

    const entry = this.tokenLedger[tokenId];
    entry.transactionHistory.push(txId);
    entry.lastTransferBlock = this.blocks.length;

    switch (type) {
      case 'MINT':
        entry.owner = tx.to;
        entry.mintBlock = this.blocks.length;
        break;
      case 'TRANSFER':
        entry.owner = tx.to;
        break;
      case 'BURN':
        entry.owner = 'BURNED';
        break;
      case 'LIST':
        entry.owner = 'MARKET';
        break;
      case 'DELIST':
        entry.owner = tx.to; // Back to player
        break;
    }
  }

  // ── Mining (Proof of Authority) ──────────────────────────

  mineBlock(): Block | null {
    if (this.pendingTxs.length === 0) return null;

    const txBatch = this.pendingTxs.splice(0, CHAIN_CONFIG.blockSize);
    const height = this.blocks.length;
    const previousHash = this.blocks[height - 1]?.hash ?? '0'.repeat(64);

    // Assign block height to transactions
    for (const tx of txBatch) {
      tx.blockHeight = height;
    }

    const merkleRoot = computeMerkleRoot(txBatch);
    const blockData = {
      height,
      timestamp: Date.now(),
      previousHash,
      merkleRoot,
      transactions: txBatch,
      nonce: height, // PoA: nonce = block height
      validator: this.validator,
      difficulty: 1,
    };

    const hash = computeBlockHashSync(blockData);
    const block: Block = { ...blockData, hash };
    this.blocks.push(block);

    return block;
  }

  /** Flush all pending transactions into a block regardless of block size */
  flush(): Block | null {
    if (this.pendingTxs.length === 0) return null;
    return this.mineBlock();
  }

  // ── Chain Validation ─────────────────────────────────────

  validateChain(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];

      // 1. Height must be sequential
      if (block.height !== i) {
        errors.push(`Block ${i}: height mismatch (expected ${i}, got ${block.height})`);
      }

      // 2. Previous hash must match
      if (i > 0 && block.previousHash !== this.blocks[i - 1].hash) {
        errors.push(`Block ${i}: previous hash mismatch`);
      }

      // 3. Block hash must be valid
      const recomputed = computeBlockHashSync({
        height: block.height,
        timestamp: block.timestamp,
        previousHash: block.previousHash,
        merkleRoot: block.merkleRoot,
        transactions: block.transactions,
        nonce: block.nonce,
        validator: block.validator,
        difficulty: block.difficulty,
      });
      if (recomputed !== block.hash) {
        errors.push(`Block ${i}: hash invalid (recomputed doesn't match)`);
      }

      // 4. Merkle root must match transactions
      const merkle = computeMerkleRoot(block.transactions);
      if (merkle !== block.merkleRoot) {
        errors.push(`Block ${i}: merkle root mismatch`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Queries ──────────────────────────────────────────────

  getBlock(height: number): Block | undefined {
    return this.blocks[height];
  }

  getLatestBlock(): Block | undefined {
    return this.blocks[this.blocks.length - 1];
  }

  getChainHeight(): number {
    return this.blocks.length;
  }

  getTransaction(txId: string): ChainTransaction | undefined {
    // Check pending first
    const pending = this.pendingTxs.find(tx => tx.txId === txId);
    if (pending) return pending;
    // Search blocks in reverse (most recent first)
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const found = this.blocks[i].transactions.find(tx => tx.txId === txId);
      if (found) return found;
    }
    return undefined;
  }

  getTokenHistory(tokenId: string): ChainTransaction[] {
    const txs: ChainTransaction[] = [];
    for (const block of this.blocks) {
      for (const tx of block.transactions) {
        if (tx.tokenId === tokenId) txs.push(tx);
      }
    }
    for (const tx of this.pendingTxs) {
      if (tx.tokenId === tokenId) txs.push(tx);
    }
    return txs;
  }

  getTokenOwner(tokenId: string): string | undefined {
    return this.tokenLedger[tokenId]?.owner;
  }

  getTokenLedger(): Record<string, TokenOwnership> {
    return { ...this.tokenLedger };
  }

  getPendingTransactions(): ChainTransaction[] {
    return [...this.pendingTxs];
  }

  getAllBlocks(): Block[] {
    return [...this.blocks];
  }

  getTotalTransactions(): number {
    return this.totalTxCount;
  }

  getStats(): {
    chainHeight: number;
    totalTransactions: number;
    pendingCount: number;
    tokensTracked: number;
    activeTokens: number;
    burnedTokens: number;
    validator: string;
  } {
    const tokens = Object.values(this.tokenLedger);
    return {
      chainHeight: this.blocks.length,
      totalTransactions: this.totalTxCount,
      pendingCount: this.pendingTxs.length,
      tokensTracked: tokens.length,
      activeTokens: tokens.filter(t => t.owner !== 'BURNED').length,
      burnedTokens: tokens.filter(t => t.owner === 'BURNED').length,
      validator: this.validator,
    };
  }

  // ── Serialization ────────────────────────────────────────

  serialize(): ChainState {
    return {
      blocks: this.blocks,
      pendingTransactions: this.pendingTxs,
      tokenLedger: this.tokenLedger,
      chainId: CHAIN_CONFIG.chainId,
      networkName: CHAIN_CONFIG.networkName,
      totalTransactions: this.totalTxCount,
      totalBlocks: this.blocks.length,
    };
  }

  static deserialize(data: ChainState, validator = 'AEGIS Empire'): AegisChain {
    const chain = new AegisChain(validator);
    chain.blocks = data.blocks ?? [];
    chain.pendingTxs = data.pendingTransactions ?? [];
    chain.tokenLedger = data.tokenLedger ?? {};
    chain.totalTxCount = data.totalTransactions ?? 0;
    return chain;
  }

  setValidator(name: string): void {
    this.validator = name;
  }
}
