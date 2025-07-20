"""
v1.03 增強型回測引擎

支持動態倉位策略、杠桿交易、參數優化等高級功能
"""

import logging
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor
import itertools
import json

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from strategies.base import BaseStrategy, StrategySignal, SignalType, PositionSide
from strategies.dynamic_position_config import DynamicPositionConfig, create_strategy_from_config
from .engine import BacktestEngine, BacktestConfig, BacktestResult, BacktestStatus

logger = logging.getLogger(__name__)


@dataclass 
class EnhancedBacktestConfig:
    """增強型回測配置"""
    
    # 基礎配置
    strategy_type: str  # 'sma_crossover' | 'dynamic_position'
    symbol: str
    timeframe: str = '1h'  # '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
    start_date: datetime = None
    end_date: datetime = None
    
    # 資金配置  
    initial_capital: float = 10000.0
    commission: float = 0.001  # 0.1%
    slippage: float = 0.0001   # 0.01%
    
    # 策略特定參數
    strategy_params: Dict[str, Any] = field(default_factory=dict)
    
    # 風險控制參數
    risk_params: Dict[str, float] = field(default_factory=lambda: {
        'max_position_size': 1.0,      # 最大倉位大小（倍數）
        'stop_loss': 0.05,             # 止損百分比
        'take_profit': 0.10,           # 止盈百分比  
        'max_drawdown': 0.15,          # 最大回撤限制
        'risk_per_trade': 0.02,        # 每筆交易風險
    })
    
    # 杠桿配置
    leverage_enabled: bool = False
    max_leverage: float = 1.0
    leverage_config: Dict[str, Any] = field(default_factory=dict)
    
    # 優化配置
    optimization_enabled: bool = False
    optimization_params: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """後初始化驗證"""
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValueError("開始日期必須早於結束日期")
        if self.initial_capital <= 0:
            raise ValueError("初始資金必須大於0")
        if not 0 <= self.commission <= 1:
            raise ValueError("手續費必須在0和1之間")
        
        # 設置默認策略參數
        if not self.strategy_params:
            self.strategy_params = self._get_default_strategy_params()
    
    def _get_default_strategy_params(self) -> Dict[str, Any]:
        """獲取默認策略參數"""
        if self.strategy_type == 'sma_crossover':
            return {
                'fast_period': 10,
                'slow_period': 20, 
                'signal_threshold': 0.001
            }
        elif self.strategy_type == 'dynamic_position':
            return {
                'risk_mode': 'balanced',
                'leverage_config': {
                    'max_leverage': self.max_leverage,
                    'leverage_usage_rate': 0.8,
                    'dynamic_leverage': True
                },
                'indicator_weights': {
                    'valuation_weight': 0.34,
                    'risk_adjusted_weight': 0.33,
                    'fundamental_weight': 0.33
                },
                'thresholds': {
                    'buy_start_percentile': 20.0,
                    'sell_start_percentile': 80.0,
                    'min_buy_ratio': 0.1,
                    'max_buy_ratio': 0.8
                }
            }
        return {}


@dataclass
class EnhancedBacktestResult(BacktestResult):
    """增強型回測結果"""
    
    # 杠桿相關指標
    leverage_stats: Dict[str, float] = field(default_factory=dict)
    max_leverage_used: float = 1.0
    avg_leverage_used: float = 1.0
    leverage_efficiency: float = 0.0
    
    # 高級風險指標  
    var_95: float = 0.0          # 95% VaR
    cvar_95: float = 0.0         # 95% CVaR
    calmar_ratio: float = 0.0    # 卡爾瑪比率
    omega_ratio: float = 0.0     # 歐米茄比率
    
    # 交易分析
    trade_analysis: Dict[str, Any] = field(default_factory=dict)
    monthly_returns: List[float] = field(default_factory=list)
    drawdown_periods: List[Dict] = field(default_factory=list)
    
    # 策略特定結果
    strategy_metrics: Dict[str, Any] = field(default_factory=dict)


class StrategyFactory:
    """策略工廠"""
    
    @staticmethod
    def create_strategy(config: EnhancedBacktestConfig) -> BaseStrategy:
        """創建策略實例"""
        
        if config.strategy_type == 'sma_crossover':
            return StrategyFactory._create_sma_strategy(config)
        elif config.strategy_type == 'dynamic_position':
            return StrategyFactory._create_dynamic_position_strategy(config)
        else:
            raise ValueError(f"不支持的策略類型: {config.strategy_type}")
    
    @staticmethod
    def _create_sma_strategy(config: EnhancedBacktestConfig) -> BaseStrategy:
        """創建SMA交叉策略"""
        try:
            from strategies.sma_crossover import SMACrossoverStrategy
            from strategies.base import StrategyConfig
            
            strategy_config = StrategyConfig(
                name=f"SMA_{config.strategy_params.get('fast_period', 10)}_{config.strategy_params.get('slow_period', 20)}",
                symbol=config.symbol,
                timeframe=config.timeframe,
                parameters=config.strategy_params,
                risk_params=config.risk_params,
                enabled=True,
            )
            
            return SMACrossoverStrategy(strategy_config)
        except ImportError:
            logger.error("SMA交叉策略模塊導入失敗")
            raise
    
    @staticmethod 
    def _create_dynamic_position_strategy(config: EnhancedBacktestConfig) -> BaseStrategy:
        """創建動態倉位策略"""
        try:
            # 合併杠桿配置
            leverage_config = config.leverage_config.copy()
            if config.leverage_enabled:
                leverage_config.update({
                    'max_leverage': config.max_leverage,
                    'leverage_usage_rate': leverage_config.get('leverage_usage_rate', 0.8),
                    'dynamic_leverage': leverage_config.get('dynamic_leverage', True)
                })
            
            # 創建動態倉位配置
            dp_config = DynamicPositionConfig(
                name=f"DynamicPosition_{config.symbol}_{config.strategy_params.get('risk_mode', 'balanced')}",
                symbol=config.symbol,
                timeframe=config.timeframe,
                risk_mode=config.strategy_params.get('risk_mode', 'balanced'),
                leverage_config=leverage_config,
                risk_params=config.risk_params,
                enabled=True
            )
            
            # 應用自定義權重
            if 'indicator_weights' in config.strategy_params:
                weights = config.strategy_params['indicator_weights']
                dp_config.indicator_weights.update(weights)
            
            # 應用自定義閾值
            if 'thresholds' in config.strategy_params:
                thresholds = config.strategy_params['thresholds']
                for key, value in thresholds.items():
                    setattr(dp_config, key, value)
            
            return create_strategy_from_config(dp_config)
            
        except Exception as e:
            logger.error(f"動態倉位策略創建失敗: {e}")
            raise


class EnhancedBacktestEngine:
    """增強型回測引擎"""
    
    def __init__(self, config: EnhancedBacktestConfig):
        """初始化增強型回測引擎"""
        self.config = config
        
        # 創建策略
        self.strategy = StrategyFactory.create_strategy(config)
        
        # 創建基礎回測配置
        base_config = BacktestConfig(
            strategy=self.strategy,
            start_date=config.start_date,
            end_date=config.end_date,
            initial_capital=config.initial_capital,
            commission=config.commission,
            slippage=config.slippage,
            max_position_size=config.risk_params.get('max_position_size', 0.95)
        )
        
        # 創建基礎回測引擎
        self.base_engine = BacktestEngine(base_config)
        
        # 增強功能組件
        self.leverage_tracker = LeverageTracker(config.max_leverage) if config.leverage_enabled else None
        self.risk_analyzer = RiskAnalyzer()
        self.performance_analyzer = PerformanceAnalyzer()
        
        # 狀態跟蹤
        self.status = BacktestStatus.NOT_STARTED
        self.current_trades = []
        self.leverage_history = []
        
        logger.info(f"增強型回測引擎初始化完成: {self.strategy.name}")
    
    async def run_backtest(self, data: pd.DataFrame) -> EnhancedBacktestResult:
        """運行增強型回測"""
        try:
            self.status = BacktestStatus.RUNNING
            logger.info(f"開始增強型回測: {self.strategy.name}")
            
            # 驗證數據
            self._validate_data(data)
            
            # 運行基礎回測
            base_result = self.base_engine.run(data)
            
            # 增強分析
            enhanced_metrics = await self._run_enhanced_analysis(data, base_result)
            
            # 創建增強型結果
            result = self._create_enhanced_result(base_result, enhanced_metrics)
            
            self.status = BacktestStatus.COMPLETED
            logger.info(f"增強型回測完成: {self.strategy.name}")
            
            return result
            
        except Exception as e:
            self.status = BacktestStatus.FAILED
            logger.error(f"增強型回測失敗: {e}")
            raise
    
    def _validate_data(self, data: pd.DataFrame) -> None:
        """驗證數據格式"""
        required_columns = ["open", "high", "low", "close", "volume"]
        missing_columns = [col for col in required_columns if col not in data.columns]
        
        if missing_columns:
            raise ValueError(f"數據缺少必要列: {missing_columns}")
        
        if len(data) < 100:
            raise ValueError("數據量不足，至少需要100條記錄")
        
        # 確保數據按時間排序
        if not data.index.is_monotonic_increasing:
            logger.warning("數據未按時間排序，將自動排序")
            data = data.sort_index()
    
    async def _run_enhanced_analysis(self, data: pd.DataFrame, base_result: BacktestResult) -> Dict[str, Any]:
        """運行增強分析"""
        enhanced_metrics = {}
        
        # 計算杠桿統計
        if self.leverage_tracker:
            enhanced_metrics['leverage_stats'] = self.leverage_tracker.get_statistics()
        
        # 計算高級風險指標
        enhanced_metrics['advanced_risk'] = self.risk_analyzer.calculate_advanced_metrics(
            base_result.daily_returns, base_result.equity_curve
        )
        
        # 計算績效分析
        enhanced_metrics['performance'] = self.performance_analyzer.analyze_performance(
            base_result.trades, base_result.equity_curve, data
        )
        
        # 策略特定分析
        if hasattr(self.strategy, 'get_strategy_metrics'):
            enhanced_metrics['strategy_metrics'] = self.strategy.get_strategy_metrics()
        
        return enhanced_metrics
    
    def _create_enhanced_result(self, base_result: BacktestResult, enhanced_metrics: Dict[str, Any]) -> EnhancedBacktestResult:
        """創建增強型結果"""
        
        # 從基礎結果復制所有字段
        enhanced_result = EnhancedBacktestResult(
            strategy_name=base_result.strategy_name,
            start_date=base_result.start_date,
            end_date=base_result.end_date,
            initial_capital=base_result.initial_capital,
            final_capital=base_result.final_capital,
            total_trades=base_result.total_trades,
            winning_trades=base_result.winning_trades,
            losing_trades=base_result.losing_trades,
            total_pnl=base_result.total_pnl,
            total_return=base_result.total_return,
            annual_return=base_result.annual_return,
            max_drawdown=base_result.max_drawdown,
            sharpe_ratio=base_result.sharpe_ratio,
            sortino_ratio=base_result.sortino_ratio,
            volatility=base_result.volatility,
            trades=base_result.trades,
            daily_returns=base_result.daily_returns,
            equity_curve=base_result.equity_curve,
        )
        
        # 添加增強指標
        if 'leverage_stats' in enhanced_metrics:
            enhanced_result.leverage_stats = enhanced_metrics['leverage_stats']
            enhanced_result.max_leverage_used = enhanced_metrics['leverage_stats'].get('max_leverage', 1.0)
            enhanced_result.avg_leverage_used = enhanced_metrics['leverage_stats'].get('avg_leverage', 1.0)
            enhanced_result.leverage_efficiency = enhanced_metrics['leverage_stats'].get('efficiency', 0.0)
        
        if 'advanced_risk' in enhanced_metrics:
            risk_metrics = enhanced_metrics['advanced_risk']
            enhanced_result.var_95 = risk_metrics.get('var_95', 0.0)
            enhanced_result.cvar_95 = risk_metrics.get('cvar_95', 0.0) 
            enhanced_result.calmar_ratio = risk_metrics.get('calmar_ratio', 0.0)
            enhanced_result.omega_ratio = risk_metrics.get('omega_ratio', 0.0)
        
        if 'performance' in enhanced_metrics:
            performance = enhanced_metrics['performance']
            enhanced_result.trade_analysis = performance.get('trade_analysis', {})
            enhanced_result.monthly_returns = performance.get('monthly_returns', [])
            enhanced_result.drawdown_periods = performance.get('drawdown_periods', [])
        
        enhanced_result.strategy_metrics = enhanced_metrics.get('strategy_metrics', {})
        
        return enhanced_result


class LeverageTracker:
    """杠桿跟蹤器"""
    
    def __init__(self, max_leverage: float):
        self.max_leverage = max_leverage
        self.leverage_history = []
        self.current_leverage = 1.0
    
    def update_leverage(self, leverage: float, timestamp: datetime):
        """更新杠桿使用記錄"""
        self.current_leverage = leverage
        self.leverage_history.append({
            'timestamp': timestamp,
            'leverage': leverage,
            'utilization': leverage / self.max_leverage
        })
    
    def get_statistics(self) -> Dict[str, float]:
        """獲取杠桿統計"""
        if not self.leverage_history:
            return {
                'max_leverage': 1.0,
                'avg_leverage': 1.0,
                'efficiency': 0.0,
                'utilization': 0.0
            }
        
        leverages = [record['leverage'] for record in self.leverage_history]
        utilizations = [record['utilization'] for record in self.leverage_history]
        
        return {
            'max_leverage': max(leverages),
            'avg_leverage': np.mean(leverages),
            'efficiency': np.mean(leverages) / self.max_leverage,
            'utilization': np.mean(utilizations),
            'volatility': np.std(leverages) if len(leverages) > 1 else 0.0
        }


class RiskAnalyzer:
    """風險分析器"""
    
    def calculate_advanced_metrics(self, daily_returns: List[float], equity_curve: List[float]) -> Dict[str, float]:
        """計算高級風險指標"""
        if not daily_returns or len(daily_returns) < 2:
            return {
                'var_95': 0.0,
                'cvar_95': 0.0,
                'calmar_ratio': 0.0,
                'omega_ratio': 0.0
            }
        
        returns_array = np.array(daily_returns)
        
        # 計算VaR和CVaR
        var_95 = np.percentile(returns_array, 5)
        cvar_95 = returns_array[returns_array <= var_95].mean() if len(returns_array[returns_array <= var_95]) > 0 else var_95
        
        # 計算卡爾瑪比率 (Calmar Ratio)
        annual_return = (equity_curve[-1] / equity_curve[0]) ** (252 / len(equity_curve)) - 1 if len(equity_curve) > 1 else 0
        max_drawdown = self._calculate_max_drawdown(equity_curve)
        calmar_ratio = annual_return / abs(max_drawdown) if max_drawdown != 0 else 0
        
        # 計算歐米茄比率 (Omega Ratio)
        threshold = 0.0  # 無風險利率
        gains = returns_array[returns_array > threshold]
        losses = returns_array[returns_array <= threshold]
        
        omega_ratio = 0.0
        if len(losses) > 0 and losses.sum() != 0:
            omega_ratio = gains.sum() / abs(losses.sum())
        
        return {
            'var_95': var_95,
            'cvar_95': cvar_95,
            'calmar_ratio': calmar_ratio,
            'omega_ratio': omega_ratio
        }
    
    def _calculate_max_drawdown(self, equity_curve: List[float]) -> float:
        """計算最大回撤"""
        if len(equity_curve) < 2:
            return 0.0
        
        peak = equity_curve[0]
        max_drawdown = 0.0
        
        for value in equity_curve:
            if value > peak:
                peak = value
            drawdown = (peak - value) / peak
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        return max_drawdown


class PerformanceAnalyzer:
    """績效分析器"""
    
    def analyze_performance(self, trades: List[Dict], equity_curve: List[float], data: pd.DataFrame) -> Dict[str, Any]:
        """分析績效表現"""
        
        # 交易分析
        trade_analysis = self._analyze_trades(trades)
        
        # 月度收益分析
        monthly_returns = self._calculate_monthly_returns(equity_curve, data.index)
        
        # 回撤期間分析
        drawdown_periods = self._analyze_drawdown_periods(equity_curve, data.index)
        
        return {
            'trade_analysis': trade_analysis,
            'monthly_returns': monthly_returns,
            'drawdown_periods': drawdown_periods
        }
    
    def _analyze_trades(self, trades: List[Dict]) -> Dict[str, Any]:
        """分析交易"""
        if not trades:
            return {}
        
        # 分離盈利和虧損交易
        profitable_trades = [t for t in trades if t.get('pnl', 0) > 0]
        losing_trades = [t for t in trades if t.get('pnl', 0) < 0]
        
        # 計算統計
        total_profit = sum(t.get('pnl', 0) for t in profitable_trades)
        total_loss = sum(t.get('pnl', 0) for t in losing_trades)
        
        analysis = {
            'total_trades': len(trades),
            'profitable_trades': len(profitable_trades),
            'losing_trades': len(losing_trades),
            'win_rate': len(profitable_trades) / len(trades) if trades else 0,
            'avg_profit': total_profit / len(profitable_trades) if profitable_trades else 0,
            'avg_loss': total_loss / len(losing_trades) if losing_trades else 0,
            'profit_factor': abs(total_profit / total_loss) if total_loss != 0 else float('inf'),
            'largest_win': max((t.get('pnl', 0) for t in profitable_trades), default=0),
            'largest_loss': min((t.get('pnl', 0) for t in losing_trades), default=0),
        }
        
        return analysis
    
    def _calculate_monthly_returns(self, equity_curve: List[float], timestamps: pd.DatetimeIndex) -> List[float]:
        """計算月度收益"""
        if len(equity_curve) != len(timestamps):
            return []
        
        # 創建DataFrame便於分組
        df = pd.DataFrame({
            'equity': equity_curve,
            'timestamp': timestamps
        })
        
        # 按月分組
        df['year_month'] = df['timestamp'].dt.to_period('M')
        monthly_data = df.groupby('year_month')['equity'].agg(['first', 'last'])
        
        # 計算月度收益率
        monthly_returns = []
        for _, row in monthly_data.iterrows():
            if row['first'] > 0:
                monthly_return = (row['last'] - row['first']) / row['first']
                monthly_returns.append(monthly_return)
        
        return monthly_returns
    
    def _analyze_drawdown_periods(self, equity_curve: List[float], timestamps: pd.DatetimeIndex) -> List[Dict]:
        """分析回撤期間"""
        if len(equity_curve) < 2:
            return []
        
        drawdown_periods = []
        peak = equity_curve[0]
        peak_idx = 0
        in_drawdown = False
        drawdown_start = None
        
        for i, value in enumerate(equity_curve):
            if value > peak:
                # 新高點
                if in_drawdown:
                    # 結束回撤期間
                    drawdown_periods.append({
                        'start_date': timestamps[drawdown_start],
                        'end_date': timestamps[i-1],
                        'duration_days': (timestamps[i-1] - timestamps[drawdown_start]).days,
                        'max_drawdown': (peak - min(equity_curve[peak_idx:i])) / peak,
                        'recovery_date': timestamps[i]
                    })
                    in_drawdown = False
                
                peak = value
                peak_idx = i
            else:
                # 在回撤中
                if not in_drawdown:
                    in_drawdown = True
                    drawdown_start = peak_idx
        
        # 如果最後仍在回撤中
        if in_drawdown:
            drawdown_periods.append({
                'start_date': timestamps[drawdown_start],
                'end_date': timestamps[-1],
                'duration_days': (timestamps[-1] - timestamps[drawdown_start]).days,
                'max_drawdown': (peak - min(equity_curve[peak_idx:])) / peak,
                'recovery_date': None  # 尚未恢復
            })
        
        return drawdown_periods


async def run_enhanced_backtest(
    config: EnhancedBacktestConfig,
    data: pd.DataFrame
) -> EnhancedBacktestResult:
    """運行增強型回測的便利函數"""
    
    # 設置日期範圍
    if config.start_date is None:
        config.start_date = data.index[0]
    if config.end_date is None:
        config.end_date = data.index[-1]
    
    # 創建引擎
    engine = EnhancedBacktestEngine(config)
    
    # 過濾數據到指定日期範圍
    filtered_data = data[(data.index >= config.start_date) & (data.index <= config.end_date)]
    
    # 運行回測
    return await engine.run_backtest(filtered_data)


if __name__ == "__main__":
    # 測試代碼
    import asyncio
    from datetime import datetime, timedelta
    
    async def test_enhanced_backtest():
        """測試增強型回測"""
        
        # 生成模擬數據
        dates = pd.date_range(start=datetime.now() - timedelta(days=180), periods=180*24, freq='1H')
        np.random.seed(42)
        
        prices = 50000 * np.exp(np.cumsum(np.random.normal(0, 0.02, len(dates))))
        data = pd.DataFrame({
            'open': prices,
            'high': prices * (1 + np.random.uniform(0.001, 0.02, len(dates))),
            'low': prices * (1 - np.random.uniform(0.001, 0.02, len(dates))),
            'close': prices,
            'volume': np.random.uniform(1000, 10000, len(dates))
        }, index=dates)
        
        # 確保高低價格邏輯正確
        data['high'] = np.maximum(data['high'], data['close'])
        data['low'] = np.minimum(data['low'], data['close'])
        
        # 測試動態倉位策略回測
        config = EnhancedBacktestConfig(
            strategy_type='dynamic_position',
            symbol='BTCUSDT',
            timeframe='1h',
            initial_capital=10000.0,
            leverage_enabled=True,
            max_leverage=3.0,
            strategy_params={
                'risk_mode': 'balanced',
                'leverage_config': {
                    'max_leverage': 3.0,
                    'leverage_usage_rate': 0.8,
                    'dynamic_leverage': True
                }
            }
        )
        
        print("開始增強型回測...")
        result = await run_enhanced_backtest(config, data)
        
        print(f"\n=== 增強型回測結果 ===")
        print(f"策略: {result.strategy_name}")
        print(f"初始資金: ${result.initial_capital:,.2f}")
        print(f"最終資金: ${result.final_capital:,.2f}")
        print(f"總收益率: {result.total_return:.2%}")
        print(f"年化收益率: {result.annual_return:.2%}")
        print(f"夏普比率: {result.sharpe_ratio:.3f}")
        print(f"最大回撤: {result.max_drawdown:.2%}")
        print(f"交易次數: {result.total_trades}")
        print(f"勝率: {result.win_rate:.2%}")
        
        # 杠桿統計
        if result.leverage_stats:
            print(f"\n=== 杠桿使用統計 ===")
            print(f"最大杠桿: {result.max_leverage_used:.2f}x")
            print(f"平均杠桿: {result.avg_leverage_used:.2f}x")
            print(f"杠桿效率: {result.leverage_efficiency:.2%}")
        
        # 高級風險指標
        print(f"\n=== 高級風險指標 ===")
        print(f"VaR (95%): {result.var_95:.2%}")
        print(f"CVaR (95%): {result.cvar_95:.2%}")
        print(f"卡爾瑪比率: {result.calmar_ratio:.3f}")
        print(f"歐米茄比率: {result.omega_ratio:.3f}")
        
        print(f"\n增強型回測完成!")
        
        return result
    
    # 設置日誌
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # 運行測試
    asyncio.run(test_enhanced_backtest())