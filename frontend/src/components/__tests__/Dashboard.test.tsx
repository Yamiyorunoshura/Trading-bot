import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';

// Mock Zustand store
const mockAppStore = {
  connectionStatus: 'connected',
  systemStats: {
    uptime: '01:23:45',
    cpu_usage: 25.5,
    memory_usage: 45.2,
    active_strategies: 2
  },
  marketData: {
    'BTCUSDT': {
      symbol: 'BTCUSDT',
      price: 45000,
      change_24h: 2.5,
      volume: 1000000,
      timestamp: Date.now()
    }
  },
  initializeWebSocket: jest.fn(),
  updateConnectionStatus: jest.fn()
};

// Mock the store
jest.mock('../stores/appStore', () => ({
  useAppStore: (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(mockAppStore);
    }
    return mockAppStore;
  }
}));

describe('Dashboard組件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('應該正常渲染儀表板', () => {
    render(<Dashboard />);
    
    // 檢查標題是否存在
    expect(screen.getByText('量化交易系統')).toBeInTheDocument();
  });

  it('應該顯示系統統計信息', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      // 檢查系統統計卡片
      expect(screen.getByText('系統運行時間')).toBeInTheDocument();
      expect(screen.getByText('01:23:45')).toBeInTheDocument();
      expect(screen.getByText('CPU使用率')).toBeInTheDocument();
      expect(screen.getByText('25.5%')).toBeInTheDocument();
    });
  });

  it('應該顯示市場數據', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      // 檢查市場數據
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      expect(screen.getByText('45,000')).toBeInTheDocument();
      expect(screen.getByText('+2.5%')).toBeInTheDocument();
    });
  });

  it('應該顯示連接狀態', () => {
    render(<Dashboard />);
    
    // 檢查連接狀態指示器
    const connectionIndicator = screen.getByTestId('connection-status');
    expect(connectionIndicator).toBeInTheDocument();
  });

  it('應該在組件掛載時初始化WebSocket', () => {
    render(<Dashboard />);
    
    expect(mockAppStore.initializeWebSocket).toHaveBeenCalledTimes(1);
  });
}); 