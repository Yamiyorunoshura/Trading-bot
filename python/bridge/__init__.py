"""
橋接模塊

提供Python與Rust之間的通信接口。
"""

from .rust_bridge import (
    StrategyManager,
    create_strategy_from_json,
    generate_signals,
    run_backtest_from_json,
    get_strategy_info,
    list_strategies,
    update_strategy_config,
    strategy_manager,
)

__all__ = [
    "StrategyManager",
    "create_strategy_from_json",
    "generate_signals",
    "run_backtest_from_json",
    "get_strategy_info",
    "list_strategies",
    "update_strategy_config",
    "strategy_manager",
]
