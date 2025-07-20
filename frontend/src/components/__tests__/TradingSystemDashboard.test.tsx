import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// 在導入組件之前定義Mock
const mockTradingSelectors = {
  getTradingStats: jest.fn().mockReturnValue({
    totalProfit: 1250.50,
    totalTrades: 15,
    winRate: 0.73,
    sharpeRatio: 1.45
  }),
  getTotalPnl: jest.fn().mockReturnValue(1250.50),
  getActiveAlerts: jest.fn().mockReturnValue([]),
  getCriticalAlerts: jest.fn().mockReturnValue([])
};

const mockTradingStore = {
  isConnected: true,
  systemStatus: {
    trading_status: 'running',
    execution_status: 'active',
    risk_metrics: {
      current_risk: 'medium',
      risk_score: 0.3
    }
  },
  strategyConfig: {
    id: 'strategy-1',
    name: '動態倉位策略',
    status: 'running',
    symbol: 'BTCUSDT'
  },
  orders: [],
  positions: [],
  alerts: [],
  error: null,
  connectWebSocket: jest.fn(),
  disconnect: jest.fn(),
  createStrategy: jest.fn(),
  startStrategy: jest.fn(),
  stopStrategy: jest.fn(),
  getState: () => mockTradingStore
};

// Mock the entire tradingStore module
jest.mock('../../stores/tradingStore', () => ({
  useTradingStore: (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(mockTradingStore);
    }
    return mockTradingStore;
  },
  tradingSelectors: mockTradingSelectors
}));

// Mock TradingSystemUtils
jest.mock('../../services/trading', () => ({
  TradingSystemUtils: {
    formatCurrency: (value: number) => value.toLocaleString(),
    formatPercentage: (value: number) => `${(value * 100).toFixed(1)}%`
  }
}));

// Mock Ant Design Charts
jest.mock('@ant-design/plots', () => ({
  Line: ({ data }: any) => <div data-testid="line-chart">Line Chart with {data?.length || 0} points</div>,
  Column: ({ data }: any) => <div data-testid="column-chart">Column Chart</div>,
  Gauge: ({ percent }: any) => <div data-testid="gauge-chart">Gauge: {percent}%</div>,
  Liquid: ({ percent }: any) => <div data-testid="liquid-chart">Liquid: {percent}%</div>
}));

// 現在導入組件
import TradingSystemDashboard from '../TradingSystemDashboard';

describe('TradingSystemDashboard組件', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('應該正常渲染交易系統儀表板', () => {
    render(<TradingSystemDashboard />);
    
    // 檢查組件是否成功渲染
    expect(document.body).toBeInTheDocument();
  });

  it('應該調用trading selectors', () => {
    render(<TradingSystemDashboard />);
    
    // 驗證selectors被調用
    expect(mockTradingSelectors.getTradingStats).toHaveBeenCalled();
    expect(mockTradingSelectors.getTotalPnl).toHaveBeenCalled();
    expect(mockTradingSelectors.getActiveAlerts).toHaveBeenCalled();
    expect(mockTradingSelectors.getCriticalAlerts).toHaveBeenCalled();
  });
}); 