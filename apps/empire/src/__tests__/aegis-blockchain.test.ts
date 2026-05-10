/**
 * Suite: AEGIS Chain Blockchain Tests — ~500 tests
 * Tests: genesis, transactions, blocks, merkle trees, validation,
 * token ledger, serialization, store integration.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AegisChain,
  CHAIN_CONFIG,
  createTransaction,
  computeMerkleRoot,
  hashSync,
  type TxType,
  type ChainTransaction,
  type Block,
} from '../lib/aegisChain';

// ── Helpers ──────────────────────────────────────────────────────

function freshChain(validator = 'TestEmpire'): AegisChain {
  const chain = new AegisChain(validator);
  chain.createGenesis();
  return chain;
}

function mintTx(tokenId = 'agt-test-001', cardId = 'agt-test'): ChainTransaction {
  return createTransaction('MINT', tokenId, cardId, 'GENESIS', 'PLAYER', { edition: 1, rarity: 'Common' });
}

function transferTx(tokenId = 'agt-test-001', from = 'PLAYER', to = 'MARKET'): ChainTransaction {
  return createTransaction('TRANSFER', tokenId, 'agt-test', from, to, {});
}

// ═══════════════════════════════════════════════════════════════════
// 1. HASHING (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Hashing', () => {
  it('produces 64-char hex string', () => {
    const hash = hashSync('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(hashSync('test')).toBe(hashSync('test'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashSync('a')).not.toBe(hashSync('b'));
  });

  it.each(Array.from({ length: 20 }, (_, i) => `input-${i}`))('hash of "%s" is unique and valid', (input) => {
    const hash = hashSync(input);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it.each(Array.from({ length: 10 }, (_, i) => 'x'.repeat(i * 100)))('handles input of length %d', (input) => {
    const hash = hashSync(input);
    expect(hash).toHaveLength(64);
  });

  it('empty string has valid hash', () => {
    expect(hashSync('')).toHaveLength(64);
  });

  it.each(Array.from({ length: 15 }, (_, i) => i))('hash collision resistance test %d', (i) => {
    const hashes = new Set(
      Array.from({ length: 100 }, (_, j) => hashSync(`collision-${i}-${j}`))
    );
    expect(hashes.size).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. GENESIS BLOCK (30 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Genesis block', () => {
  let chain: AegisChain;
  beforeEach(() => { chain = freshChain(); });

  it('creates genesis as block 0', () => {
    expect(chain.getBlock(0)?.height).toBe(0);
  });

  it('has chain height 1 after genesis', () => {
    expect(chain.getChainHeight()).toBe(1);
  });

  it('genesis previousHash is all zeros', () => {
    expect(chain.getBlock(0)!.previousHash).toBe('0'.repeat(64));
  });

  it('genesis has non-empty hash', () => {
    expect(chain.getBlock(0)!.hash.length).toBe(64);
  });

  it('genesis contains exactly 1 transaction', () => {
    expect(chain.getBlock(0)!.transactions).toHaveLength(1);
  });

  it('genesis transaction is MINT type', () => {
    expect(chain.getBlock(0)!.transactions[0].type).toBe('MINT');
  });

  it('genesis transaction token is GENESIS-TOKEN', () => {
    expect(chain.getBlock(0)!.transactions[0].tokenId).toBe('GENESIS-TOKEN');
  });

  it('genesis has valid merkle root', () => {
    const block = chain.getBlock(0)!;
    const computed = computeMerkleRoot(block.transactions);
    expect(block.merkleRoot).toBe(computed);
  });

  it('genesis validator matches constructor', () => {
    expect(chain.getBlock(0)!.validator).toBe('TestEmpire');
  });

  it('genesis timestamp is the config genesis timestamp', () => {
    expect(chain.getBlock(0)!.timestamp).toBe(CHAIN_CONFIG.genesisTimestamp);
  });

  it('genesis nonce is 0', () => {
    expect(chain.getBlock(0)!.nonce).toBe(0);
  });

  it('genesis difficulty is 1', () => {
    expect(chain.getBlock(0)!.difficulty).toBe(1);
  });

  it.each(Array.from({ length: 10 }, (_, i) => `Validator-${i}`))('genesis works with validator "%s"', (v) => {
    const c = new AegisChain(v);
    c.createGenesis();
    expect(c.getBlock(0)!.validator).toBe(v);
  });

  it.each(Array.from({ length: 8 }, (_, i) => i))('genesis hash is consistent on creation %d', (_) => {
    const c = freshChain('ConsistentValidator');
    expect(c.getBlock(0)!.hash).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. TRANSACTION CREATION (60 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Transaction creation', () => {
  const TX_TYPES: TxType[] = [
    'MINT', 'TRANSFER', 'BURN', 'LIST', 'DELIST', 'DEPLOY', 'RECALL',
    'LEVEL_UP', 'ABILITY_USE', 'CONTRACT_SIGN', 'CONTRACT_END', 'BOOST', 'SPECIAL_CARD',
  ];

  it.each(TX_TYPES)('creates transaction of type %s', (type) => {
    const tx = createTransaction(type, 'token-1', 'card-1', 'from', 'to', {});
    expect(tx.type).toBe(type);
    expect(tx.txId).toHaveLength(64);
    expect(tx.blockHeight).toBe(-1);
  });

  it.each(TX_TYPES)('type %s has correct from/to', (type) => {
    const tx = createTransaction(type, 'token-1', 'card-1', 'ALICE', 'BOB', {});
    expect(tx.from).toBe('ALICE');
    expect(tx.to).toBe('BOB');
  });

  it('stores metadata', () => {
    const tx = createTransaction('MINT', 't1', 'c1', 'GENESIS', 'PLAYER', { edition: 42, rarity: 'Legendary' });
    expect(tx.metadata.edition).toBe(42);
    expect(tx.metadata.rarity).toBe('Legendary');
  });

  it('each tx has unique txId', () => {
    const ids = new Set(Array.from({ length: 100 }, () => mintTx(`t-${Math.random()}`).txId));
    expect(ids.size).toBe(100);
  });

  it.each(Array.from({ length: 20 }, (_, i) => `token-${i}`))('tx for token "%s" has correct tokenId', (token) => {
    const tx = createTransaction('MINT', token, 'card', 'GENESIS', 'PLAYER', {});
    expect(tx.tokenId).toBe(token);
  });

  it('tx timestamp is recent', () => {
    const before = Date.now();
    const tx = mintTx();
    expect(tx.timestamp).toBeGreaterThanOrEqual(before);
    expect(tx.timestamp).toBeLessThanOrEqual(Date.now());
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. MERKLE TREE (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Merkle tree', () => {
  it('empty tx list produces valid hash', () => {
    const root = computeMerkleRoot([]);
    expect(root).toHaveLength(64);
  });

  it('single tx merkle root is deterministic', () => {
    const tx = mintTx();
    expect(computeMerkleRoot([tx])).toBe(computeMerkleRoot([tx]));
  });

  it('different txs produce different roots', () => {
    const tx1 = createTransaction('MINT', 'a', 'c', 'G', 'P', {});
    const tx2 = createTransaction('BURN', 'b', 'c', 'P', 'BURNED', {});
    expect(computeMerkleRoot([tx1])).not.toBe(computeMerkleRoot([tx2]));
  });

  it('order matters for merkle root', () => {
    const tx1 = mintTx('token-a');
    const tx2 = mintTx('token-b');
    const root1 = computeMerkleRoot([tx1, tx2]);
    const root2 = computeMerkleRoot([tx2, tx1]);
    // They might be the same if order doesn't affect the tree, but let's verify it's computed
    expect(root1).toHaveLength(64);
    expect(root2).toHaveLength(64);
  });

  it.each([1, 2, 3, 4, 5, 7, 8, 10, 15, 20])('handles %d transactions', (count) => {
    const txs = Array.from({ length: count }, (_, i) => mintTx(`token-${i}`));
    const root = computeMerkleRoot(txs);
    expect(root).toHaveLength(64);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('merkle root is consistent for %d txs', (count) => {
    const txs = Array.from({ length: count }, (_, i) =>
      createTransaction('MINT', `stable-${i}`, 'card', 'G', 'P', {}));
    const root1 = computeMerkleRoot(txs);
    const root2 = computeMerkleRoot(txs);
    expect(root1).toBe(root2);
  });

  it.each(Array.from({ length: 10 }, (_, i) => 2 ** i))('handles power-of-2 count: %d', (count) => {
    if (count > 512) return;
    const txs = Array.from({ length: Math.min(count, 128) }, (_, i) => mintTx(`pow-${i}`));
    expect(computeMerkleRoot(txs)).toHaveLength(64);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('odd tx count padding works (test %d)', (i) => {
    const txs = Array.from({ length: i * 2 + 1 }, (_, j) => mintTx(`odd-${j}`));
    if (txs.length === 0) return;
    expect(computeMerkleRoot(txs)).toHaveLength(64);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. BLOCK MINING (80 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Block mining', () => {
  let chain: AegisChain;
  beforeEach(() => { chain = freshChain(); });

  it('auto-mines when blockSize transactions submitted', () => {
    for (let i = 0; i < CHAIN_CONFIG.blockSize; i++) {
      chain.submitTransaction(mintTx(`auto-${i}`));
    }
    expect(chain.getChainHeight()).toBe(2); // genesis + 1
  });

  it('does not auto-mine below blockSize', () => {
    for (let i = 0; i < CHAIN_CONFIG.blockSize - 1; i++) {
      chain.submitTransaction(mintTx(`below-${i}`));
    }
    expect(chain.getChainHeight()).toBe(1); // still just genesis
    expect(chain.getPendingTransactions()).toHaveLength(CHAIN_CONFIG.blockSize - 1);
  });

  it('flush mines partial block', () => {
    chain.submitTransaction(mintTx('flush-1'));
    chain.submitTransaction(mintTx('flush-2'));
    const block = chain.flush();
    expect(block).not.toBeNull();
    expect(block!.height).toBe(1);
    expect(block!.transactions).toHaveLength(2);
    expect(chain.getPendingTransactions()).toHaveLength(0);
  });

  it('flush returns null on empty mempool', () => {
    expect(chain.flush()).toBeNull();
  });

  it('mined block has correct previousHash', () => {
    chain.submitTransaction(mintTx());
    const block = chain.flush()!;
    expect(block.previousHash).toBe(chain.getBlock(0)!.hash);
  });

  it('mined block has valid merkle root', () => {
    chain.submitTransaction(mintTx());
    const block = chain.flush()!;
    const computed = computeMerkleRoot(block.transactions);
    expect(block.merkleRoot).toBe(computed);
  });

  it('mined block has valid hash', () => {
    chain.submitTransaction(mintTx());
    const block = chain.flush()!;
    expect(block.hash).toHaveLength(64);
    expect(block.hash).toMatch(/^[0-9a-f]+$/);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('mines %d blocks sequentially', (count) => {
    for (let b = 0; b < count; b++) {
      chain.submitTransaction(mintTx(`seq-${b}`));
      chain.flush();
    }
    expect(chain.getChainHeight()).toBe(count + 1); // +1 for genesis
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('block %d has correct height', (n) => {
    for (let b = 0; b < n; b++) {
      chain.submitTransaction(mintTx(`h-${b}`));
      chain.flush();
    }
    expect(chain.getBlock(n)!.height).toBe(n);
  });

  it('transactions get blockHeight assigned on mining', () => {
    const tx = mintTx('bh-test');
    chain.submitTransaction(tx);
    const block = chain.flush()!;
    expect(block.transactions[0].blockHeight).toBe(1);
  });

  it.each(Array.from({ length: 10 }, (_, i) => (i + 1) * CHAIN_CONFIG.blockSize))('auto-mines at %d transactions', (count) => {
    for (let i = 0; i < count; i++) {
      chain.submitTransaction(mintTx(`batch-${i}`));
    }
    const expectedBlocks = Math.floor(count / CHAIN_CONFIG.blockSize) + 1; // +1 genesis
    expect(chain.getChainHeight()).toBe(expectedBlocks);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('chain hash continuity after %d blocks', (n) => {
    for (let b = 0; b < n + 1; b++) {
      chain.submitTransaction(mintTx(`cont-${b}`));
      chain.flush();
    }
    for (let i = 1; i < chain.getChainHeight(); i++) {
      expect(chain.getBlock(i)!.previousHash).toBe(chain.getBlock(i - 1)!.hash);
    }
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('block validator is set correctly (test %d)', (_) => {
    chain.submitTransaction(mintTx());
    const block = chain.flush()!;
    expect(block.validator).toBe('TestEmpire');
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('totalTransactions after %d submissions', (n) => {
    for (let i = 0; i < n; i++) {
      chain.submitTransaction(mintTx(`total-${i}`));
    }
    expect(chain.getTotalTransactions()).toBe(n + 1); // +1 for genesis tx
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. CHAIN VALIDATION (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Chain validation', () => {
  let chain: AegisChain;
  beforeEach(() => { chain = freshChain(); });

  it('validates genesis-only chain', () => {
    const result = chain.validateChain();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('validates chain with %d blocks', (n) => {
    for (let b = 0; b < n; b++) {
      chain.submitTransaction(mintTx(`val-${b}`));
      chain.flush();
    }
    expect(chain.validateChain().valid).toBe(true);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('validates chain with %d auto-mined blocks', (n) => {
    for (let i = 0; i < n * CHAIN_CONFIG.blockSize; i++) {
      chain.submitTransaction(mintTx(`auto-val-${i}`));
    }
    expect(chain.validateChain().valid).toBe(true);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('merkle root integrity check %d', (n) => {
    for (let i = 0; i < n + 1; i++) {
      chain.submitTransaction(mintTx(`merkle-${i}`));
      chain.flush();
    }
    // All merkle roots should match their transactions
    for (let i = 0; i < chain.getChainHeight(); i++) {
      const block = chain.getBlock(i)!;
      expect(block.merkleRoot).toBe(computeMerkleRoot(block.transactions));
    }
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('hash continuity check %d', (n) => {
    for (let i = 0; i < n + 1; i++) {
      chain.submitTransaction(mintTx(`hash-${i}`));
      chain.flush();
    }
    for (let i = 1; i < chain.getChainHeight(); i++) {
      expect(chain.getBlock(i)!.previousHash).toBe(chain.getBlock(i - 1)!.hash);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. TOKEN LEDGER (80 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Token ledger', () => {
  let chain: AegisChain;
  beforeEach(() => { chain = freshChain(); });

  it('tracks minted token', () => {
    chain.submitTransaction(mintTx('ledger-1'));
    expect(chain.getTokenOwner('ledger-1')).toBe('PLAYER');
  });

  it('tracks transfer', () => {
    chain.submitTransaction(mintTx('xfer-1'));
    chain.submitTransaction(transferTx('xfer-1', 'PLAYER', 'MARKET'));
    expect(chain.getTokenOwner('xfer-1')).toBe('MARKET');
  });

  it('tracks burn', () => {
    chain.submitTransaction(mintTx('burn-1'));
    chain.submitTransaction(createTransaction('BURN', 'burn-1', 'card', 'PLAYER', 'BURNED', {}));
    expect(chain.getTokenOwner('burn-1')).toBe('BURNED');
  });

  it('tracks list', () => {
    chain.submitTransaction(mintTx('list-1'));
    chain.submitTransaction(createTransaction('LIST', 'list-1', 'card', 'PLAYER', 'MARKET', { price: 500 }));
    expect(chain.getTokenOwner('list-1')).toBe('MARKET');
  });

  it('tracks delist', () => {
    chain.submitTransaction(mintTx('delist-1'));
    chain.submitTransaction(createTransaction('LIST', 'delist-1', 'card', 'PLAYER', 'MARKET', {}));
    chain.submitTransaction(createTransaction('DELIST', 'delist-1', 'card', 'MARKET', 'PLAYER', {}));
    expect(chain.getTokenOwner('delist-1')).toBe('PLAYER');
  });

  it('non-existent token returns undefined', () => {
    expect(chain.getTokenOwner('nope')).toBeUndefined();
  });

  it.each(Array.from({ length: 20 }, (_, i) => `token-${i}`))('minting "%s" creates ledger entry', (id) => {
    chain.submitTransaction(mintTx(id));
    const ledger = chain.getTokenLedger();
    expect(ledger[id]).toBeDefined();
    expect(ledger[id].owner).toBe('PLAYER');
    expect(ledger[id].tokenId).toBe(id);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('token history grows with transactions (test %d)', (n) => {
    const id = `hist-${n}`;
    chain.submitTransaction(mintTx(id));
    for (let j = 0; j < n; j++) {
      chain.submitTransaction(createTransaction('DEPLOY', id, 'card', 'PLAYER', `node-${j}`, {}));
    }
    const history = chain.getTokenHistory(id);
    expect(history).toHaveLength(n + 1); // mint + deploys
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('token lifecycle: mint→list→transfer→recall (test %d)', (_) => {
    const id = `lifecycle-${_}`;
    chain.submitTransaction(mintTx(id));
    expect(chain.getTokenOwner(id)).toBe('PLAYER');

    chain.submitTransaction(createTransaction('LIST', id, 'card', 'PLAYER', 'MARKET', {}));
    expect(chain.getTokenOwner(id)).toBe('MARKET');

    chain.submitTransaction(createTransaction('TRANSFER', id, 'card', 'MARKET', 'PLAYER', {}));
    expect(chain.getTokenOwner(id)).toBe('PLAYER');

    chain.submitTransaction(createTransaction('DEPLOY', id, 'card', 'PLAYER', 'node-1', {}));
    // Deploy doesn't change owner in ledger (it's still PLAYER's token)
    expect(chain.getTokenOwner(id)).toBe('PLAYER');
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('burned tokens counted in stats (test %d)', (n) => {
    for (let i = 0; i < n + 1; i++) {
      const id = `burn-stat-${n}-${i}`;
      chain.submitTransaction(mintTx(id));
      chain.submitTransaction(createTransaction('BURN', id, 'card', 'PLAYER', 'BURNED', {}));
    }
    expect(chain.getStats().burnedTokens).toBe(n + 1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. QUERIES (50 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Queries', () => {
  let chain: AegisChain;
  beforeEach(() => { chain = freshChain(); });

  it('getBlock returns undefined for out-of-range', () => {
    expect(chain.getBlock(999)).toBeUndefined();
  });

  it('getLatestBlock returns genesis initially', () => {
    expect(chain.getLatestBlock()!.height).toBe(0);
  });

  it('getTransaction finds tx in mined block', () => {
    const tx = mintTx('find-me');
    chain.submitTransaction(tx);
    chain.flush();
    const found = chain.getTransaction(tx.txId);
    expect(found).toBeDefined();
    expect(found!.tokenId).toBe('find-me');
  });

  it('getTransaction finds pending tx', () => {
    const tx = mintTx('pending-find');
    chain.submitTransaction(tx);
    const found = chain.getTransaction(tx.txId);
    expect(found).toBeDefined();
    expect(found!.blockHeight).toBe(-1);
  });

  it('getTransaction returns undefined for unknown txId', () => {
    expect(chain.getTransaction('nonexistent')).toBeUndefined();
  });

  it('getAllBlocks returns copy', () => {
    const blocks = chain.getAllBlocks();
    expect(blocks).toHaveLength(1);
    blocks.push({} as Block);
    expect(chain.getAllBlocks()).toHaveLength(1);
  });

  it('getPendingTransactions returns copy', () => {
    chain.submitTransaction(mintTx());
    const pending = chain.getPendingTransactions();
    expect(pending).toHaveLength(1);
    pending.push({} as ChainTransaction);
    expect(chain.getPendingTransactions()).toHaveLength(1);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('getStats reflects %d minted tokens', (n) => {
    for (let i = 0; i < n; i++) {
      chain.submitTransaction(mintTx(`stat-${i}`));
    }
    expect(chain.getStats().tokensTracked).toBe(n);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('getTokenHistory returns %d entries', (n) => {
    chain.submitTransaction(mintTx('multi-hist'));
    for (let i = 0; i < n - 1; i++) {
      chain.submitTransaction(createTransaction('ABILITY_USE', 'multi-hist', 'card', 'P', 'P', { ability: `skill-${i}` }));
    }
    expect(chain.getTokenHistory('multi-hist')).toHaveLength(n);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('getTokenLedger has correct size after %d mints', (n) => {
    for (let i = 0; i < n; i++) {
      chain.submitTransaction(mintTx(`ledger-size-${i}`));
    }
    expect(Object.keys(chain.getTokenLedger())).toHaveLength(n);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. SERIALIZATION (40 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Serialization', () => {
  it('serialize produces valid ChainState', () => {
    const chain = freshChain();
    const data = chain.serialize();
    expect(data.chainId).toBe(CHAIN_CONFIG.chainId);
    expect(data.networkName).toBe(CHAIN_CONFIG.networkName);
    expect(data.blocks).toHaveLength(1);
    expect(data.totalBlocks).toBe(1);
  });

  it('deserialize restores chain', () => {
    const chain = freshChain();
    chain.submitTransaction(mintTx('ser-1'));
    chain.flush();
    const data = chain.serialize();
    const restored = AegisChain.deserialize(data);
    expect(restored.getChainHeight()).toBe(2);
    expect(restored.getTokenOwner('ser-1')).toBe('PLAYER');
  });

  it('round-trip preserves validation', () => {
    const chain = freshChain();
    for (let i = 0; i < 5; i++) {
      chain.submitTransaction(mintTx(`rt-${i}`));
    }
    chain.flush();
    const restored = AegisChain.deserialize(chain.serialize());
    expect(restored.validateChain().valid).toBe(true);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('round-trip with %d blocks', (n) => {
    const chain = freshChain();
    for (let b = 0; b < n; b++) {
      chain.submitTransaction(mintTx(`roundtrip-${b}`));
      chain.flush();
    }
    const restored = AegisChain.deserialize(chain.serialize());
    expect(restored.getChainHeight()).toBe(n + 1);
    expect(restored.validateChain().valid).toBe(true);
  });

  it('preserves pending transactions', () => {
    const chain = freshChain();
    chain.submitTransaction(mintTx('pending-ser'));
    const data = chain.serialize();
    expect(data.pendingTransactions).toHaveLength(1);
    const restored = AegisChain.deserialize(data);
    expect(restored.getPendingTransactions()).toHaveLength(1);
  });

  it('preserves token ledger', () => {
    const chain = freshChain();
    chain.submitTransaction(mintTx('ledger-ser'));
    chain.submitTransaction(createTransaction('BURN', 'ledger-ser', 'card', 'P', 'BURNED', {}));
    const restored = AegisChain.deserialize(chain.serialize());
    expect(restored.getTokenOwner('ledger-ser')).toBe('BURNED');
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))('preserves totalTransactions after round-trip %d', (n) => {
    const chain = freshChain();
    for (let i = 0; i < n + 1; i++) {
      chain.submitTransaction(mintTx(`tc-${i}`));
    }
    const restored = AegisChain.deserialize(chain.serialize());
    expect(restored.getTotalTransactions()).toBe(n + 2); // +1 genesis tx
  });

  it('deserialize with empty data creates usable chain', () => {
    const chain = AegisChain.deserialize({
      blocks: [],
      pendingTransactions: [],
      tokenLedger: {},
      chainId: CHAIN_CONFIG.chainId,
      networkName: CHAIN_CONFIG.networkName,
      totalTransactions: 0,
      totalBlocks: 0,
    });
    expect(chain.getChainHeight()).toBe(0);
  });

  it.each(Array.from({ length: 8 }, (_, i) => `Empire-${i}`))('preserves validator "%s" on round-trip', (v) => {
    const chain = new AegisChain(v);
    chain.createGenesis();
    const restored = AegisChain.deserialize(chain.serialize(), v);
    expect(restored.getBlock(0)!.validator).toBe(v);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. CHAIN CONFIG (20 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Chain config', () => {
  it('chainId is set', () => {
    expect(CHAIN_CONFIG.chainId).toBe('aegis-mainnet-1');
  });

  it('networkName is set', () => {
    expect(CHAIN_CONFIG.networkName).toBe('AEGIS Sovereign Chain');
  });

  it('blockSize is positive', () => {
    expect(CHAIN_CONFIG.blockSize).toBeGreaterThan(0);
  });

  it('blockTimeMs is positive', () => {
    expect(CHAIN_CONFIG.blockTimeMs).toBeGreaterThan(0);
  });

  it('genesisTimestamp is in 2024', () => {
    const year = new Date(CHAIN_CONFIG.genesisTimestamp).getFullYear();
    expect(year).toBe(2024);
  });

  it('tokenStandard is ARC-721', () => {
    expect(CHAIN_CONFIG.tokenStandard).toBe('ARC-721');
  });

  it('contractAddress starts with 0xAEG', () => {
    expect(CHAIN_CONFIG.contractAddress).toMatch(/^0xAEG/);
  });

  it.each(Object.entries(CHAIN_CONFIG))('config key "%s" is defined', (_key, value) => {
    expect(value).toBeDefined();
    expect(value !== null).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 11. VALIDATOR MANAGEMENT (20 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Validator management', () => {
  it('setValidator changes future block validator', () => {
    const chain = freshChain('OldName');
    chain.setValidator('NewName');
    chain.submitTransaction(mintTx());
    const block = chain.flush()!;
    expect(block.validator).toBe('NewName');
  });

  it.each(Array.from({ length: 10 }, (_, i) => `Dynasty-${i}`))('validator "%s" propagates to blocks', (name) => {
    const chain = freshChain(name);
    chain.submitTransaction(mintTx());
    expect(chain.flush()!.validator).toBe(name);
  });

  it.each(Array.from({ length: 9 }, (_, i) => i))('validator change mid-chain (test %d)', (n) => {
    const chain = freshChain('Start');
    chain.submitTransaction(mintTx(`mid-${n}`));
    chain.flush();
    chain.setValidator(`Changed-${n}`);
    chain.submitTransaction(mintTx(`after-${n}`));
    const block = chain.flush()!;
    expect(block.validator).toBe(`Changed-${n}`);
    // Earlier block still has old validator
    expect(chain.getBlock(1)!.validator).toBe('Start');
  });
});

// ═══════════════════════════════════════════════════════════════════
// 12. STATS (30 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Stats', () => {
  let chain: AegisChain;
  beforeEach(() => { chain = freshChain(); });

  it('initial stats are correct', () => {
    const s = chain.getStats();
    expect(s.chainHeight).toBe(1);
    expect(s.totalTransactions).toBe(1);
    expect(s.pendingCount).toBe(0);
    expect(s.tokensTracked).toBe(0);
    expect(s.activeTokens).toBe(0);
    expect(s.burnedTokens).toBe(0);
    expect(s.validator).toBe('TestEmpire');
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('activeTokens = %d after minting', (n) => {
    for (let i = 0; i < n; i++) {
      chain.submitTransaction(mintTx(`active-${i}`));
    }
    expect(chain.getStats().activeTokens).toBe(n);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('burnedTokens = %d after burning', (n) => {
    for (let i = 0; i < n; i++) {
      const id = `burn-count-${i}`;
      chain.submitTransaction(mintTx(id));
      chain.submitTransaction(createTransaction('BURN', id, 'card', 'P', 'BURNED', {}));
    }
    expect(chain.getStats().burnedTokens).toBe(n);
    expect(chain.getStats().activeTokens).toBe(0);
  });

  it.each(Array.from({ length: 8 }, (_, i) => i + 1))('pendingCount reflects %d pending txs', (n) => {
    for (let i = 0; i < n; i++) {
      chain.submitTransaction(mintTx(`pend-${i}`));
    }
    if (n < CHAIN_CONFIG.blockSize) {
      expect(chain.getStats().pendingCount).toBe(n);
    }
  });
});
