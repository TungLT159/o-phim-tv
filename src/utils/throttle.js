/**
 * Throttle function execution to limit call frequency
 * @param {Function} func - Function to throttle
 * @param {number} wait - Milliseconds to wait between calls
 * @returns {Function} Throttled function (return values are discarded)
 */
export function throttle(func, wait) {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }
  if (typeof wait !== 'number' || wait < 0) {
    throw new TypeError('Expected a non-negative number for wait');
  }

  let timeout = null;
  let previous = 0;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}
