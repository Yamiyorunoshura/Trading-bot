"""
量化交易機器人 Python 策略層

這個模組提供了策略開發、回測分析和數據處理的Python框架。
"""

__version__ = "0.1.0"
__author__ = "Trading Bot Team"

from .strategies import BaseStrategy
from .backtest import BacktestEngine
# from .analysis import TechnicalIndicators  # TODO: 實現後取消註釋

__all__ = [
    "BaseStrategy",
    "BacktestEngine",
    # "TechnicalIndicators",  # TODO: 實現後添加
]
