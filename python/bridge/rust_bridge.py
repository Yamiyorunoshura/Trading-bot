"""
Rust橋接模塊

提供Rust與Python之間的通信接口，支持策略執行和回測。
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging
import traceback

from strategies.base import BaseStrategy, StrategySignal, StrategyConfig
from strategies.sma_crossover import SMACrossoverStrategy
from strategies.dynamic_position_strategy import DynamicPositionStrategy
from backtest.engine import run_backtest, BacktestResult

logger = logging.getLogger(__name__)


class StrategyManager:
    """策略管理器"""

    def __init__(self):
        self.strategies: Dict[str, BaseStrategy] = {}
        self.strategy_configs: Dict[str, StrategyConfig] = {}

    def create_strategy(self, strategy_type: str, config: Dict[str, Any]) -> str:
        """
        創建策略實例

        Args:
            strategy_type: 策略類型
            config: 策略配置

        Returns:
            策略ID
        """
        try:
            strategy_config = StrategyConfig(
                name=config["name"],
                symbol=config["symbol"],
                timeframe=config.get("timeframe", "1h"),
                parameters=config.get("parameters", {}),
                risk_params=config.get("risk_params", {}),
                enabled=config.get("enabled", True),
            )

            # 根據策略類型創建策略實例
            if strategy_type.lower() == "sma_crossover":
                strategy = SMACrossoverStrategy(strategy_config)
            else:
                raise ValueError(f"未知的策略類型: {strategy_type}")

            strategy_id = strategy_config.name
            self.strategies[strategy_id] = strategy
            self.strategy_configs[strategy_id] = strategy_config

            logger.info(f"策略已創建: {strategy_id}")
            return strategy_id

        except Exception as e:
            logger.error(f"創建策略失敗: {e}")
            raise

    def get_strategy(self, strategy_id: str) -> Optional[BaseStrategy]:
        """獲取策略實例"""
        return self.strategies.get(strategy_id)

    def remove_strategy(self, strategy_id: str) -> bool:
        """移除策略"""
        if strategy_id in self.strategies:
            del self.strategies[strategy_id]
            del self.strategy_configs[strategy_id]
            logger.info(f"策略已移除: {strategy_id}")
            return True
        return False

    def list_strategies(self) -> List[str]:
        """列出所有策略"""
        return list(self.strategies.keys())

    def update_strategy_config(self, strategy_id: str, config: Dict[str, Any]) -> bool:
        """更新策略配置"""
        if strategy_id not in self.strategies:
            return False

        strategy_config = self.strategy_configs[strategy_id]

        # 更新配置
        if "parameters" in config:
            strategy_config.parameters.update(config["parameters"])
        if "risk_params" in config:
            strategy_config.risk_params.update(config["risk_params"])
        if "enabled" in config:
            strategy_config.enabled = config["enabled"]

        # 重新創建策略實例
        strategy_type = type(self.strategies[strategy_id]).__name__
        if strategy_type == "SMACrossoverStrategy":
            self.strategies[strategy_id] = SMACrossoverStrategy(strategy_config)

        logger.info(f"策略配置已更新: {strategy_id}")
        return True


# 全局策略管理器
strategy_manager = StrategyManager()


def create_strategy_from_json(json_data: str) -> str:
    """
    從JSON創建策略

    Args:
        json_data: JSON格式的策略配置

    Returns:
        策略ID
    """
    try:
        config = json.loads(json_data)
        strategy_type = config.get("type", "sma_crossover")
        return strategy_manager.create_strategy(strategy_type, config)
    except Exception as e:
        logger.error(f"從JSON創建策略失敗: {e}")
        raise


def generate_signals(strategy_id: str, market_data_json: str) -> str:
    """
    生成交易信號

    Args:
        strategy_id: 策略ID
        market_data_json: JSON格式的市場數據

    Returns:
        JSON格式的信號列表
    """
    try:
        strategy = strategy_manager.get_strategy(strategy_id)
        if not strategy:
            raise ValueError(f"策略不存在: {strategy_id}")

        # 解析市場數據
        market_data = json.loads(market_data_json)
        df = pd.DataFrame(market_data)

        # 確保索引是日期時間
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df.set_index("timestamp", inplace=True)

        # 生成信號
        signals = strategy.generate_signals(df)

        # 轉換為JSON格式
        signals_data = []
        for signal in signals:
            signal_data = {
                "symbol": signal.symbol,
                "signal_type": signal.signal_type.value,
                "strength": float(signal.strength),
                "price": float(signal.price) if signal.price else None,
                "quantity": float(signal.quantity) if signal.quantity else None,
                "timestamp": signal.timestamp.isoformat(),
                "metadata": signal.metadata,
            }
            signals_data.append(signal_data)

        return json.dumps(signals_data)

    except Exception as e:
        logger.error(f"生成信號失敗: {e}")
        error_result = {"error": str(e), "traceback": traceback.format_exc()}
        return json.dumps(error_result)


def run_backtest_from_json(config_json: str) -> str:
    """
    運行回測

    Args:
        config_json: JSON格式的回測配置

    Returns:
        JSON格式的回測結果
    """
    try:
        config = json.loads(config_json)

        # 創建策略
        strategy_config = config["strategy"]
        strategy_id = strategy_manager.create_strategy(
            strategy_config.get("type", "sma_crossover"), strategy_config
        )

        strategy = strategy_manager.get_strategy(strategy_id)

        # 準備數據
        market_data = pd.DataFrame(config["market_data"])
        if "timestamp" in market_data.columns:
            market_data["timestamp"] = pd.to_datetime(market_data["timestamp"])
            market_data.set_index("timestamp", inplace=True)

        # 回測配置
        start_date = datetime.fromisoformat(config["start_date"])
        end_date = datetime.fromisoformat(config["end_date"])
        initial_capital = config.get("initial_capital", 10000.0)
        commission = config.get("commission", 0.001)
        slippage = config.get("slippage", 0.0001)

        # 運行回測
        result = run_backtest(
            strategy=strategy,
            data=market_data,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            commission=commission,
            slippage=slippage,
        )

        # 轉換結果為JSON
        result_data = {
            "strategy_name": result.strategy_name,
            "start_date": result.start_date.isoformat(),
            "end_date": result.end_date.isoformat(),
            "initial_capital": result.initial_capital,
            "final_capital": result.final_capital,
            "total_trades": result.total_trades,
            "winning_trades": result.winning_trades,
            "losing_trades": result.losing_trades,
            "total_pnl": result.total_pnl,
            "total_return": result.total_return,
            "annual_return": result.annual_return,
            "max_drawdown": result.max_drawdown,
            "sharpe_ratio": result.sharpe_ratio,
            "sortino_ratio": result.sortino_ratio,
            "volatility": result.volatility,
            "win_rate": result.win_rate,
            "avg_trade_pnl": result.avg_trade_pnl,
            "profit_factor": result.profit_factor,
            "trades": result.trades,
            "daily_returns": result.daily_returns,
            "equity_curve": result.equity_curve,
        }

        return json.dumps(result_data)

    except Exception as e:
        logger.error(f"回測失敗: {e}")
        error_result = {"error": str(e), "traceback": traceback.format_exc()}
        return json.dumps(error_result)


def get_strategy_info(strategy_id: str) -> str:
    """
    獲取策略信息

    Args:
        strategy_id: 策略ID

    Returns:
        JSON格式的策略信息
    """
    try:
        strategy = strategy_manager.get_strategy(strategy_id)
        if not strategy:
            raise ValueError(f"策略不存在: {strategy_id}")

        info = strategy.get_strategy_info()

        # 轉換為JSON可序列化格式
        json_info = {
            "name": info["name"],
            "symbol": info["symbol"],
            "timeframe": info["timeframe"],
            "parameters": info["parameters"],
            "risk_params": {k: float(v) for k, v in info["risk_params"].items()},
            "position": info["position"],
            "position_size": float(info["position_size"]),
            "performance": {k: float(v) for k, v in info["performance"].items()},
        }

        return json.dumps(json_info)

    except Exception as e:
        logger.error(f"獲取策略信息失敗: {e}")
        error_result = {"error": str(e), "traceback": traceback.format_exc()}
        return json.dumps(error_result)


def list_strategies() -> str:
    """
    列出所有策略

    Returns:
        JSON格式的策略列表
    """
    try:
        strategies = strategy_manager.list_strategies()
        return json.dumps(strategies)
    except Exception as e:
        logger.error(f"列出策略失敗: {e}")
        error_result = {"error": str(e), "traceback": traceback.format_exc()}
        return json.dumps(error_result)


def update_strategy_config(strategy_id: str, config_json: str) -> str:
    """
    更新策略配置

    Args:
        strategy_id: 策略ID
        config_json: JSON格式的配置更新

    Returns:
        JSON格式的結果
    """
    try:
        config = json.loads(config_json)
        success = strategy_manager.update_strategy_config(strategy_id, config)

        result = {
            "success": success,
            "message": f"策略配置更新{'成功' if success else '失敗'}",
        }

        return json.dumps(result)

    except Exception as e:
        logger.error(f"更新策略配置失敗: {e}")
        error_result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }
        return json.dumps(error_result)


# 供Rust調用的C風格接口
def c_create_strategy(json_data: bytes) -> bytes:
    """C風格接口：創建策略"""
    try:
        result = create_strategy_from_json(json_data.decode("utf-8"))
        return result.encode("utf-8")
    except Exception as e:
        return json.dumps({"error": str(e)}).encode("utf-8")


def c_generate_signals(strategy_id: bytes, market_data: bytes) -> bytes:
    """C風格接口：生成信號"""
    try:
        result = generate_signals(
            strategy_id.decode("utf-8"), market_data.decode("utf-8")
        )
        return result.encode("utf-8")
    except Exception as e:
        return json.dumps({"error": str(e)}).encode("utf-8")


def c_run_backtest(config: bytes) -> bytes:
    """C風格接口：運行回測"""
    try:
        result = run_backtest_from_json(config.decode("utf-8"))
        return result.encode("utf-8")
    except Exception as e:
        return json.dumps({"error": str(e)}).encode("utf-8")


if __name__ == "__main__":
    # 測試代碼
    logging.basicConfig(level=logging.INFO)

    # 測試策略創建
    config = {
        "name": "SMA_Test",
        "symbol": "BTCUSDT",
        "timeframe": "1h",
        "parameters": {"fast_period": 10, "slow_period": 20},
        "risk_params": {
            "max_position_size": 1000.0,
            "stop_loss": 0.02,
            "take_profit": 0.04,
        },
    }

    strategy_id = create_strategy_from_json(json.dumps(config))
    print(f"創建策略: {strategy_id}")

    # 測試策略信息
    info = get_strategy_info(strategy_id)
    print(f"策略信息: {info}")

    # 測試列出策略
    strategies = list_strategies()
    print(f"策略列表: {strategies}")

    print("橋接模塊測試完成")
