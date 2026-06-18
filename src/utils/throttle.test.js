import { throttle } from './throttle';

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('input validation', () => {
    it('should throw TypeError if func is not a function', () => {
      expect(() => throttle(null, 100)).toThrow(TypeError);
      expect(() => throttle(null, 100)).toThrow('Expected a function');
      expect(() => throttle('not a function', 100)).toThrow(TypeError);
      expect(() => throttle(123, 100)).toThrow(TypeError);
    });

    it('should throw TypeError if wait is not a number', () => {
      const func = jest.fn();
      expect(() => throttle(func, 'not a number')).toThrow(TypeError);
      expect(() => throttle(func, 'not a number')).toThrow('Expected a non-negative number for wait');
      expect(() => throttle(func, null)).toThrow(TypeError);
    });

    it('should throw TypeError if wait is negative', () => {
      const func = jest.fn();
      expect(() => throttle(func, -1)).toThrow(TypeError);
      expect(() => throttle(func, -100)).toThrow(TypeError);
    });

    it('should accept wait=0', () => {
      const func = jest.fn();
      expect(() => throttle(func, 0)).not.toThrow();
    });
  });

  describe('throttling behavior', () => {
    it('should execute function immediately on first call', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled();
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('should limit execution frequency for rapid calls', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      // First call - immediate
      throttled();
      expect(func).toHaveBeenCalledTimes(1);

      // Rapid calls within throttle window
      throttled();
      throttled();
      throttled();
      expect(func).toHaveBeenCalledTimes(1); // Still only 1

      // Advance time by 50ms - still within window
      jest.advanceTimersByTime(50);
      throttled();
      expect(func).toHaveBeenCalledTimes(1);

      // Advance remaining time to trigger trailing execution
      jest.advanceTimersByTime(50);
      expect(func).toHaveBeenCalledTimes(2);
    });

    it('should execute trailing call after wait period', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled(); // Immediate
      expect(func).toHaveBeenCalledTimes(1);

      throttled(); // Queued
      expect(func).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(2); // Trailing execution
    });

    it('should allow execution after full wait period', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled();
      expect(func).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      
      throttled();
      expect(func).toHaveBeenCalledTimes(2);
    });

    it('should handle wait=0 by executing immediately', () => {
      const func = jest.fn();
      const throttled = throttle(func, 0);

      throttled();
      throttled();
      throttled();

      // With wait=0, all calls should execute immediately
      expect(func).toHaveBeenCalledTimes(3);
    });
  });

  describe('context and arguments', () => {
    it('should preserve function context (this)', () => {
      const context = { value: 42 };
      const func = jest.fn(function() {
        return this.value;
      });
      const throttled = throttle(func, 100);

      throttled.call(context);
      expect(func).toHaveBeenCalledTimes(1);
      expect(func.mock.instances[0]).toBe(context);
    });

    it('should pass arguments correctly', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled('arg1', 'arg2', 'arg3');
      expect(func).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should pass arguments from when timeout was set to trailing execution', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled('first'); // Immediate execution
      throttled('second'); // Sets timeout with 'second' args
      throttled('third'); // Timeout already set, ignored

      jest.advanceTimersByTime(100);

      expect(func).toHaveBeenCalledTimes(2);
      expect(func).toHaveBeenNthCalledWith(1, 'first');
      expect(func).toHaveBeenNthCalledWith(2, 'second'); // Args from when timeout was set
    });
  });

  describe('edge cases', () => {
    it('should handle clock adjustment (remaining > wait)', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled();
      expect(func).toHaveBeenCalledTimes(1);

      // Simulate clock adjustment by mocking Date.now
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() - 200); // Go back in time

      throttled();
      expect(func).toHaveBeenCalledTimes(2); // Should execute immediately

      Date.now = originalDateNow;
    });

    it('should cancel pending timeout if new immediate execution occurs', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled(); // Immediate
      expect(func).toHaveBeenCalledTimes(1);
      
      throttled(); // Queued for trailing execution
      expect(func).toHaveBeenCalledTimes(1);
      
      // Advance time to make next call immediate (>= 100ms from previous)
      jest.advanceTimersByTime(100);

      throttled(); // Should execute immediately and cancel previous timeout
      expect(func).toHaveBeenCalledTimes(2); // Only 2 calls: first immediate + second immediate (trailing was cancelled)
    });

    it('should not execute multiple times if called once', () => {
      const func = jest.fn();
      const throttled = throttle(func, 100);

      throttled();
      
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(100);

      expect(func).toHaveBeenCalledTimes(1); // Only the immediate call
    });
  });

  describe('return value behavior', () => {
    it('should not return function result (return values are discarded)', () => {
      const func = jest.fn(() => 'result');
      const throttled = throttle(func, 100);

      const result = throttled();
      expect(result).toBeUndefined();
    });
  });
});
