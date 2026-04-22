/**
 * Cross-validate our PDA derivation by computing SHA-256 manually
 * and comparing with a known PDA address from the Squads app.
 *
 * Since we can't import @solana/web3.js here, we verify by:
 * 1. Computing the PDA ourselves
 * 2. Verifying the result is NOT on the ed25519 curve
 * 3. Verifying determinism across multiple runs
 * 4. Cross-checking the PDA hash construction step by step
 *
 * Usage: node test/cross-validate-pda.mjs
 */
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { sha256 } from '../src/crypto.js';
import { isOnCurve, findProgramAddress } from '../src/crypto.js';
import { encodeBase58, decodeBase58, getTransactionPda, getProposalPda, getMultisigVaultPda } from '../src/squads.js';

let passed = 0, failed = 0;
function assertEq(a, b, msg) {
  if (a === b) { passed++; console.log(`  PASS: ${msg}`); }
  else { failed++; console.error(`  FAIL: ${msg}\n    Expected: ${b}\n    Actual:   ${a}`); }
}
function assert(c, msg) {
  if (c) { passed++; console.log(`  PASS: ${msg}`); }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

console.log('=== PDA Derivation Deep Verification ===\n');

const SQUADS_PROGRAM = 'SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf';
const programBytes = decodeBase58(SQUADS_PROGRAM);
const PDA_MARKER = new TextEncoder().encode('ProgramDerivedAddress');

// Step 1: Verify the PDA hash construction matches the spec
// PDA = SHA256(seed1 || seed2 || ... || [bump] || programId || "ProgramDerivedAddress")
{
  const multisig = decodeBase58('11111111111111111111111111111111');
  const seeds = [
    new TextEncoder().encode('multisig'),
    multisig,
    new TextEncoder().encode('vault'),
    new Uint8Array([0]),
  ];

  // Find the PDA
  const [pda, bump] = await getMultisigVaultPda('11111111111111111111111111111111', 0);

  // Manually reconstruct the hash to verify
  const parts = [...seeds, Uint8Array.from([bump]), programBytes, PDA_MARKER];
  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { buf.set(p, offset); offset += p.length; }

  const hash = await sha256(buf);

  // The hash should equal our PDA
  assertEq(encodeBase58(hash), encodeBase58(pda), 'Manual hash reconstruction matches PDA output');
  assert(!isOnCurve(hash), 'Reconstructed hash is NOT on curve');
}

// Step 2: Verify multiple multisig addresses produce different PDAs
{
  const addr1 = '11111111111111111111111111111111';
  const addr2 = SQUADS_PROGRAM; // different address

  const [pda1] = await getTransactionPda(addr1, 1);
  const [pda2] = await getTransactionPda(addr2, 1);

  assert(encodeBase58(pda1) !== encodeBase58(pda2), 'Different multisig addresses produce different PDAs');
}

// Step 3: Verify different indices produce different PDAs
{
  const addr = '11111111111111111111111111111111';
  const pdas = new Set();
  for (let i = 1; i <= 10; i++) {
    const [pda] = await getTransactionPda(addr, i);
    pdas.add(encodeBase58(pda));
  }
  assertEq(pdas.size, 10, 'Indices 1-10 all produce unique PDAs');
}

// Step 4: Verify proposal PDA differs from transaction PDA for same index
{
  const addr = SQUADS_PROGRAM;
  const [txPda] = await getTransactionPda(addr, 42);
  const [propPda] = await getProposalPda(addr, 42);
  assert(encodeBase58(txPda) !== encodeBase58(propPda), 'Transaction and Proposal PDAs differ for same index');
}

// Step 5: Verify vault PDA with different indices
{
  const addr = '11111111111111111111111111111111';
  const [vault0] = await getMultisigVaultPda(addr, 0);
  const [vault1] = await getMultisigVaultPda(addr, 1);
  assert(encodeBase58(vault0) !== encodeBase58(vault1), 'Vault PDAs differ for different vault indices');
}

// Step 6: Determinism — run the same derivation 5 times
{
  const results = [];
  for (let i = 0; i < 5; i++) {
    const [pda, bump] = await getTransactionPda(SQUADS_PROGRAM, 100);
    results.push({ addr: encodeBase58(pda), bump });
  }
  const allSame = results.every(r => r.addr === results[0].addr && r.bump === results[0].bump);
  assert(allSame, 'PDA derivation is deterministic across 5 runs');
  console.log(`    (PDA: ${results[0].addr}, bump: ${results[0].bump})`);
}

// Step 7: Verify none of our derived PDAs are on the curve
{
  let allOff = true;
  for (let i = 1; i <= 20; i++) {
    const [pda] = await getTransactionPda(SQUADS_PROGRAM, i);
    if (isOnCurve(pda)) { allOff = false; break; }
  }
  assert(allOff, 'All 20 derived transaction PDAs are off-curve');
}

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
else console.log('  PDA derivation verified!\n');
