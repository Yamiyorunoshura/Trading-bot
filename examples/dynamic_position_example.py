"""
動態倉位策略使用示例

展示如何配置、初始化和運行動態倉位策略
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# 添加項目根目錄到Python路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from python.strategies.dynamic_position_strategy import DynamicPositionStrategy, RiskMode
from python.strategies.dynamic_position_config import (
    DynamicPositionConfig, 
    ConfigManager, 
    create_strategy_from_config
)
from python.strategies.base import SignalType


def generate_sample_data(symbol: str = "BTCUSDT", days: int = 365) -> pd.DataFrame:
    """生成示例市場數據"""
    print(f"正在生成 {days} 天的 {symbol} 示例數據...")
    
    # 生成時間序列
    start_date = datetime.now() - timedelta(days=days)
    dates = pd.date_range(start=start_date, periods=days*24, freq='1H')
    
    # 設置隨機種子確保可重複
    np.random.seed(42)
    
    # 生成價格走勢
    base_price = 50000.0 if symbol.startswith('BTC') else 3000.0
    
    # 添加長期趨勢
    trend = np.linspace(0, 0.2, len(dates))  # 20% 增長趨勢
    
    # 添加週期性波動
    cycle = np.sin(np.arange(len(dates)) * 0.01) * 0.1
    
    # 添加隨機波動
    random_returns = np.random.normal(0, 0.02, len(dates))
    
    # 計算累計收益
    total_returns = trend + cycle + random_returns
    prices = base_price * np.exp(np.cumsum(total_returns))
    
    # 生成OHLCV數據
    data = pd.DataFrame({
        'timestamp': dates,
        'open': prices,
        'high': prices * (1 + np.random.uniform(0.001, 0.02, len(dates))),
        'low': prices * (1 - np.random.uniform(0.001, 0.02, len(dates))),
        'close': prices,
        'volume': np.random.uniform(1000, 10000, len(dates))
    })
    
    # 確保high >= close >= low
    data['high'] = np.maximum(data['high'], data['close'])
    data['low'] = np.minimum(data['low'], data['close'])
    
    return data


def demonstrate_basic_usage():
    """基本使用演示"""
    print("=== 動態倉位策略基本使用演示 ===\n")
    
    # 1. 創建配置
    config = DynamicPositionConfig(
        name="BTC動態倉位策略",
        symbol="BTCUSDT",
        risk_mode="balanced"
    )
    
    print(f"策略配置: {config.name}")
    print(f"交易對: {config.symbol}")
    print(f"風險模式: {config.risk_mode}")
    print(f"最大杠桿: {config.leverage_config['max_leverage']}x")
    print(f"杠桿使用率: {config.leverage_config['leverage_usage_rate']*100}%\n")
    
    # 2. 創建策略實例
    strategy = create_strategy_from_config(config)
    
    # 3. 生成測試數據
    test_data = generate_sample_data(config.symbol, days=90)
    
    # 4. 生成交易信號
    print("正在生成交易信號...")
    signals = strategy.generate_signals(test_data)
    
    print(f"生成了 {len(signals)} 個交易信號")
    
    # 5. 分析信號
    if signals:
        buy_signals = [s for s in signals if s.signal_type == SignalType.BUY]
        sell_signals = [s for s in signals if s.signal_type == SignalType.SELL]
        
        print(f"買入信號: {len(buy_signals)}")
        print(f"賣出信號: {len(sell_signals)}")
        
        if buy_signals:
            avg_buy_strength = np.mean([s.strength for s in buy_signals])
            print(f"平均買入信號強度: {avg_buy_strength:.3f}")
        
        if sell_signals:
            avg_sell_strength = np.mean([s.strength for s in sell_signals])
            print(f"平均賣出信號強度: {avg_sell_strength:.3f}")
    
    # 6. 顯示最新信號詳情
    if signals:
        latest_signal = signals[-1]
        print(f"\n最新信號詳情:")
        print(f"類型: {latest_signal.signal_type.value}")
        print(f"強度: {latest_signal.strength:.3f}")
        print(f"價格: ${latest_signal.price:.2f}")
        print(f"時間: {latest_signal.timestamp}")
        print(f"元數據: {latest_signal.metadata}")
    
    return strategy, test_data, signals


def demonstrate_different_risk_modes():
    """不同風險模式演示"""
    print("\n=== 不同風險模式對比演示 ===\n")
    
    # 生成測試數據
    test_data = generate_sample_data("BTCUSDT", days=60)
    
    risk_modes = ["conservative", "balanced", "aggressive"]
    results = {}
    
    for mode in risk_modes:
        print(f"測試 {mode} 模式...")
        
        config = DynamicPositionConfig(
            name=f"BTC-{mode}",
            symbol="BTCUSDT",
            risk_mode=mode
        )
        
        strategy = create_strategy_from_config(config)
        signals = strategy.generate_signals(test_data)
        
        buy_signals = [s for s in signals if s.signal_type == SignalType.BUY]
        sell_signals = [s for s in signals if s.signal_type == SignalType.SELL]
        
        results[mode] = {
            'total_signals': len(signals),
            'buy_signals': len(buy_signals),
            'sell_signals': len(sell_signals),
            'avg_buy_strength': np.mean([s.strength for s in buy_signals]) if buy_signals else 0,
            'avg_sell_strength': np.mean([s.strength for s in sell_signals]) if sell_signals else 0,
            'max_leverage': strategy.leverage_config.max_leverage,
            'leverage_usage': strategy.leverage_config.leverage_usage_rate
        }
    
    # 顯示對比結果
    print("\n風險模式對比:")
    print("模式\t\t總信號\t買入\t賣出\t買入強度\t賣出強度\t最大杠桿\t杠桿使用率")
    print("-" * 80)
    
    for mode, result in results.items():
        print(f"{mode:12s}\t{result['total_signals']}\t{result['buy_signals']}\t{result['sell_signals']}\t"
              f"{result['avg_buy_strength']:.3f}\t\t{result['avg_sell_strength']:.3f}\t\t"
              f"{result['max_leverage']:.1f}x\t\t{result['leverage_usage']:.1%}")
    
    return results


def demonstrate_custom_configuration():
    """自定義配置演示"""
    print("\n=== 自定義配置演示 ===\n")
    
    # 創建配置管理器
    config_manager = ConfigManager()
    
    # 創建自定義配置
    custom_config = config_manager.create_custom_config(
        name="自定義ETH策略",
        symbol="ETHUSDT",
        risk_mode="balanced",
        max_leverage=4.0,
        leverage_usage_rate=0.85,
        custom_weights={
            'valuation_weight': 0.40,      # 增加估值權重
            'risk_adjusted_weight': 0.35,  # 增加風險調整權重
            'fundamental_weight': 0.25,    # 降低基本面權重
            'rsi_weight': 0.60,
            'bollinger_weight': 0.25,
            'ma_deviation_weight': 0.15,
            'sharpe_weight': 0.70,
            'atr_efficiency_weight': 0.25,
            'return_trend_weight': 0.05,
            'volume_weight': 0.40,
            'mfi_weight': 0.35,
            'obv_weight': 0.20,
            'price_volume_weight': 0.05
        },
        custom_risk_params={
            'max_position_size': 15000.0,
            'stop_loss': 0.06,
            'take_profit': 0.12,
            'max_drawdown': 0.18
        }
    )
    
    print(f"自定義配置: {custom_config.name}")
    print(f"交易對: {custom_config.symbol}")
    print(f"最大杠桿: {custom_config.leverage_config['max_leverage']}x")
    print(f"杠桿使用率: {custom_config.leverage_config['leverage_usage_rate']:.1%}")
    
    # 驗證配置
    validation = config_manager.validate_config(custom_config)
    print(f"配置驗證: {'通過' if validation['valid'] else '失敗'}")
    
    if validation['warnings']:
        print("警告:")
        for warning in validation['warnings']:
            print(f"  - {warning}")
    
    if validation['errors']:
        print("錯誤:")
        for error in validation['errors']:
            print(f"  - {error}")
    
    # 保存配置
    config_manager.save_config(custom_config, "custom_eth_strategy")
    print("配置已保存到 config/custom_eth_strategy.json")
    
    return custom_config


def demonstrate_strategy_monitoring():
    """策略監控演示"""
    print("\n=== 策略監控演示 ===\n")
    
    # 創建策略
    config = DynamicPositionConfig(
        name="監控演示策略",
        symbol="BTCUSDT",
        risk_mode="balanced"
    )
    
    strategy = create_strategy_from_config(config)
    
    # 模擬一些交易
    strategy.position_size = 0.15
    strategy.entry_price = 50000.0
    strategy.current_equity = 12000.0
    strategy.realized_pnl = 150.0
    strategy.total_trades = 5
    strategy.winning_trades = 3
    
    # 獲取策略狀態
    status = strategy.get_strategy_status()
    
    print("策略狀態監控:")
    print(f"策略名稱: {status['name']}")
    print(f"交易對: {status['symbol']}")
    print(f"當前持倉: {status['position']} ({status['position_size']:.4f})")
    print(f"賬戶權益: ${status['leverage_risk']['account_equity']:.2f}")
    
    # 杠桿風險監控
    risk_info = status['leverage_risk']
    print(f"\n杠桿風險監控:")
    print(f"當前杠桿比率: {risk_info['leverage_ratio']:.2f}x")
    print(f"風險等級: {risk_info['risk_level']}")
    print(f"最大杠桿: {risk_info['max_leverage']}x")
    if risk_info['warning']:
        print(f"警告: {risk_info['warning']}")
    
    # 績效監控
    performance = status['performance']
    print(f"\n績效監控:")
    print(f"總交易次數: {performance['total_trades']}")
    print(f"勝率: {performance['win_rate']:.1%}")
    print(f"已實現盈虧: ${performance['realized_pnl']:.2f}")
    print(f"未實現盈虧: ${performance['unrealized_pnl']:.2f}")
    print(f"總盈虧: ${performance['total_pnl']:.2f}")
    
    return strategy


def demonstrate_backtesting():
    """回測演示"""
    print("\n=== 回測演示 ===\n")
    
    # 創建策略
    config = DynamicPositionConfig(
        name="回測演示策略",
        symbol="BTCUSDT",
        risk_mode="balanced"
    )
    
    strategy = create_strategy_from_config(config)
    
    # 生成更長期的測試數據
    test_data = generate_sample_data("BTCUSDT", days=180)
    
    print(f"回測數據: {len(test_data)} 條記錄 ({len(test_data)//24} 天)")
    print(f"價格範圍: ${test_data['close'].min():.2f} - ${test_data['close'].max():.2f}")
    
    # 生成所有信號
    signals = strategy.generate_signals(test_data)
    
    print(f"回測期間生成 {len(signals)} 個信號")
    
    # 簡單回測邏輯
    equity = 10000.0  # 初始資金
    position = 0.0    # 當前持倉
    trades = []       # 交易記錄
    
    for signal in signals:
        current_price = signal.price
        
        if signal.signal_type == SignalType.BUY and position == 0:
            # 買入
            position_size = strategy.calculate_position_size(signal, current_price, equity)
            position = position_size
            equity -= position_size * current_price
            
            trades.append({
                'type': 'BUY',
                'price': current_price,
                'size': position_size,
                'time': signal.timestamp,
                'strength': signal.strength
            })
        
        elif signal.signal_type == SignalType.SELL and position > 0:
            # 賣出
            sell_size = min(position, position * signal.metadata.get('sell_ratio', 0.5))
            equity += sell_size * current_price
            position -= sell_size
            
            trades.append({
                'type': 'SELL',
                'price': current_price,
                'size': sell_size,
                'time': signal.timestamp,
                'strength': signal.strength
            })
    
    # 計算最終權益
    final_equity = equity + position * test_data['close'].iloc[-1]
    total_return = (final_equity / 10000.0 - 1) * 100
    
    print(f"\n回測結果:")
    print(f"總交易次數: {len(trades)}")
    print(f"初始資金: $10,000.00")
    print(f"最終權益: ${final_equity:.2f}")
    print(f"總收益率: {total_return:.2f}%")
    print(f"剩餘持倉: {position:.4f}")
    
    # 顯示最近5筆交易
    if len(trades) >= 5:
        print(f"\n最近5筆交易:")
        for trade in trades[-5:]:
            print(f"{trade['type']:4s} {trade['size']:8.4f} @ ${trade['price']:8.2f} "
                  f"(強度: {trade['strength']:.3f}) {trade['time'].strftime('%Y-%m-%d %H:%M')}")
    
    return trades, final_equity, total_return


def main():
    """主演示函數"""
    print("動態倉位策略演示程序")
    print("=" * 50)
    
    try:
        # 1. 基本使用演示
        strategy, test_data, signals = demonstrate_basic_usage()
        
        # 2. 不同風險模式演示
        risk_mode_results = demonstrate_different_risk_modes()
        
        # 3. 自定義配置演示
        custom_config = demonstrate_custom_configuration()
        
        # 4. 策略監控演示
        monitoring_strategy = demonstrate_strategy_monitoring()
        
        # 5. 回測演示
        trades, final_equity, total_return = demonstrate_backtesting()
        
        print("\n=== 演示完成 ===")
        print("所有功能演示成功完成!")
        print(f"最終回測收益率: {total_return:.2f}%")
        
    except Exception as e:
        print(f"演示過程中發生錯誤: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()