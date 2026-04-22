/**
 * State management — localStorage hydration + in-memory state + setState()->render()
 */

const EXPLORER_ALLOWLIST = [
  'https://explorer.solana.com',
  'https://solscan.io',
  'https://xray.helius.xyz',
];

const DEFAULTS = {
  rpcUrl: '',
  explorerUrl: 'https://solscan.io',
  multisigAddress: '',
};

let state = {};
let renderFn = null;

function validateUrl(url, httpsOnly = true) {
  try {
    const parsed = new URL(url);
    if (httpsOnly && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function validateExplorerUrl(url) {
  const validated = validateUrl(url);
  if (!validated) return DEFAULTS.explorerUrl;
  // Check against allowlist
  if (EXPLORER_ALLOWLIST.some(allowed => validated.startsWith(allowed))) {
    return validated;
  }
  return DEFAULTS.explorerUrl;
}

export function init(render) {
  renderFn = render;

  const savedRpc = localStorage.getItem('rpcUrl');
  const savedExplorer = localStorage.getItem('explorerUrl');
  const savedAddress = localStorage.getItem('multisigAddress');

  state = Object.freeze({
    // Persisted config
    rpcUrl: validateUrl(savedRpc) || DEFAULTS.rpcUrl,
    explorerUrl: validateExplorerUrl(savedExplorer || DEFAULTS.explorerUrl),
    multisigAddress: savedAddress || '',

    // Runtime state (never persisted)
    multisig: null,
    proposals: [],
    proposalCursor: 0,
    expandedProposal: null,
    expandedTransaction: null,
    walletAccount: null,
    connectedWallet: null,
    loading: false,
    loadingProposals: false,
    loadingMore: false,
    loadingDetail: false,
    error: null,
    lastUpdated: null,
    showSettings: false,
    showWalletPicker: false,
  });

  render();
}

export function getState() {
  return state;
}

export function setState(partial) {
  state = Object.freeze({ ...state, ...partial });

  // Persist only config values
  if ('rpcUrl' in partial) {
    const validated = validateUrl(partial.rpcUrl);
    if (validated) {
      localStorage.setItem('rpcUrl', validated);
      if (validated !== partial.rpcUrl) {
        state = Object.freeze({ ...state, rpcUrl: validated });
      }
    } else {
      // Revert to previous valid URL
      state = Object.freeze({ ...state, rpcUrl: localStorage.getItem('rpcUrl') || DEFAULTS.rpcUrl });
    }
  }
  if ('explorerUrl' in partial) {
    const validated = validateExplorerUrl(partial.explorerUrl);
    localStorage.setItem('explorerUrl', validated);
    if (validated !== partial.explorerUrl) {
      state = Object.freeze({ ...state, explorerUrl: validated });
    }
  }
  if ('multisigAddress' in partial) {
    localStorage.setItem('multisigAddress', partial.multisigAddress);
  }

  if (renderFn) renderFn();
}

export function getExplorerUrl(type, value) {
  const base = state.explorerUrl;
  if (base.includes('solscan.io')) {
    if (type === 'tx') return `${base}/tx/${value}`;
    if (type === 'account') return `${base}/account/${value}`;
  }
  if (base.includes('explorer.solana.com')) {
    if (type === 'tx') return `${base}/tx/${value}`;
    if (type === 'address') return `${base}/address/${value}`;
  }
  if (base.includes('xray.helius.xyz')) {
    if (type === 'tx') return `${base}/tx/${value}`;
    if (type === 'account') return `${base}/account/${value}`;
  }
  return `${base}/account/${value}`;
}

export { EXPLORER_ALLOWLIST };
