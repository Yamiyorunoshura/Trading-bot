"""
回測引擎

提供基於歷史數據的策略回測功能，包括績效分析和風險評估。
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
from dataclasses import dataclass, field
from enum import Enum

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from strategies.base import BaseStrategy, StrategySignal, SignalType, PositionSide
from strategies.sma_crossover import SMACrossoverStrategy

logger = logging.getLogger(__name__)


class BacktestStatus(Enum):
    """回測狀態"""

    NOT_STARTED = "not_started"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class BacktestConfig:
    """回測配置"""

    strategy: BaseStrategy
    start_date: datetime
    end_date: datetime
    initial_capital: float = 10000.0
    commission: float = 0.001  # 0.1%
    slippage: float = 0.0001  # 0.01%
    max_position_size: float = 0.95  # 95%的資金

    def __post_init__(self):
        """驗證配置"""
        if self.start_date >= self.end_date:
            raise ValueError("開始日期必須早於結束日期")
        if self.initial_capital <= 0:
            raise ValueError("初始資金必須大於0")
        if not 0 <= self.commission <= 1:
            raise ValueError("手續費必須在0和1之間")


@dataclass
class BacktestResult:
    """回測結果"""

    # 基本信息
    strategy_name: str
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float

    # 交易統計
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0

    # 盈虧統計
    total_pnl: float = 0.0
    total_return: float = 0.0
    annual_return: float = 0.0
    max_drawdown: float = 0.0

    # 風險指標
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    volatility: float = 0.0

    # 詳細記錄
    trades: List[Dict] = field(default_factory=list)
    daily_returns: List[float] = field(default_factory=list)
    equity_curve: List[float] = field(default_factory=list)

    @property
    def win_rate(self) -> float:
        """勝率"""
        if self.total_trades == 0:
            return 0.0
        return self.winning_trades / self.total_trades

    @property
    def avg_trade_pnl(self) -> float:
        """平均交易盈虧"""
        if self.total_trades == 0:
            return 0.0
        return self.total_pnl / self.total_trades

    @property
    def profit_factor(self) -> float:
        """盈利因子"""
        total_profit = sum(trade["pnl"] for trade in self.trades if trade["pnl"] > 0)
        total_loss = abs(sum(trade["pnl"] for trade in self.trades if trade["pnl"] < 0))

        if total_loss == 0:
            return float("inf") if total_profit > 0 else 0.0
        return total_profit / total_loss


class BacktestEngine:
    """回測引擎"""

    def __init__(self, config: BacktestConfig):
        """
        初始化回測引擎

        Args:
            config: 回測配置
        """
        self.config = config
        self.strategy = config.strategy
        self.status = BacktestStatus.NOT_STARTED

        # 回測狀態
        self.current_capital = config.initial_capital
        self.current_position = PositionSide.FLAT
        self.position_size = 0.0
        self.entry_price = 0.0
        self.peak_equity = config.initial_capital
        self.max_drawdown = 0.0

        # 記錄
        self.trades = []
        self.daily_returns = []
        self.equity_curve = [config.initial_capital]

        logger.info(f"回測引擎初始化完成: {config.strategy.name}")

    def run(self, data: pd.DataFrame) -> BacktestResult:
        """
        運行回測

        Args:
            data: 歷史數據，包含OHLCV列

        Returns:
            回測結果
        """
        try:
            self.status = BacktestStatus.RUNNING
            logger.info(f"開始回測: {self.strategy.name}")

            # 重置策略狀態
            self.strategy.reset()

            # 驗證數據
            self._validate_data(data)

            # 運行回測
            self._run_backtest(data)

            # 生成結果
            result = self._generate_result()

            self.status = BacktestStatus.COMPLETED
            logger.info(f"回測完成: {self.strategy.name}")

            return result

        except Exception as e:
            self.status = BacktestStatus.FAILED
            logger.error(f"回測失敗: {e}")
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

    def _run_backtest(self, data: pd.DataFrame) -> None:
        """運行回測邏輯"""
        previous_date = None

        for current_time, row in data.iterrows():
            current_price = row["close"]

            # 更新每日收益（如果跨日）
            if previous_date is not None and current_time.date() != previous_date:
                self._update_daily_return()

            # 生成交易信號
            # 為了模擬實際交易，我們只使用截止當前時間的數據
            available_data = data.loc[:current_time]
            signals = self.strategy.generate_signals(available_data)

            # 處理信號
            for signal in signals:
                if signal.signal_type != SignalType.HOLD:
                    self._process_signal(signal, current_price, current_time)

            # 更新未實現盈虧
            self._update_unrealized_pnl(current_price)

            # 更新權益曲線
            self.equity_curve.append(self.current_capital)

            # 更新最大回撤
            self._update_max_drawdown()

            previous_date = current_time.date()

    def _process_signal(
        self, signal: StrategySignal, current_price: float, current_time: datetime
    ) -> None:
        """處理交易信號"""
        if signal.signal_type == SignalType.BUY:
            self._execute_buy(signal, current_price, current_time)
        elif signal.signal_type == SignalType.SELL:
            self._execute_sell(signal, current_price, current_time)

    def _execute_buy(
        self, signal: StrategySignal, price: float, timestamp: datetime
    ) -> None:
        """執行買入"""
        if self.current_position == PositionSide.LONG:
            return  # 已經是多頭，跳過

        # 計算倉位大小
        position_value = self.current_capital * self.config.max_position_size
        quantity = position_value / price

        # 計算交易成本
        commission = position_value * self.config.commission
        slippage_cost = position_value * self.config.slippage
        total_cost = commission + slippage_cost

        # 檢查資金是否充足
        if self.current_capital < total_cost:
            logger.warning(
                f"資金不足，無法執行買入: {self.current_capital} < {total_cost}"
            )
            return

        # 如果之前是空頭，先平倉
        if self.current_position == PositionSide.SHORT:
            self._close_position(price, timestamp, "平空")

        # 開多倉
        self.current_position = PositionSide.LONG
        self.position_size = quantity
        self.entry_price = price
        self.current_capital -= total_cost

        # 記錄交易
        trade = {
            "timestamp": timestamp,
            "action": "買入",
            "price": price,
            "quantity": quantity,
            "commission": commission,
            "slippage": slippage_cost,
            "capital": self.current_capital,
            "signal_strength": signal.strength,
            "pnl": 0.0,  # 開倉時盈虧為0
        }
        self.trades.append(trade)

        logger.debug(
            f"買入執行: 價格={price:.4f}, 數量={quantity:.6f}, 成本={total_cost:.2f}"
        )

    def _execute_sell(
        self, signal: StrategySignal, price: float, timestamp: datetime
    ) -> None:
        """執行賣出"""
        if self.current_position == PositionSide.SHORT:
            return  # 已經是空頭，跳過

        # 如果之前是多頭，先平倉
        if self.current_position == PositionSide.LONG:
            self._close_position(price, timestamp, "平多")

        # 開空倉（簡化處理，實際中可能需要更複雜的邏輯）
        # 這裡我們暫時不實現做空功能，只做多頭交易
        logger.debug(f"賣出信號: 價格={price:.4f}")

    def _close_position(self, price: float, timestamp: datetime, action: str) -> None:
        """平倉"""
        if self.current_position == PositionSide.FLAT:
            return

        # 計算盈虧
        if self.current_position == PositionSide.LONG:
            pnl = (price - self.entry_price) * self.position_size
        else:  # SHORT
            pnl = (self.entry_price - price) * self.position_size

        # 計算交易成本
        position_value = self.position_size * price
        commission = position_value * self.config.commission
        slippage_cost = position_value * self.config.slippage
        total_cost = commission + slippage_cost

        # 更新資金
        self.current_capital += position_value - total_cost

        # 記錄交易
        trade = {
            "timestamp": timestamp,
            "action": action,
            "price": price,
            "quantity": self.position_size,
            "commission": commission,
            "slippage": slippage_cost,
            "capital": self.current_capital,
            "signal_strength": 1.0,  # 平倉信號強度設為1
            "pnl": pnl - total_cost,  # 扣除交易成本
        }
        self.trades.append(trade)

        # 重置持倉
        self.current_position = PositionSide.FLAT
        self.position_size = 0.0
        self.entry_price = 0.0

        logger.debug(f"平倉執行: 價格={price:.4f}, 盈虧={pnl:.2f}")

    def _update_unrealized_pnl(self, current_price: float) -> None:
        """更新未實現盈虧"""
        if self.current_position == PositionSide.FLAT:
            return

        unrealized_pnl = self.strategy.calculate_unrealized_pnl(current_price)
        # 在回測中，我們不需要單獨跟蹤未實現盈虧，因為會在平倉時計算

    def _update_daily_return(self) -> None:
        """更新每日收益"""
        if len(self.equity_curve) < 2:
            return

        daily_return = (
            self.equity_curve[-1] - self.equity_curve[-2]
        ) / self.equity_curve[-2]
        self.daily_returns.append(daily_return)

    def _update_max_drawdown(self) -> None:
        """更新最大回撤"""
        if self.current_capital > self.peak_equity:
            self.peak_equity = self.current_capital

        drawdown = (self.peak_equity - self.current_capital) / self.peak_equity
        if drawdown > self.max_drawdown:
            self.max_drawdown = drawdown

    def _generate_result(self) -> BacktestResult:
        """生成回測結果"""
        # 基本統計
        total_trades = len(self.trades)
        winning_trades = sum(1 for trade in self.trades if trade["pnl"] > 0)
        losing_trades = sum(1 for trade in self.trades if trade["pnl"] < 0)

        total_pnl = sum(trade["pnl"] for trade in self.trades)
        total_return = (
            self.current_capital - self.config.initial_capital
        ) / self.config.initial_capital

        # 計算年化收益
        days = (self.config.end_date - self.config.start_date).days
        annual_return = (1 + total_return) ** (365 / days) - 1 if days > 0 else 0

        # 計算風險指標
        sharpe_ratio = self._calculate_sharpe_ratio()
        sortino_ratio = self._calculate_sortino_ratio()
        volatility = (
            np.std(self.daily_returns) * np.sqrt(252) if self.daily_returns else 0
        )

        return BacktestResult(
            strategy_name=self.strategy.name,
            start_date=self.config.start_date,
            end_date=self.config.end_date,
            initial_capital=self.config.initial_capital,
            final_capital=self.current_capital,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            total_pnl=total_pnl,
            total_return=total_return,
            annual_return=annual_return,
            max_drawdown=self.max_drawdown,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            volatility=volatility,
            trades=self.trades,
            daily_returns=self.daily_returns,
            equity_curve=self.equity_curve,
        )

    def _calculate_sharpe_ratio(self) -> float:
        """計算夏普比率"""
        if not self.daily_returns:
            return 0.0

        avg_return = np.mean(self.daily_returns)
        std_return = np.std(self.daily_returns)

        if std_return == 0:
            return 0.0

        # 假設無風險利率為0
        return avg_return / std_return * np.sqrt(252)

    def _calculate_sortino_ratio(self) -> float:
        """計算索蒂諾比率"""
        if not self.daily_returns:
            return 0.0

        avg_return = np.mean(self.daily_returns)
        negative_returns = [r for r in self.daily_returns if r < 0]

        if not negative_returns:
            return float("inf") if avg_return > 0 else 0.0

        downside_deviation = np.std(negative_returns)

        if downside_deviation == 0:
            return 0.0

        return avg_return / downside_deviation * np.sqrt(252)


def run_backtest(
    strategy: BaseStrategy,
    data: pd.DataFrame,
    start_date: datetime,
    end_date: datetime,
    initial_capital: float = 10000.0,
    commission: float = 0.001,
    slippage: float = 0.0001,
) -> BacktestResult:
    """
    運行回測的便利函數

    Args:
        strategy: 策略實例
        data: 歷史數據
        start_date: 開始日期
        end_date: 結束日期
        initial_capital: 初始資金
        commission: 手續費率
        slippage: 滑點

    Returns:
        回測結果
    """
    config = BacktestConfig(
        strategy=strategy,
        start_date=start_date,
        end_date=end_date,
        initial_capital=initial_capital,
        commission=commission,
        slippage=slippage,
    )

    engine = BacktestEngine(config)

    # 過濾數據到指定日期範圍
    filtered_data = data[(data.index >= start_date) & (data.index <= end_date)]

    return engine.run(filtered_data)


if __name__ == "__main__":
    # 測試代碼
    import yfinance as yf
    from strategies.sma_crossover import create_sma_strategy

    # 設置日誌
    logging.basicConfig(level=logging.INFO)

    # 下載測試數據
    print("正在下載測試數據...")
    ticker = yf.Ticker("BTC-USD")
    data = ticker.history(period="6mo", interval="1h")
    data.columns = data.columns.str.lower()

    # 創建策略
    strategy = create_sma_strategy("BTCUSDT", 10, 30)

    # 運行回測
    print("開始回測...")
    result = run_backtest(
        strategy=strategy,
        data=data,
        start_date=data.index[0],
        end_date=data.index[-1],
        initial_capital=10000.0,
    )

    # 顯示結果
    print(f"\\n回測結果：")
    print(f"策略名稱: {result.strategy_name}")
    print(f"回測期間: {result.start_date} - {result.end_date}")
    print(f"初始資金: ${result.initial_capital:,.2f}")
    print(f"最終資金: ${result.final_capital:,.2f}")
    print(f"總收益: ${result.total_pnl:,.2f}")
    print(f"收益率: {result.total_return:.2%}")
    print(f"年化收益: {result.annual_return:.2%}")
    print(f"最大回撤: {result.max_drawdown:.2%}")
    print(f"交易次數: {result.total_trades}")
    print(f"勝率: {result.win_rate:.2%}")
    print(f"盈利因子: {result.profit_factor:.2f}")
    print(f"夏普比率: {result.sharpe_ratio:.2f}")
    print(f"波動率: {result.volatility:.2%}")
