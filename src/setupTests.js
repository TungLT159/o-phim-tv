const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.warn = (...args) => {
    const message = String(args[0] || "");
    if (message.includes("React Router Future Flag Warning")) {
      return;
    }

    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.warn = originalConsoleWarn;
});
