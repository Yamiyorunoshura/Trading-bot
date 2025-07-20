import '@testing-library/jest-dom';

// 簡化的Mock設置，避免類型衝突
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {},
  writable: true
});

Object.defineProperty(window, '__TAURI__', {
  value: {
    tauri: {
      invoke: jest.fn(),
    },
    event: {
      listen: jest.fn(),
    },
  },
  writable: true
});

// Mock WebSocket
Object.defineProperty(window, 'WebSocket', {
  value: class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    
    send = jest.fn();
    close = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    
    constructor() {
      // Mock constructor
    }
  },
  writable: true
}); 