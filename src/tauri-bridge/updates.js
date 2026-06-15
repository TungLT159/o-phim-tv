import { isTauri } from './index';

let currentState = { status: 'idle' };
const stateListeners = new Set();

function notifyState(newState) {
  currentState = newState;
  stateListeners.forEach(fn => fn(newState));
}

export const updatesBridge = {
  check: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.check) return window.ophimUpdates.check();
      return { status: 'disabled' };
    }
    notifyState({ status: 'checking' });
    return currentState;
  },
  download: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.download) return window.ophimUpdates.download();
      return currentState;
    }
    notifyState({ status: 'download-progress', percent: 0 });
    return currentState;
  },
  install: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.install) return window.ophimUpdates.install();
      return currentState;
    }
    return currentState;
  },
  getState: async () => {
    if (!isTauri()) {
      if (window.ophimUpdates?.getState) return window.ophimUpdates.getState();
      return currentState;
    }
    return currentState;
  },
  onStateChange: (listener) => {
    stateListeners.add(listener);
    return () => stateListeners.delete(listener);
  },
};
