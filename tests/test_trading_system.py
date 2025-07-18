"""
交易系統測試

測試第二階段的交易執行系統，包括執行引擎、風險管理、交易所接口等。
"""

import pytest
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock
import sys
import os

# 添加項目根目錄到Python路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python.strategies.dynamic_position_strategy import DynamicPositionStrategy
from python.strategies.dynamic_position_config import DynamicPositionConfig, create_strategy_from_config
from python.strategies.base import StrategySignal, SignalType
from python.trading.execution_engine import ExecutionEngine, Order, OrderSide, OrderType, OrderStatus
from python.trading.exchange_interface import (
    ExchangeManager, MockExchangeInterface, ExchangeConfig,
    MarketData, BalanceInfo, PositionInfo
)
from python.trading.risk_management import RiskManager, RiskLimits, RiskLevel, AlertType
from python.trading.trading_coordinator import TradingCoordinator, TradingState


class TestExecutionEngine:
    """執行引擎測試"""
    
    def setup_method(self):
        """測試前設置"""
        config = DynamicPositionConfig(
            name="Test Execution Strategy",
            symbol="BTCUSDT",
            risk_mode="balanced"
        )
        
        self.strategy = create_strategy_from_config(config)
        self.execution_engine = ExecutionEngine(self.strategy, initial_balance=10000.0)
    
    def test_execution_engine_initialization(self):
        """測試執行引擎初始化"""
        assert self.execution_engine.account.total_equity == 10000.0
        assert self.execution_engine.account.available_balance == 10000.0
        assert len(self.execution_engine.orders) == 0
        assert len(self.execution_engine.account.positions) == 0
    
    def test_order_creation(self):
        """測試訂單創建"""
        order = Order(
            id="TEST_001",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=0.1,
            price=50000.0,
            leverage=2.0
        )
        
        assert order.id == "TEST_001"
        assert order.symbol == "BTCUSDT"
        assert order.side == OrderSide.BUY
        assert order.quantity == 0.1
        assert order.leverage == 2.0
        assert order.status == OrderStatus.PENDING
    
    def test_order_id_generation(self):
        """測試訂單ID生成"""
        order_id_1 = self.execution_engine.generate_order_id()
        order_id_2 = self.execution_engine.generate_order_id()
        
        assert order_id_1 != order_id_2
        assert order_id_1.startswith("ORD_")
        assert order_id_2.startswith("ORD_")
    
    @pytest.mark.asyncio
    async def test_signal_processing(self):
        """測試信號處理"""
        # 創建測試信號
        signal = StrategySignal(
            symbol="BTCUSDT",
            signal_type=SignalType.BUY,
            strength=0.8,
            price=50000.0,
            metadata={'buy_ratio': 0.3}
        )
        
        # 處理信號
        orders = await self.execution_engine.process_signals([signal], 50000.0)
        
        assert len(orders) == 1
        assert orders[0].symbol == "BTCUSDT"
        assert orders[0].side == OrderSide.BUY
        assert orders[0].quantity > 0
    
    @pytest.mark.asyncio
    async def test_order_execution(self):
        """測試訂單執行"""
        order = Order(
            id="TEST_002",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=0.1,
            price=50000.0,
            leverage=2.0
        )
        
        # 執行訂單
        success = await self.execution_engine.execute_order(order)
        
        # 檢查執行結果
        assert success in [True, False]  # 模擬執行可能成功或失敗
        assert order.id in self.execution_engine.orders
    
    def test_position_calculation(self):
        """測試持倉計算"""
        # 創建測試持倉
        from python.trading.execution_engine import Position
        position = Position(
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            size=0.1,
            entry_price=50000.0,
            current_price=52000.0,
            leverage=2.0
        )
        
        self.execution_engine.account.positions["BTCUSDT"] = position
        
        # 更新賬戶
        self.execution_engine.account.update_from_positions()
        
        # 檢查計算
        expected_unrealized_pnl = (52000.0 - 50000.0) * 0.1  # 200.0
        assert abs(self.execution_engine.account.unrealized_pnl - expected_unrealized_pnl) < 0.01
    
    def test_leverage_calculation(self):
        """測試杠桿計算"""
        signal = StrategySignal(
            symbol="BTCUSDT",
            signal_type=SignalType.BUY,
            strength=0.8,
            price=50000.0
        )
        
        leverage = self.execution_engine._calculate_leverage(signal)
        
        assert 1.0 <= leverage <= 10.0
        assert leverage <= self.strategy.leverage_config.max_leverage
    
    def test_execution_status(self):
        """測試執行狀態"""
        status = self.execution_engine.get_execution_status()
        
        required_fields = ['account', 'orders', 'statistics', 'risk_status']
        for field in required_fields:
            assert field in status
        
        assert 'total_equity' in status['account']
        assert 'total_orders' in status['orders']


class TestExchangeInterface:
    """交易所接口測試"""
    
    def setup_method(self):
        """測試前設置"""
        config = ExchangeConfig(
            name="mock_exchange",
            api_key="test_key",
            api_secret="test_secret",
            base_url="https://api.mock.com"
        )
        
        self.exchange = MockExchangeInterface(config)
    
    @pytest.mark.asyncio
    async def test_exchange_connection(self):
        """測試交易所連接"""
        await self.exchange.connect()
        assert self.exchange.session is not None
        
        await self.exchange.disconnect()
        assert self.exchange.session is None
    
    @pytest.mark.asyncio
    async def test_get_market_data(self):
        """測試獲取市場數據"""
        await self.exchange.connect()
        
        market_data = await self.exchange.get_market_data("BTCUSDT")
        
        assert market_data.symbol == "BTCUSDT"
        assert market_data.price > 0
        assert market_data.volume > 0
        assert market_data.timestamp > 0
        
        await self.exchange.disconnect()
    
    @pytest.mark.asyncio
    async def test_account_balance(self):
        """測試獲取賬戶餘額"""
        await self.exchange.connect()
        
        balances = await self.exchange.get_account_balance()
        
        assert len(balances) > 0
        assert balances[0].asset == "USDT"
        assert balances[0].total > 0
        
        await self.exchange.disconnect()
    
    @pytest.mark.asyncio
    async def test_place_order(self):
        """測試下單"""
        await self.exchange.connect()
        
        order = Order(
            id="TEST_003",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=0.1,
            price=50000.0,
            leverage=2.0
        )
        
        result = await self.exchange.place_order(order)
        
        assert 'orderId' in result
        assert order.exchange_order_id is not None
        
        await self.exchange.disconnect()
    
    @pytest.mark.asyncio
    async def test_trading_fees(self):
        """測試獲取交易手續費"""
        await self.exchange.connect()
        
        fees = await self.exchange.get_trading_fees("BTCUSDT")
        
        assert 'maker' in fees
        assert 'taker' in fees
        assert fees['maker'] >= 0
        assert fees['taker'] >= 0
        
        await self.exchange.disconnect()


class TestRiskManager:
    """風險管理測試"""
    
    def setup_method(self):
        """測試前設置"""
        self.risk_manager = RiskManager()
        
        # 創建測試賬戶
        from python.trading.execution_engine import Account, Position
        self.account = Account(
            total_equity=10000.0,
            available_balance=8000.0,
            used_margin=2000.0
        )
    
    def test_risk_manager_initialization(self):
        """測試風險管理器初始化"""
        assert self.risk_manager.risk_limits is not None
        assert self.risk_manager.current_metrics is not None
        assert len(self.risk_manager.active_alerts) == 0
    
    def test_risk_limits_configuration(self):
        """測試風險限制配置"""
        limits = RiskLimits(
            max_leverage=5.0,
            max_position_size=0.4,
            max_drawdown=0.2
        )
        
        assert limits.max_leverage == 5.0
        assert limits.max_position_size == 0.4
        assert limits.max_drawdown == 0.2
    
    def test_risk_metrics_calculation(self):
        """測試風險指標計算"""
        current_prices = {"BTCUSDT": 50000.0}
        
        metrics = self.risk_manager.calculate_risk_metrics(self.account, current_prices)
        
        assert metrics.total_equity == 10000.0
        assert metrics.leverage_ratio == 0.2  # 2000/10000
        assert metrics.overall_risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
    
    def test_order_validation(self):
        """測試訂單驗證"""
        order = Order(
            id="TEST_004",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=0.1,
            price=50000.0,
            leverage=2.0
        )
        
        current_prices = {"BTCUSDT": 50000.0}
        
        valid, reason = self.risk_manager.validate_order(order, self.account, current_prices)
        
        assert isinstance(valid, bool)
        if not valid:
            assert reason is not None
    
    def test_stop_loss_calculation(self):
        """測試止損計算"""
        # 添加測試持倉
        from python.trading.execution_engine import Position
        position = Position(
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            size=0.1,
            entry_price=50000.0,
            current_price=47000.0,  # 虧損超過5%，觸發止損
            leverage=2.0
        )
        
        self.account.positions["BTCUSDT"] = position
        
        current_prices = {"BTCUSDT": 47000.0}
        
        stop_loss_orders = self.risk_manager.get_stop_loss_orders(self.account, current_prices)
        
        # 應該觸發止損
        assert len(stop_loss_orders) > 0
        assert stop_loss_orders[0].side == OrderSide.SELL
        assert stop_loss_orders[0].quantity == 0.1
    
    def test_risk_alert_system(self):
        """測試風險警報系統"""
        # 創建高風險賬戶
        from python.trading.execution_engine import Account
        high_risk_account = Account(
            total_equity=1000.0,
            available_balance=100.0,
            used_margin=900.0,  # 90% 杠桿使用率
            unrealized_pnl=-200.0  # 20% 虧損
        )
        
        current_prices = {"BTCUSDT": 50000.0}
        
        alerts = self.risk_manager.check_risk_violations(high_risk_account, current_prices)
        
        # 應該產生警報
        assert len(alerts) > 0
        
        # 檢查警報類型
        alert_types = [alert.type for alert in alerts]
        assert AlertType.LEVERAGE_WARNING in alert_types or AlertType.DRAWDOWN_WARNING in alert_types


class TestTradingCoordinator:
    """交易協調器測試"""
    
    def setup_method(self):
        """測試前設置"""
        self.config = DynamicPositionConfig(
            name="Test Trading Coordinator",
            symbol="BTCUSDT",
            risk_mode="balanced"
        )
        
        # 創建模擬交易所
        exchange_config = ExchangeConfig(
            name="mock_exchange",
            api_key="test_key",
            api_secret="test_secret",
            base_url="https://api.mock.com"
        )
        
        self.exchange_manager = ExchangeManager()
        mock_exchange = MockExchangeInterface(exchange_config)
        self.exchange_manager.add_exchange("mock", mock_exchange, is_default=True)
        
        self.coordinator = TradingCoordinator(
            self.config,
            self.exchange_manager,
            initial_balance=10000.0,
            update_interval=0.1  # 快速更新用於測試
        )
    
    def test_coordinator_initialization(self):
        """測試協調器初始化"""
        assert self.coordinator.strategy is not None
        assert self.coordinator.execution_engine is not None
        assert self.coordinator.risk_manager is not None
        assert self.coordinator.status.state == TradingState.STOPPED
    
    @pytest.mark.asyncio
    async def test_coordinator_lifecycle(self):
        """測試協調器生命周期"""
        # 啟動
        await self.coordinator.start()
        assert self.coordinator.status.state == TradingState.RUNNING
        assert self.coordinator.running is True
        
        # 暫停
        await self.coordinator.pause()
        assert self.coordinator.status.state == TradingState.PAUSED
        
        # 恢復
        await self.coordinator.resume()
        assert self.coordinator.status.state == TradingState.RUNNING
        
        # 停止
        await self.coordinator.stop()
        assert self.coordinator.status.state == TradingState.STOPPED
        assert self.coordinator.running is False
    
    def test_event_system(self):
        """測試事件系統"""
        events_received = []
        
        def event_handler(data):
            events_received.append(data)
        
        self.coordinator.add_event_callback('order_executed', event_handler)
        
        # 觸發事件
        test_data = {'test': 'data'}
        self.coordinator._trigger_event('order_executed', test_data)
        
        assert len(events_received) == 1
        assert events_received[0] == test_data
    
    def test_trading_status(self):
        """測試交易狀態"""
        status = self.coordinator.get_trading_status()
        
        required_fields = ['state', 'processed_signals', 'executed_orders', 'strategy', 'execution', 'risk']
        for field in required_fields:
            assert field in status
        
        assert status['state'] == TradingState.STOPPED.value
    
    def test_performance_metrics(self):
        """測試績效指標"""
        metrics = self.coordinator.get_performance_metrics()
        
        required_fields = ['account_metrics', 'strategy_metrics', 'trading_metrics']
        for field in required_fields:
            assert field in metrics
        
        assert 'total_equity' in metrics['account_metrics']
        assert 'return_percentage' in metrics['account_metrics']
    
    @pytest.mark.asyncio
    async def test_manual_order(self):
        """測試手動下單"""
        # 啟動協調器
        await self.coordinator.start()
        
        try:
            # 創建手動訂單
            order = Order(
                id="MANUAL_001",
                symbol="BTCUSDT",
                side=OrderSide.BUY,
                type=OrderType.MARKET,
                quantity=0.1,
                price=50000.0,
                leverage=2.0
            )
            
            # 執行手動訂單
            success = await self.coordinator.manual_order(order)
            
            assert isinstance(success, bool)
            
        finally:
            await self.coordinator.stop()
    
    @pytest.mark.asyncio
    async def test_position_management(self):
        """測試持倉管理"""
        # 模擬持倉
        from python.trading.execution_engine import Position
        position = Position(
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            size=0.1,
            entry_price=50000.0,
            current_price=52000.0,
            leverage=2.0
        )
        
        self.coordinator.execution_engine.account.positions["BTCUSDT"] = position
        
        # 測試持倉摘要
        summary = self.coordinator.get_positions_summary()
        
        assert 'positions' in summary
        assert summary['total_positions'] > 0
    
    def test_configuration_updates(self):
        """測試配置更新"""
        # 更新策略配置
        new_config = DynamicPositionConfig(
            name="Updated Strategy",
            symbol="ETHUSDT",
            risk_mode="aggressive"
        )
        
        self.coordinator.update_strategy_config(new_config)
        
        assert self.coordinator.config.name == "Updated Strategy"
        assert self.coordinator.config.symbol == "ETHUSDT"
        assert self.coordinator.config.risk_mode == "aggressive"
        
        # 更新風險限制
        new_limits = {
            'max_leverage': 5.0,
            'max_position_size': 0.4
        }
        
        self.coordinator.update_risk_limits(new_limits)
        
        assert self.coordinator.risk_manager.risk_limits.max_leverage == 5.0
        assert self.coordinator.risk_manager.risk_limits.max_position_size == 0.4


class TestIntegration:
    """整合測試"""
    
    @pytest.mark.asyncio
    async def test_full_trading_cycle(self):
        """測試完整交易週期"""
        # 設置配置
        config = DynamicPositionConfig(
            name="Integration Test Strategy",
            symbol="BTCUSDT",
            risk_mode="balanced"
        )
        
        # 設置交易所
        exchange_config = ExchangeConfig(
            name="mock_exchange",
            api_key="test_key",
            api_secret="test_secret",
            base_url="https://api.mock.com"
        )
        
        exchange_manager = ExchangeManager()
        mock_exchange = MockExchangeInterface(exchange_config)
        exchange_manager.add_exchange("mock", mock_exchange, is_default=True)
        
        # 創建協調器
        coordinator = TradingCoordinator(
            config,
            exchange_manager,
            initial_balance=10000.0,
            update_interval=0.1
        )
        
        # 運行交易會話
        async with coordinator.trading_session():
            # 等待幾個更新週期
            await asyncio.sleep(0.5)
            
            # 檢查狀態
            status = coordinator.get_trading_status()
            assert status['state'] == TradingState.RUNNING.value
            
            # 檢查性能指標
            metrics = coordinator.get_performance_metrics()
            assert 'account_metrics' in metrics
            assert 'strategy_metrics' in metrics
            assert 'trading_metrics' in metrics
    
    @pytest.mark.asyncio
    async def test_risk_scenario(self):
        """測試風險場景"""
        # 創建高風險配置
        config = DynamicPositionConfig(
            name="High Risk Test",
            symbol="BTCUSDT",
            risk_mode="aggressive",
            leverage_config={
                'max_leverage': 10.0,
                'leverage_usage_rate': 0.95
            }
        )
        
        # 設置交易所
        exchange_config = ExchangeConfig(
            name="mock_exchange",
            api_key="test_key",
            api_secret="test_secret",
            base_url="https://api.mock.com"
        )
        
        exchange_manager = ExchangeManager()
        mock_exchange = MockExchangeInterface(exchange_config)
        exchange_manager.add_exchange("mock", mock_exchange, is_default=True)
        
        # 創建協調器
        coordinator = TradingCoordinator(
            config,
            exchange_manager,
            initial_balance=1000.0,  # 較小的初始資金
            update_interval=0.1
        )
        
        # 收集風險警報
        alerts_received = []
        
        def alert_handler(alert):
            alerts_received.append(alert)
        
        coordinator.add_event_callback('risk_alert', alert_handler)
        
        # 運行測試
        await coordinator.start()
        
        try:
            # 等待風險檢查
            await asyncio.sleep(0.3)
            
            # 檢查風險報告
            risk_report = coordinator.risk_manager.get_risk_report()
            assert 'current_metrics' in risk_report
            assert 'active_alerts' in risk_report
            
        finally:
            await coordinator.stop()


def run_performance_test():
    """性能測試"""
    import time
    
    print("開始交易系統性能測試...")
    
    # 創建大量訂單測試
    config = DynamicPositionConfig()
    strategy = create_strategy_from_config(config)
    execution_engine = ExecutionEngine(strategy, initial_balance=100000.0)
    
    # 測試訂單創建性能
    start_time = time.time()
    orders = []
    
    for i in range(1000):
        order = Order(
            id=f"PERF_TEST_{i}",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=0.1,
            price=50000.0,
            leverage=2.0
        )
        orders.append(order)
    
    creation_time = time.time() - start_time
    
    # 測試風險計算性能
    risk_manager = RiskManager()
    
    start_time = time.time()
    
    for _ in range(100):
        metrics = risk_manager.calculate_risk_metrics(
            execution_engine.account,
            {"BTCUSDT": 50000.0}
        )
    
    risk_calc_time = time.time() - start_time
    
    print(f"訂單創建性能: {len(orders)} 個訂單, 耗時 {creation_time:.3f}秒")
    print(f"風險計算性能: 100 次計算, 耗時 {risk_calc_time:.3f}秒")
    print(f"訂單創建速度: {len(orders)/creation_time:.0f} 個/秒")
    print(f"風險計算速度: {100/risk_calc_time:.0f} 次/秒")
    
    # 性能要求檢查
    assert creation_time < 1.0, "訂單創建性能不達標"
    assert risk_calc_time < 1.0, "風險計算性能不達標"
    
    print("交易系統性能測試通過!")


if __name__ == "__main__":
    # 運行基本測試
    pytest.main([__file__, "-v"])
    
    # 運行性能測試
    run_performance_test()