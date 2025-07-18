"""
回測模塊

提供策略回測功能，包括回測引擎、績效分析等。
"""

from .engine import BacktestEngine, BacktestConfig, BacktestResult, run_backtest

__all__ = ["BacktestEngine", "BacktestConfig", "BacktestResult", "run_backtest"]
