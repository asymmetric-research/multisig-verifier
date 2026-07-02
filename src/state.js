/**
 * State management — localStorage hydration + in-memory state + setState()->render()
 */

const EXPLORER_URL = 'https://solscan.io';

const DEFAULTS = {
  rpcUrl: (typeof __RPC_URL__ !== 'undefined' && __RPC_URL__) ? __RPC_URL__ : 'https://api.mainnet-beta.solana.com',
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

  const savedAddress = localStorage.getItem('multisigAddress');

  // Clear any previously stored user-configurable values
  localStorage.removeItem('rpcUrl');
  localStorage.removeItem('explorerUrl');

  state = Object.freeze({
    // Persisted config
    rpcUrl: DEFAULTS.rpcUrl,
    explorerUrl: EXPLORER_URL,
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
  if ('multisigAddress' in partial) {
    localStorage.setItem('multisigAddress', partial.multisigAddress);
  }

  if (renderFn) renderFn();
}

export function getExplorerUrl(type, value) {
  if (type === 'tx') return `${EXPLORER_URL}/tx/${value}`;
  return `${EXPLORER_URL}/account/${value}`;
}
