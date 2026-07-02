const DEFAULT_SESSION = {
  query: "",
  results: [],
  searched: false,
  lastFocusedSlug: "",
  scrollY: 0,
};

let tvSearchSession = createSessionSnapshot(DEFAULT_SESSION);

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeScrollY(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function cloneResult(result) {
  return result && typeof result === "object" ? { ...result } : result;
}

function normalizeResults(value) {
  return Array.isArray(value) ? value.map(cloneResult) : [];
}

function createSessionSnapshot(session) {
  return {
    query: normalizeString(session.query),
    results: normalizeResults(session.results),
    searched: session.searched === true,
    lastFocusedSlug: normalizeString(session.lastFocusedSlug),
    scrollY: normalizeScrollY(session.scrollY),
  };
}

export function getTvSearchSession() {
  return createSessionSnapshot(tvSearchSession);
}

export function saveTvSearchSession(patch = {}) {
  tvSearchSession = createSessionSnapshot({
    ...tvSearchSession,
    ...patch,
  });

  return getTvSearchSession();
}

export function clearTvSearchSession() {
  tvSearchSession = createSessionSnapshot(DEFAULT_SESSION);
}
