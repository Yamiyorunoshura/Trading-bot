"""
交易系統示例程序

展示第二階段交易執行系統的完整功能，包括交易執行、風險管理、交易所集成等。
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# 添加項目根目錄到Python路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python.strategies.dynamic_position_config import DynamicPositionConfig
from python.trading.execution_engine import ExecutionEngine, Order, OrderSide, OrderType
from python.trading.exchange_interface import (
    ExchangeManager, MockExchangeInterface, ExchangeConfig, ExchangeType
)
from python.trading.risk_management import RiskManager, RiskLimits
from python.trading.trading_coordinator import TradingCoordinator


async def basic_execution_engine_demo():
    """基本執行引擎演示"""
    print("=== 基本執行引擎演示 ===\n")
    
    # 創建策略配置
    config = DynamicPositionConfig(
        name="執行引擎演示策略",
        symbol="BTCUSDT",
        risk_mode="balanced"
    )
    
    # 創建策略和執行引擎
    from python.strategies.dynamic_position_config import create_strategy_from_config
    strategy = create_strategy_from_config(config)
    execution_engine = ExecutionEngine(strategy, initial_balance=10000.0)
    
    print(f"初始化執行引擎")
    print(f"初始資金: ${execution_engine.account.total_equity}")
    print(f"可用餘額: ${execution_engine.account.available_balance}")
    
    # 創建測試訂單
    print(f"\n創建測試訂單...")
    order = Order(
        id="DEMO_001",
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        type=OrderType.MARKET,
        quantity=0.1,
        price=50000.0,
        leverage=2.0
    )
    
    print(f"訂單詳情:")
    print(f"  ID: {order.id}")
    print(f"  交易對: {order.symbol}")
    print(f"  方向: {order.side.value}")
    print(f"  數量: {order.quantity}")
    print(f"  價格: ${order.price}")
    print(f"  杠桿: {order.leverage}x")
    
    # 執行訂單
    print(f"\n執行訂單...")
    success = await execution_engine.execute_order(order)
    
    if success:
        print(f"✅ 訂單執行成功!")
        print(f"訂單狀態: {order.status.value}")
        if order.filled_quantity:
            print(f"成交數量: {order.filled_quantity}")
            print(f"成交價格: ${order.filled_price}")
    else:
        print(f"❌ 訂單執行失敗")
    
    # 顯示賬戶狀態
    print(f"\n賬戶狀態:")
    execution_engine.account.update_from_positions()
    print(f"總權益: ${execution_engine.account.total_equity:.2f}")
    print(f"可用餘額: ${execution_engine.account.available_balance:.2f}")
    print(f"已使用保證金: ${execution_engine.account.used_margin:.2f}")
    print(f"持倉數量: {len(execution_engine.account.positions)}")
    
    # 執行狀態
    status = execution_engine.get_execution_status()
    print(f"\n執行統計:")
    print(f"總訂單數: {status['statistics']['total_orders']}")
    print(f"成功訂單: {status['statistics']['successful_orders']}")
    print(f"失敗訂單: {status['statistics']['failed_orders']}")
    
    return execution_engine


async def exchange_interface_demo():
    """交易所接口演示"""
    print("\n=== 交易所接口演示 ===\n")
    
    # 創建交易所配置
    config = ExchangeConfig(
        name="模擬交易所",
        api_key="demo_key",
        api_secret="demo_secret",
        base_url="https://api.mock.com",
        testnet=True
    )
    
    # 創建模擬交易所
    exchange = MockExchangeInterface(config)
    
    print(f"創建交易所接口: {config.name}")
    print(f"API Key: {config.api_key}")
    print(f"測試網絡: {config.testnet}")
    
    # 連接交易所
    print(f"\n連接交易所...")
    await exchange.connect()
    print(f"✅ 連接成功")
    
    # 獲取市場數據
    print(f"\n獲取市場數據...")
    market_data = await exchange.get_market_data("BTCUSDT")
    print(f"交易對: {market_data.symbol}")
    print(f"價格: ${market_data.price:.2f}")
    print(f"成交量: {market_data.volume:.2f}")
    print(f"24h漲跌: {market_data.change_24h:.2f}%")
    
    # 獲取賬戶餘額
    print(f"\n獲取賬戶餘額...")
    balances = await exchange.get_account_balance()
    for balance in balances:
        print(f"  {balance.asset}: {balance.total:.2f} (可用: {balance.free:.2f})")
    
    # 測試下單
    print(f"\n測試下單...")
    order = Order(
        id="EXCHANGE_TEST_001",
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        type=OrderType.MARKET,
        quantity=0.1,
        price=market_data.price,
        leverage=2.0
    )
    
    result = await exchange.place_order(order)
    print(f"下單結果: {result}")
    
    if order.exchange_order_id:
        print(f"交易所訂單ID: {order.exchange_order_id}")
        print(f"訂單狀態: {order.status.value}")
    
    # 獲取交易手續費
    print(f"\n獲取交易手續費...")
    fees = await exchange.get_trading_fees("BTCUSDT")
    print(f"Maker手續費: {fees['maker']:.4f}")
    print(f"Taker手續費: {fees['taker']:.4f}")
    
    # 斷開連接
    await exchange.disconnect()
    print(f"\n✅ 已斷開連接")
    
    return exchange


async def risk_management_demo():
    """風險管理演示"""
    print("\n=== 風險管理演示 ===\n")
    
    # 創建風險管理器
    risk_limits = RiskLimits(
        max_leverage=5.0,
        max_position_size=0.3,
        max_drawdown=0.15,
        default_stop_loss=0.05,
        default_take_profit=0.10
    )
    
    risk_manager = RiskManager(risk_limits)
    
    print(f"創建風險管理器")
    print(f"最大杠桿: {risk_limits.max_leverage}x")
    print(f"最大持倉比例: {risk_limits.max_position_size:.1%}")
    print(f"最大回撤: {risk_limits.max_drawdown:.1%}")
    print(f"默認止損: {risk_limits.default_stop_loss:.1%}")
    print(f"默認止盈: {risk_limits.default_take_profit:.1%}")
    
    # 創建測試賬戶
    from python.trading.execution_engine import Account, Position
    account = Account(
        total_equity=10000.0,
        available_balance=7000.0,
        used_margin=3000.0,
        unrealized_pnl=-500.0,
        realized_pnl=200.0
    )
    
    # 添加測試持倉
    position = Position(
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        size=0.2,
        entry_price=50000.0,
        current_price=48000.0,  # 虧損中
        leverage=3.0
    )
    account.positions["BTCUSDT"] = position
    
    print(f"\n創建測試賬戶和持倉")
    print(f"總權益: ${account.total_equity}")
    print(f"可用餘額: ${account.available_balance}")
    print(f"已使用保證金: ${account.used_margin}")
    print(f"未實現盈虧: ${account.unrealized_pnl}")
    print(f"持倉: {position.side.value} {position.size} @ ${position.entry_price}")
    
    # 計算風險指標
    print(f"\n計算風險指標...")
    current_prices = {"BTCUSDT": 48000.0}
    metrics = risk_manager.calculate_risk_metrics(account, current_prices)
    
    print(f"風險指標:")
    print(f"  杠桿比率: {metrics.leverage_ratio:.2%}")
    print(f"  當前回撤: {metrics.current_drawdown:.2%}")
    print(f"  持倉數量: {metrics.position_count}")
    print(f"  最大持倉比例: {metrics.largest_position_ratio:.2%}")
    print(f"  流動性評分: {metrics.liquidity_score:.2f}")
    print(f"  整體風險等級: {metrics.overall_risk_level.value}")
    
    # 檢查風險違規
    print(f"\n檢查風險違規...")
    alerts = risk_manager.check_risk_violations(account, current_prices)
    
    if alerts:
        print(f"🚨 發現 {len(alerts)} 個風險警報:")
        for alert in alerts:
            print(f"  - [{alert.level.value.upper()}] {alert.type.value}: {alert.message}")
    else:
        print(f"✅ 未發現風險違規")
    
    # 測試訂單驗證
    print(f"\n測試訂單驗證...")
    test_order = Order(
        id="RISK_TEST_001",
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        type=OrderType.MARKET,
        quantity=0.5,  # 大量訂單
        price=48000.0,
        leverage=5.0
    )
    
    valid, reason = risk_manager.validate_order(test_order, account, current_prices)
    
    if valid:
        print(f"✅ 訂單驗證通過")
    else:
        print(f"❌ 訂單驗證失敗: {reason}")
    
    # 檢查止損止盈
    print(f"\n檢查止損止盈...")
    stop_loss_orders = risk_manager.get_stop_loss_orders(account, current_prices)
    take_profit_orders = risk_manager.get_take_profit_orders(account, current_prices)
    
    if stop_loss_orders:
        print(f"🔴 觸發止損: {len(stop_loss_orders)} 個訂單")
        for order in stop_loss_orders:
            print(f"  - {order.symbol} {order.side.value} {order.quantity} @ ${order.price}")
    
    if take_profit_orders:
        print(f"🟢 觸發止盈: {len(take_profit_orders)} 個訂單")
        for order in take_profit_orders:
            print(f"  - {order.symbol} {order.side.value} {order.quantity} @ ${order.price}")
    
    if not stop_loss_orders and not take_profit_orders:
        print(f"📊 暫無止損止盈觸發")
    
    return risk_manager


async def trading_coordinator_demo():
    """交易協調器演示"""
    print("\n=== 交易協調器演示 ===\n")
    
    # 創建策略配置
    config = DynamicPositionConfig(
        name="協調器演示策略",
        symbol="BTCUSDT",
        risk_mode="balanced",
        leverage_config={
            'max_leverage': 3.0,
            'leverage_usage_rate': 0.8,
            'dynamic_leverage': True
        }
    )
    
    # 創建交易所管理器
    exchange_config = ExchangeConfig(
        name="演示交易所",
        api_key="demo_key",
        api_secret="demo_secret",
        base_url="https://api.mock.com",
        testnet=True
    )
    
    exchange_manager = ExchangeManager()
    mock_exchange = MockExchangeInterface(exchange_config)
    exchange_manager.add_exchange("mock", mock_exchange, is_default=True)
    
    # 創建交易協調器
    coordinator = TradingCoordinator(
        config,
        exchange_manager,
        initial_balance=10000.0,
        update_interval=0.5  # 0.5秒更新一次
    )
    
    print(f"創建交易協調器")
    print(f"策略: {config.name}")
    print(f"交易對: {config.symbol}")
    print(f"風險模式: {config.risk_mode}")
    print(f"初始資金: $10,000")
    print(f"更新間隔: 0.5秒")
    
    # 添加事件監聽器
    events_log = []
    
    def log_event(event_type):
        def handler(data):
            events_log.append({
                'type': event_type,
                'timestamp': datetime.now(),
                'data': data
            })
            print(f"📅 事件: {event_type} - {datetime.now().strftime('%H:%M:%S')}")
        return handler
    
    coordinator.add_event_callback('order_executed', log_event('訂單執行'))
    coordinator.add_event_callback('signal_generated', log_event('信號生成'))
    coordinator.add_event_callback('risk_alert', log_event('風險警報'))
    coordinator.add_event_callback('position_updated', log_event('持倉更新'))
    
    # 運行交易會話
    print(f"\n🚀 啟動交易會話...")
    
    async with coordinator.trading_session():
        print(f"✅ 交易會話已啟動")
        
        # 等待一些更新週期
        for i in range(10):
            await asyncio.sleep(0.5)
            
            # 每隔幾秒顯示狀態
            if i % 4 == 0:
                print(f"\n📊 交易狀態 (第 {i//4 + 1} 次更新):")
                status = coordinator.get_trading_status()
                print(f"  狀態: {status['state']}")
                print(f"  運行時間: {status['uptime']}")
                print(f"  處理信號數: {status['processed_signals']}")
                print(f"  執行訂單數: {status['executed_orders']}")
                print(f"  失敗訂單數: {status['failed_orders']}")
        
        # 測試手動下單
        print(f"\n🖱️ 測試手動下單...")
        manual_order = Order(
            id="MANUAL_DEMO_001",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=0.05,
            price=50000.0,
            leverage=2.0
        )
        
        success = await coordinator.manual_order(manual_order)
        if success:
            print(f"✅ 手動訂單執行成功")
        else:
            print(f"❌ 手動訂單執行失敗")
        
        # 顯示最終狀態
        print(f"\n📈 最終狀態:")
        
        # 交易狀態
        status = coordinator.get_trading_status()
        print(f"交易狀態: {status['state']}")
        
        # 績效指標
        metrics = coordinator.get_performance_metrics()
        print(f"總權益: ${metrics['account_metrics']['total_equity']:.2f}")
        print(f"總收益: ${metrics['account_metrics']['total_pnl']:.2f}")
        print(f"收益率: {metrics['account_metrics']['return_percentage']:.2f}%")
        
        # 持倉摘要
        positions = coordinator.get_positions_summary()
        print(f"持倉數量: {positions['total_positions']}")
        print(f"總未實現盈虧: ${positions['total_unrealized_pnl']:.2f}")
        
        # 風險報告
        risk_report = coordinator.risk_manager.get_risk_report()
        print(f"風險等級: {risk_report['current_metrics']['overall_risk_level']}")
        print(f"活躍警報: {len(risk_report['active_alerts'])}")
        
        print(f"\n📝 事件日誌:")
        for event in events_log[-5:]:  # 顯示最後5個事件
            print(f"  {event['timestamp'].strftime('%H:%M:%S')} - {event['type']}")
    
    print(f"\n✅ 交易會話已結束")
    
    return coordinator


async def advanced_features_demo():
    """高級功能演示"""
    print("\n=== 高級功能演示 ===\n")
    
    # 創建高級配置
    config = DynamicPositionConfig(
        name="高級功能演示",
        symbol="BTCUSDT",
        risk_mode="aggressive",
        leverage_config={
            'max_leverage': 5.0,
            'leverage_usage_rate': 0.9,
            'dynamic_leverage': True
        }
    )
    
    # 創建交易所管理器
    exchange_config = ExchangeConfig(
        name="高級演示交易所",
        api_key="advanced_key",
        api_secret="advanced_secret",
        base_url="https://api.advanced.com",
        testnet=True
    )
    
    exchange_manager = ExchangeManager()
    
    # 添加多個交易所
    mock_exchange1 = MockExchangeInterface(exchange_config)
    mock_exchange2 = MockExchangeInterface(exchange_config)
    
    exchange_manager.add_exchange("primary", mock_exchange1, is_default=True)
    exchange_manager.add_exchange("backup", mock_exchange2)
    
    # 創建協調器
    coordinator = TradingCoordinator(
        config,
        exchange_manager,
        initial_balance=50000.0,
        update_interval=0.1
    )
    
    print(f"創建高級交易協調器")
    print(f"激進模式策略 - 最大杠桿 {config.leverage_config['max_leverage']}x")
    print(f"初始資金: $50,000")
    print(f"配置多個交易所")
    
    # 測試配置更新
    print(f"\n⚙️ 測試配置更新...")
    
    # 更新風險限制
    new_risk_limits = {
        'max_leverage': 8.0,
        'max_position_size': 0.4,
        'max_drawdown': 0.2
    }
    
    coordinator.update_risk_limits(new_risk_limits)
    print(f"✅ 風險限制已更新")
    
    # 更新策略配置
    new_config = DynamicPositionConfig(
        name="動態更新策略",
        symbol="ETHUSDT",
        risk_mode="balanced"
    )
    
    coordinator.update_strategy_config(new_config)
    print(f"✅ 策略配置已更新到 {new_config.symbol}")
    
    # 恢復原配置
    coordinator.update_strategy_config(config)
    print(f"✅ 配置已恢復")
    
    # 測試緊急停止
    print(f"\n🚨 測試緊急停止機制...")
    
    await coordinator.start()
    
    # 創建危險持倉模擬緊急情況
    from python.trading.execution_engine import Position
    dangerous_position = Position(
        symbol="BTCUSDT",
        side=OrderSide.BUY,
        size=2.0,  # 大量持倉
        entry_price=50000.0,
        current_price=35000.0,  # 巨額虧損
        leverage=5.0
    )
    
    coordinator.execution_engine.account.positions["BTCUSDT"] = dangerous_position
    coordinator.execution_engine.account.update_from_positions()
    
    # 觸發風險檢查
    current_prices = {"BTCUSDT": 35000.0}
    alerts = coordinator.risk_manager.check_risk_violations(
        coordinator.execution_engine.account, 
        current_prices
    )
    
    if alerts:
        print(f"🚨 檢測到 {len(alerts)} 個緊急風險警報")
        for alert in alerts:
            print(f"  - {alert.level.value.upper()}: {alert.message}")
    
    # 測試緊急停止
    print(f"執行緊急停止...")
    await coordinator.emergency_stop()
    
    if coordinator.status.state.value == "emergency":
        print(f"✅ 緊急停止成功")
    
    # 重置風險管理器
    coordinator.risk_manager.reset_emergency_mode()
    print(f"✅ 風險管理器已重置")
    
    # 測試多交易所功能
    print(f"\n🌐 測試多交易所功能...")
    
    # 連接所有交易所
    await exchange_manager.connect_all()
    
    # 獲取所有交易所的餘額
    all_balances = await exchange_manager.get_all_balances()
    print(f"獲取到 {len(all_balances)} 個交易所的餘額信息")
    
    # 獲取所有交易所的持倉
    all_positions = await exchange_manager.get_all_positions()
    print(f"獲取到 {len(all_positions)} 個交易所的持倉信息")
    
    # 斷開所有交易所
    await exchange_manager.disconnect_all()
    print(f"✅ 所有交易所已斷開")
    
    return coordinator


async def main():
    """主演示函數"""
    print("🚀 動態倉位策略 - 第二階段交易系統演示")
    print("=" * 60)
    
    try:
        # 1. 基本執行引擎演示
        execution_engine = await basic_execution_engine_demo()
        
        # 2. 交易所接口演示
        exchange = await exchange_interface_demo()
        
        # 3. 風險管理演示
        risk_manager = await risk_management_demo()
        
        # 4. 交易協調器演示
        coordinator = await trading_coordinator_demo()
        
        # 5. 高級功能演示
        advanced_coordinator = await advanced_features_demo()
        
        print(f"\n🎉 第二階段演示完成!")
        print(f"所有交易系統功能演示成功！")
        
        # 總結
        print(f"\n📊 演示總結:")
        print(f"✅ 執行引擎 - 訂單執行和倉位管理")
        print(f"✅ 交易所接口 - 市場數據和訂單提交")
        print(f"✅ 風險管理 - 實時風險監控和控制")
        print(f"✅ 交易協調器 - 完整的交易流程管理")
        print(f"✅ 高級功能 - 多交易所和緊急處理")
        
    except Exception as e:
        print(f"❌ 演示過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())