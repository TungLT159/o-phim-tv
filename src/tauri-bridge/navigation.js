import { isTauri } from './index';

const listeners = new Set();

function notifyListeners(state) {
  listeners.forEach(fn => fn(state));
}

function getCurrentNavState() {
  return {
    canGoBack: window.history.length > 1,
    canGoForward: false,
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    notifyListeners(getCurrentNavState());
  });
}

export const navigationBridge = {
  back: async () => {
    if (isTauri()) {
      window.history.back();
    } else if (window.ophimNavigation?.back) {
      return window.ophimNavigation.back();
    }
    return getCurrentNavState();
  },
  forward: async () => {
    if (isTauri()) {
      window.history.forward();
    } else if (window.ophimNavigation?.forward) {
      return window.ophimNavigation.forward();
    }
    return getCurrentNavState();
  },
  reload: async () => {
    if (isTauri()) {
      window.location.reload();
    } else if (window.ophimNavigation?.reload) {
      return window.ophimNavigation.reload();
    }
    return getCurrentNavState();
  },
  getState: async () => {
    if (isTauri()) {
      return getCurrentNavState();
    }
    if (window.ophimNavigation?.getState) {
      return window.ophimNavigation.getState();
    }
    return getCurrentNavState();
  },
  onStateChange: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
