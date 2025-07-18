"""
風險管理模塊

提供全面的風險控制功能，包括倉位管理、杠桿控制、止損止盈等。
"""

from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import asyncio
import logging
import pandas as pd
import numpy as np
from collections import deque

from .execution_engine import Order, Position, Account, OrderSide, OrderType
from .exchange_interface import MarketData

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    """風險等級"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(Enum):
    """警報類型"""
    LEVERAGE_WARNING = "leverage_warning"
    DRAWDOWN_WARNING = "drawdown_warning"
    POSITION_LIMIT = "position_limit"
    MARGIN_CALL = "margin_call"
    STOP_LOSS = "stop_loss"
    TAKE_PROFIT = "take_profit"
    LIQUIDITY_RISK = "liquidity_risk"
    CORRELATION_RISK = "correlation_risk"


@dataclass
class RiskAlert:
    """風險警報"""
    type: AlertType
    level: RiskLevel
    message: str
    symbol: Optional[str] = None
    current_value: Optional[float] = None
    threshold: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.now)
    resolved: bool = False
    
    def __str__(self):
        return f"[{self.level.value.upper()}] {self.type.value}: {self.message}"


@dataclass
class RiskMetrics:
    """風險指標"""
    # 基本風險指標
    total_equity: float = 0.0
    total_margin: float = 0.0
    leverage_ratio: float = 0.0
    margin_ratio: float = 0.0
    
    # 盈虧指標
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    total_pnl: float = 0.0
    
    # 回撤指標
    current_drawdown: float = 0.0
    max_drawdown: float = 0.0
    peak_equity: float = 0.0
    
    # 持倉風險
    position_count: int = 0
    largest_position_ratio: float = 0.0
    position_concentration: float = 0.0
    
    # 流動性風險
    liquidity_score: float = 1.0
    
    # 相關性風險
    portfolio_correlation: float = 0.0
    
    # 風險等級
    overall_risk_level: RiskLevel = RiskLevel.LOW
    
    # 時間戳
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class RiskLimits:
    """風險限制"""
    # 杠桿限制
    max_leverage: float = 10.0
    max_leverage_usage: float = 0.8
    
    # 持倉限制
    max_position_size: float = 0.3  # 單個持倉最大佔比
    max_total_exposure: float = 0.8  # 總暴露度
    max_position_count: int = 10
    
    # 回撤限制
    max_drawdown: float = 0.15
    daily_loss_limit: float = 0.05
    
    # 保證金限制
    min_margin_ratio: float = 0.1
    margin_call_ratio: float = 0.05
    
    # 流動性限制
    min_liquidity_score: float = 0.3
    
    # 相關性限制
    max_correlation: float = 0.8
    
    # 止損止盈
    default_stop_loss: float = 0.05
    default_take_profit: float = 0.10
    
    # 風險分級閾值
    medium_risk_threshold: float = 0.5
    high_risk_threshold: float = 0.75


class RiskManager:
    """風險管理器"""
    
    def __init__(self, risk_limits: Optional[RiskLimits] = None):
        self.risk_limits = risk_limits or RiskLimits()
        
        # 風險監控
        self.current_metrics = RiskMetrics()
        self.historical_metrics = deque(maxlen=1000)  # 保存最近1000個風險指標
        
        # 警報系統
        self.active_alerts: List[RiskAlert] = []
        self.alert_history = deque(maxlen=500)  # 保存最近500個警報
        self.alert_callbacks: List[Callable[[RiskAlert], None]] = []
        
        # 價格歷史（用於計算波動率等）
        self.price_history: Dict[str, deque] = {}
        
        # 風險狀態
        self.emergency_mode = False
        self.trading_halted = False
        
        logger.info("風險管理器初始化完成")
    
    def add_alert_callback(self, callback: Callable[[RiskAlert], None]):
        """添加警報回調函數"""
        self.alert_callbacks.append(callback)
    
    def update_market_data(self, symbol: str, market_data: MarketData):
        """更新市場數據"""
        if symbol not in self.price_history:
            self.price_history[symbol] = deque(maxlen=100)
        
        self.price_history[symbol].append({
            'price': market_data.price,
            'volume': market_data.volume,
            'timestamp': market_data.timestamp
        })
    
    def calculate_risk_metrics(self, account: Account, current_prices: Dict[str, float]) -> RiskMetrics:
        """計算風險指標"""
        metrics = RiskMetrics()
        
        # 更新持倉當前價格
        for symbol, position in account.positions.items():
            if symbol in current_prices:
                position.update_current_price(current_prices[symbol])
        
        # 基本指標
        metrics.total_equity = account.total_equity
        metrics.total_margin = account.used_margin
        metrics.leverage_ratio = account.used_margin / max(account.total_equity, 1.0)
        metrics.margin_ratio = account.available_balance / max(account.total_equity, 1.0)
        
        # 盈虧指標
        metrics.unrealized_pnl = account.unrealized_pnl
        metrics.realized_pnl = account.realized_pnl
        metrics.total_pnl = account.unrealized_pnl + account.realized_pnl
        
        # 回撤指標
        if len(self.historical_metrics) > 0:
            peak_equity = max(m.total_equity for m in self.historical_metrics)
            metrics.peak_equity = max(peak_equity, metrics.total_equity)
        else:
            metrics.peak_equity = metrics.total_equity
        
        metrics.current_drawdown = (metrics.peak_equity - metrics.total_equity) / max(metrics.peak_equity, 1.0)
        metrics.max_drawdown = max(m.current_drawdown for m in self.historical_metrics) if self.historical_metrics else 0.0
        
        # 持倉風險
        metrics.position_count = len(account.positions)
        
        if account.positions:
            position_ratios = []
            for position in account.positions.values():
                position_value = position.size * position.current_price
                ratio = position_value / max(account.total_equity, 1.0)
                position_ratios.append(ratio)
            
            metrics.largest_position_ratio = max(position_ratios)
            metrics.position_concentration = sum(r**2 for r in position_ratios)  # Herfindahl index
        
        # 流動性風險
        metrics.liquidity_score = self._calculate_liquidity_score(account.positions)
        
        # 相關性風險
        metrics.portfolio_correlation = self._calculate_portfolio_correlation(account.positions)
        
        # 整體風險等級
        metrics.overall_risk_level = self._calculate_overall_risk_level(metrics)
        
        # 保存當前指標
        self.current_metrics = metrics
        self.historical_metrics.append(metrics)
        
        return metrics
    
    def _calculate_liquidity_score(self, positions: Dict[str, Position]) -> float:
        """計算流動性分數"""
        if not positions:
            return 1.0
        
        total_score = 0.0
        total_weight = 0.0
        
        for symbol, position in positions.items():
            # 基於歷史成交量計算流動性分數
            volume_data = self.price_history.get(symbol, [])
            if volume_data:
                avg_volume = np.mean([d['volume'] for d in volume_data])
                # 簡化的流動性分數計算
                liquidity_score = min(1.0, avg_volume / 1000000)  # 假設100萬為高流動性基準
            else:
                liquidity_score = 0.5  # 默認中等流動性
            
            position_weight = position.size * position.current_price
            total_score += liquidity_score * position_weight
            total_weight += position_weight
        
        return total_score / max(total_weight, 1.0)
    
    def _calculate_portfolio_correlation(self, positions: Dict[str, Position]) -> float:
        """計算投資組合相關性"""
        if len(positions) < 2:
            return 0.0
        
        # 簡化的相關性計算
        symbols = list(positions.keys())
        correlations = []
        
        for i in range(len(symbols)):
            for j in range(i + 1, len(symbols)):
                symbol1, symbol2 = symbols[i], symbols[j]
                
                # 獲取價格歷史
                prices1 = self.price_history.get(symbol1, [])
                prices2 = self.price_history.get(symbol2, [])
                
                if len(prices1) > 10 and len(prices2) > 10:
                    # 計算收益率
                    returns1 = np.diff([p['price'] for p in prices1[-20:]]) / [p['price'] for p in prices1[-21:-1]]
                    returns2 = np.diff([p['price'] for p in prices2[-20:]]) / [p['price'] for p in prices2[-21:-1]]
                    
                    # 計算相關系數
                    if len(returns1) > 5 and len(returns2) > 5:
                        correlation = np.corrcoef(returns1, returns2)[0, 1]
                        if not np.isnan(correlation):
                            correlations.append(abs(correlation))
        
        return np.mean(correlations) if correlations else 0.0
    
    def _calculate_overall_risk_level(self, metrics: RiskMetrics) -> RiskLevel:
        """計算整體風險等級"""
        risk_score = 0.0
        
        # 杠桿風險
        if metrics.leverage_ratio > self.risk_limits.max_leverage_usage:
            risk_score += 0.3
        elif metrics.leverage_ratio > self.risk_limits.max_leverage_usage * 0.8:
            risk_score += 0.2
        
        # 回撤風險
        if metrics.current_drawdown > self.risk_limits.max_drawdown:
            risk_score += 0.3
        elif metrics.current_drawdown > self.risk_limits.max_drawdown * 0.8:
            risk_score += 0.2
        
        # 持倉集中度風險
        if metrics.largest_position_ratio > self.risk_limits.max_position_size:
            risk_score += 0.2
        elif metrics.largest_position_ratio > self.risk_limits.max_position_size * 0.8:
            risk_score += 0.1
        
        # 流動性風險
        if metrics.liquidity_score < self.risk_limits.min_liquidity_score:
            risk_score += 0.1
        
        # 相關性風險
        if metrics.portfolio_correlation > self.risk_limits.max_correlation:
            risk_score += 0.1
        
        # 保證金風險
        if metrics.margin_ratio < self.risk_limits.min_margin_ratio:
            risk_score += 0.2
        
        # 確定風險等級
        if risk_score >= self.risk_limits.high_risk_threshold:
            return RiskLevel.CRITICAL
        elif risk_score >= self.risk_limits.medium_risk_threshold:
            return RiskLevel.HIGH
        elif risk_score >= 0.3:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def check_risk_violations(self, account: Account, current_prices: Dict[str, float]) -> List[RiskAlert]:
        """檢查風險違規"""
        alerts = []
        metrics = self.calculate_risk_metrics(account, current_prices)
        
        # 檢查杠桿風險
        if metrics.leverage_ratio > self.risk_limits.max_leverage_usage:
            alerts.append(RiskAlert(
                type=AlertType.LEVERAGE_WARNING,
                level=RiskLevel.HIGH,
                message=f"杠桿比率超限: {metrics.leverage_ratio:.2%} > {self.risk_limits.max_leverage_usage:.2%}",
                current_value=metrics.leverage_ratio,
                threshold=self.risk_limits.max_leverage_usage
            ))
        
        # 檢查回撤風險
        if metrics.current_drawdown > self.risk_limits.max_drawdown:
            alerts.append(RiskAlert(
                type=AlertType.DRAWDOWN_WARNING,
                level=RiskLevel.HIGH,
                message=f"回撤超限: {metrics.current_drawdown:.2%} > {self.risk_limits.max_drawdown:.2%}",
                current_value=metrics.current_drawdown,
                threshold=self.risk_limits.max_drawdown
            ))
        
        # 檢查持倉限制
        if metrics.largest_position_ratio > self.risk_limits.max_position_size:
            alerts.append(RiskAlert(
                type=AlertType.POSITION_LIMIT,
                level=RiskLevel.MEDIUM,
                message=f"單一持倉過大: {metrics.largest_position_ratio:.2%} > {self.risk_limits.max_position_size:.2%}",
                current_value=metrics.largest_position_ratio,
                threshold=self.risk_limits.max_position_size
            ))
        
        # 檢查保證金風險
        if metrics.margin_ratio < self.risk_limits.margin_call_ratio:
            alerts.append(RiskAlert(
                type=AlertType.MARGIN_CALL,
                level=RiskLevel.CRITICAL,
                message=f"保證金不足: {metrics.margin_ratio:.2%} < {self.risk_limits.margin_call_ratio:.2%}",
                current_value=metrics.margin_ratio,
                threshold=self.risk_limits.margin_call_ratio
            ))
        
        # 檢查流動性風險
        if metrics.liquidity_score < self.risk_limits.min_liquidity_score:
            alerts.append(RiskAlert(
                type=AlertType.LIQUIDITY_RISK,
                level=RiskLevel.MEDIUM,
                message=f"流動性不足: {metrics.liquidity_score:.2f} < {self.risk_limits.min_liquidity_score:.2f}",
                current_value=metrics.liquidity_score,
                threshold=self.risk_limits.min_liquidity_score
            ))
        
        # 檢查相關性風險
        if metrics.portfolio_correlation > self.risk_limits.max_correlation:
            alerts.append(RiskAlert(
                type=AlertType.CORRELATION_RISK,
                level=RiskLevel.MEDIUM,
                message=f"投資組合相關性過高: {metrics.portfolio_correlation:.2f} > {self.risk_limits.max_correlation:.2f}",
                current_value=metrics.portfolio_correlation,
                threshold=self.risk_limits.max_correlation
            ))
        
        # 處理新警報
        for alert in alerts:
            self._handle_alert(alert)
        
        return alerts
    
    def _handle_alert(self, alert: RiskAlert):
        """處理風險警報"""
        # 檢查是否是重複警報
        existing_alert = None
        for existing in self.active_alerts:
            if existing.type == alert.type and existing.symbol == alert.symbol:
                existing_alert = existing
                break
        
        if existing_alert:
            # 更新現有警報
            existing_alert.current_value = alert.current_value
            existing_alert.timestamp = alert.timestamp
            existing_alert.message = alert.message
        else:
            # 添加新警報
            self.active_alerts.append(alert)
            logger.warning(f"新風險警報: {alert}")
        
        # 保存到歷史
        self.alert_history.append(alert)
        
        # 觸發回調
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"警報回調執行失敗: {e}")
        
        # 緊急處理
        if alert.level == RiskLevel.CRITICAL:
            self._handle_critical_alert(alert)
    
    def _handle_critical_alert(self, alert: RiskAlert):
        """處理緊急警報"""
        logger.critical(f"緊急風險警報: {alert}")
        
        if alert.type == AlertType.MARGIN_CALL:
            self.emergency_mode = True
            logger.critical("進入緊急模式 - 保證金不足")
        
        elif alert.type == AlertType.DRAWDOWN_WARNING:
            self.trading_halted = True
            logger.critical("暫停交易 - 回撤超限")
    
    def validate_order(self, order: Order, account: Account, current_prices: Dict[str, float]) -> Tuple[bool, Optional[str]]:
        """驗證訂單風險"""
        if self.trading_halted:
            return False, "交易已暫停"
        
        # 計算訂單執行後的風險指標
        simulated_account = self._simulate_order_execution(order, account, current_prices)
        simulated_metrics = self.calculate_risk_metrics(simulated_account, current_prices)
        
        # 檢查各項風險限制
        if simulated_metrics.leverage_ratio > self.risk_limits.max_leverage_usage:
            return False, f"訂單會導致杠桿超限: {simulated_metrics.leverage_ratio:.2%}"
        
        if simulated_metrics.largest_position_ratio > self.risk_limits.max_position_size:
            return False, f"訂單會導致單一持倉過大: {simulated_metrics.largest_position_ratio:.2%}"
        
        if simulated_metrics.position_count > self.risk_limits.max_position_count:
            return False, f"持倉數量超限: {simulated_metrics.position_count}"
        
        # 檢查保證金
        required_margin = (order.quantity * order.price) / order.leverage
        if required_margin > account.available_balance:
            return False, f"保證金不足: 需要 {required_margin:.2f}, 可用 {account.available_balance:.2f}"
        
        return True, None
    
    def _simulate_order_execution(self, order: Order, account: Account, current_prices: Dict[str, float]) -> Account:
        """模擬訂單執行"""
        # 創建賬戶副本
        import copy
        simulated_account = copy.deepcopy(account)
        
        # 模擬執行訂單
        symbol = order.symbol
        current_position = simulated_account.positions.get(symbol)
        
        if current_position:
            if order.side == current_position.side:
                # 同方向加倉
                total_value = current_position.size * current_position.entry_price + order.quantity * order.price
                total_size = current_position.size + order.quantity
                current_position.entry_price = total_value / total_size
                current_position.size = total_size
            else:
                # 反方向平倉
                if order.quantity >= current_position.size:
                    # 完全平倉或反向開倉
                    if order.quantity > current_position.size:
                        remaining_quantity = order.quantity - current_position.size
                        current_position.side = order.side
                        current_position.size = remaining_quantity
                        current_position.entry_price = order.price
                    else:
                        del simulated_account.positions[symbol]
                else:
                    # 部分平倉
                    current_position.size -= order.quantity
        else:
            # 新開倉
            from .execution_engine import Position
            new_position = Position(
                symbol=symbol,
                side=order.side,
                size=order.quantity,
                entry_price=order.price,
                current_price=current_prices.get(symbol, order.price),
                leverage=order.leverage
            )
            simulated_account.positions[symbol] = new_position
        
        # 更新賬戶信息
        simulated_account.update_from_positions()
        
        return simulated_account
    
    def get_stop_loss_orders(self, account: Account, current_prices: Dict[str, float]) -> List[Order]:
        """獲取止損訂單"""
        orders = []
        
        for symbol, position in account.positions.items():
            if symbol not in current_prices:
                continue
            
            current_price = current_prices[symbol]
            
            # 計算止損價格
            stop_loss_pct = self.risk_limits.default_stop_loss
            
            if position.side == OrderSide.BUY:
                stop_loss_price = position.entry_price * (1 - stop_loss_pct)
                if current_price <= stop_loss_price:
                    order = Order(
                        id=f"SL_{symbol}_{int(datetime.now().timestamp())}",
                        symbol=symbol,
                        side=OrderSide.SELL,
                        type=OrderType.STOP_LOSS,
                        quantity=position.size,
                        price=current_price,
                        leverage=position.leverage,
                        metadata={
                            'reason': 'stop_loss',
                            'trigger_price': stop_loss_price,
                            'loss_percentage': (current_price - position.entry_price) / position.entry_price
                        }
                    )
                    orders.append(order)
            else:  # SHORT
                stop_loss_price = position.entry_price * (1 + stop_loss_pct)
                if current_price >= stop_loss_price:
                    order = Order(
                        id=f"SL_{symbol}_{int(datetime.now().timestamp())}",
                        symbol=symbol,
                        side=OrderSide.BUY,
                        type=OrderType.STOP_LOSS,
                        quantity=position.size,
                        price=current_price,
                        leverage=position.leverage,
                        metadata={
                            'reason': 'stop_loss',
                            'trigger_price': stop_loss_price,
                            'loss_percentage': (position.entry_price - current_price) / position.entry_price
                        }
                    )
                    orders.append(order)
        
        return orders
    
    def get_take_profit_orders(self, account: Account, current_prices: Dict[str, float]) -> List[Order]:
        """獲取止盈訂單"""
        orders = []
        
        for symbol, position in account.positions.items():
            if symbol not in current_prices:
                continue
            
            current_price = current_prices[symbol]
            
            # 計算止盈價格
            take_profit_pct = self.risk_limits.default_take_profit
            
            if position.side == OrderSide.BUY:
                take_profit_price = position.entry_price * (1 + take_profit_pct)
                if current_price >= take_profit_price:
                    order = Order(
                        id=f"TP_{symbol}_{int(datetime.now().timestamp())}",
                        symbol=symbol,
                        side=OrderSide.SELL,
                        type=OrderType.TAKE_PROFIT,
                        quantity=position.size,
                        price=current_price,
                        leverage=position.leverage,
                        metadata={
                            'reason': 'take_profit',
                            'trigger_price': take_profit_price,
                            'profit_percentage': (current_price - position.entry_price) / position.entry_price
                        }
                    )
                    orders.append(order)
            else:  # SHORT
                take_profit_price = position.entry_price * (1 - take_profit_pct)
                if current_price <= take_profit_price:
                    order = Order(
                        id=f"TP_{symbol}_{int(datetime.now().timestamp())}",
                        symbol=symbol,
                        side=OrderSide.BUY,
                        type=OrderType.TAKE_PROFIT,
                        quantity=position.size,
                        price=current_price,
                        leverage=position.leverage,
                        metadata={
                            'reason': 'take_profit',
                            'trigger_price': take_profit_price,
                            'profit_percentage': (position.entry_price - current_price) / position.entry_price
                        }
                    )
                    orders.append(order)
        
        return orders
    
    def resolve_alert(self, alert_id: str):
        """解決警報"""
        for alert in self.active_alerts:
            if id(alert) == alert_id:
                alert.resolved = True
                self.active_alerts.remove(alert)
                logger.info(f"警報已解決: {alert}")
                break
    
    def get_risk_report(self) -> Dict[str, Any]:
        """獲取風險報告"""
        return {
            'current_metrics': {
                'total_equity': self.current_metrics.total_equity,
                'leverage_ratio': self.current_metrics.leverage_ratio,
                'current_drawdown': self.current_metrics.current_drawdown,
                'max_drawdown': self.current_metrics.max_drawdown,
                'position_count': self.current_metrics.position_count,
                'largest_position_ratio': self.current_metrics.largest_position_ratio,
                'liquidity_score': self.current_metrics.liquidity_score,
                'portfolio_correlation': self.current_metrics.portfolio_correlation,
                'overall_risk_level': self.current_metrics.overall_risk_level.value
            },
            'risk_limits': {
                'max_leverage': self.risk_limits.max_leverage,
                'max_position_size': self.risk_limits.max_position_size,
                'max_drawdown': self.risk_limits.max_drawdown,
                'min_margin_ratio': self.risk_limits.min_margin_ratio
            },
            'active_alerts': [
                {
                    'type': alert.type.value,
                    'level': alert.level.value,
                    'message': alert.message,
                    'symbol': alert.symbol,
                    'timestamp': alert.timestamp.isoformat()
                }
                for alert in self.active_alerts
            ],
            'system_status': {
                'emergency_mode': self.emergency_mode,
                'trading_halted': self.trading_halted
            }
        }
    
    def reset_emergency_mode(self):
        """重置緊急模式"""
        self.emergency_mode = False
        self.trading_halted = False
        self.active_alerts.clear()
        logger.info("緊急模式已重置")
    
    def update_risk_limits(self, new_limits: Dict[str, float]):
        """更新風險限制"""
        for key, value in new_limits.items():
            if hasattr(self.risk_limits, key):
                setattr(self.risk_limits, key, value)
                logger.info(f"更新風險限制: {key} = {value}")
    
    def get_historical_risk_data(self, hours: int = 24) -> List[Dict[str, Any]]:
        """獲取歷史風險數據"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        historical_data = []
        for metrics in self.historical_metrics:
            if metrics.timestamp >= cutoff_time:
                historical_data.append({
                    'timestamp': metrics.timestamp.isoformat(),
                    'total_equity': metrics.total_equity,
                    'leverage_ratio': metrics.leverage_ratio,
                    'current_drawdown': metrics.current_drawdown,
                    'position_count': metrics.position_count,
                    'risk_level': metrics.overall_risk_level.value
                })
        
        return historical_data