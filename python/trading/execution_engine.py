"""
交易執行引擎

負責執行動態倉位策略的交易邏輯，包括訂單執行、倉位管理和風險控制。
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import asyncio
import logging
from decimal import Decimal, ROUND_DOWN
import pandas as pd
import numpy as np

from ..strategies.base import StrategySignal, SignalType
from ..strategies.dynamic_position_strategy import DynamicPositionStrategy

logger = logging.getLogger(__name__)


class OrderType(Enum):
    """訂單類型"""
    MARKET = "market"      # 市價單
    LIMIT = "limit"        # 限價單
    STOP_LOSS = "stop_loss"  # 止損單
    TAKE_PROFIT = "take_profit"  # 止盈單


class OrderStatus(Enum):
    """訂單狀態"""
    PENDING = "pending"      # 待執行
    PARTIAL = "partial"      # 部分成交
    FILLED = "filled"        # 完全成交
    CANCELLED = "cancelled"  # 已取消
    FAILED = "failed"        # 執行失敗


class OrderSide(Enum):
    """訂單方向"""
    BUY = "buy"
    SELL = "sell"


@dataclass
class Order:
    """訂單信息"""
    id: str
    symbol: str
    side: OrderSide
    type: OrderType
    quantity: float
    price: Optional[float] = None
    leverage: float = 1.0
    status: OrderStatus = OrderStatus.PENDING
    filled_quantity: float = 0.0
    filled_price: Optional[float] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    exchange_order_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.quantity <= 0:
            raise ValueError("訂單數量必須大於0")
        if self.leverage < 1.0 or self.leverage > 10.0:
            raise ValueError("杠桿倍數必須在1-10之間")


@dataclass
class Position:
    """持倉信息"""
    symbol: str
    side: OrderSide
    size: float
    entry_price: float
    current_price: float
    leverage: float = 1.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    margin_used: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    
    def calculate_unrealized_pnl(self, current_price: float) -> float:
        """計算未實現盈虧"""
        if self.side == OrderSide.BUY:
            return (current_price - self.entry_price) * self.size
        else:  # SELL
            return (self.entry_price - current_price) * self.size
    
    def calculate_margin_used(self) -> float:
        """計算已使用保證金"""
        return (self.size * self.entry_price) / self.leverage
    
    def update_current_price(self, price: float):
        """更新當前價格和未實現盈虧"""
        self.current_price = price
        self.unrealized_pnl = self.calculate_unrealized_pnl(price)
        self.updated_at = datetime.now()


@dataclass
class Account:
    """賬戶信息"""
    total_equity: float = 10000.0  # 總權益
    available_balance: float = 10000.0  # 可用餘額
    used_margin: float = 0.0  # 已使用保證金
    unrealized_pnl: float = 0.0  # 未實現盈虧
    realized_pnl: float = 0.0  # 已實現盈虧
    positions: Dict[str, Position] = field(default_factory=dict)
    
    def update_from_positions(self):
        """從持倉更新賬戶信息"""
        self.used_margin = sum(pos.calculate_margin_used() for pos in self.positions.values())
        
        # 更新每個持倉的未實現盈虧
        for pos in self.positions.values():
            pos.unrealized_pnl = pos.calculate_unrealized_pnl(pos.current_price)
        
        self.unrealized_pnl = sum(pos.unrealized_pnl for pos in self.positions.values())
        self.total_equity = self.available_balance + self.used_margin + self.unrealized_pnl
    
    def get_max_leverage_allowed(self, symbol: str, max_leverage: float = 10.0) -> float:
        """獲取允許的最大杠桿倍數"""
        # 根據當前風險狀況調整最大杠桿
        risk_ratio = self.used_margin / max(self.total_equity, 1.0)
        
        if risk_ratio > 0.8:
            return min(max_leverage, 2.0)  # 高風險時限制杠桿
        elif risk_ratio > 0.5:
            return min(max_leverage, 5.0)  # 中風險時適度限制
        else:
            return max_leverage  # 低風險時允許全杠桿


class ExecutionEngine:
    """交易執行引擎"""
    
    def __init__(self, strategy: DynamicPositionStrategy, initial_balance: float = 10000.0):
        self.strategy = strategy
        self.account = Account(
            total_equity=initial_balance,
            available_balance=initial_balance
        )
        
        # 訂單管理
        self.orders: Dict[str, Order] = {}
        self.order_counter = 0
        
        # 執行配置
        self.execution_config = {
            'max_slippage': 0.001,  # 最大滑點 0.1%
            'order_timeout': 30,    # 訂單超時時間(秒)
            'min_order_size': 0.0001,  # 最小訂單大小
            'price_precision': 2,   # 價格精度
            'quantity_precision': 4,  # 數量精度
        }
        
        # 風險控制
        self.risk_limits = {
            'max_position_size': 0.5,  # 最大持倉佔比
            'max_leverage_usage': 0.8,  # 最大杠桿使用率
            'max_daily_loss': 0.05,    # 最大日損失
            'max_drawdown': 0.15,      # 最大回撤
        }
        
        # 統計信息
        self.trade_stats = {
            'total_orders': 0,
            'successful_orders': 0,
            'failed_orders': 0,
            'total_volume': 0.0,
            'total_fees': 0.0,
        }
        
        logger.info(f"交易執行引擎初始化完成，初始資金: ${initial_balance}")
    
    def generate_order_id(self) -> str:
        """生成訂單ID"""
        self.order_counter += 1
        return f"ORD_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{self.order_counter:04d}"
    
    async def process_signals(self, signals: List[StrategySignal], current_price: float) -> List[Order]:
        """處理策略信號並生成訂單"""
        orders = []
        
        for signal in signals:
            try:
                # 驗證信號
                if not self._validate_signal(signal):
                    continue
                
                # 生成訂單
                order = await self._create_order_from_signal(signal, current_price)
                if order:
                    orders.append(order)
                    logger.info(f"創建訂單: {order.id}, {order.side.value} {order.quantity} @ {order.price}")
                
            except Exception as e:
                logger.error(f"處理信號失敗: {e}")
                continue
        
        return orders
    
    def _validate_signal(self, signal: StrategySignal) -> bool:
        """驗證信號有效性"""
        # 基本驗證
        if signal.strength <= 0:
            logger.warning("信號強度無效")
            return False
        
        if signal.price is None or signal.price <= 0:
            logger.warning("信號價格無效")
            return False
        
        # 風險檢查
        if not self._check_risk_limits(signal):
            logger.warning("信號超出風險限制")
            return False
        
        return True
    
    def _check_risk_limits(self, signal: StrategySignal) -> bool:
        """檢查風險限制"""
        # 檢查最大持倉限制
        current_position_ratio = self.account.used_margin / max(self.account.total_equity, 1.0)
        if current_position_ratio > self.risk_limits['max_position_size']:
            logger.warning(f"持倉比例超限: {current_position_ratio:.2%}")
            return False
        
        # 檢查最大杠桿使用率
        leverage_usage = self.account.used_margin / max(self.account.available_balance, 1.0)
        if leverage_usage > self.risk_limits['max_leverage_usage']:
            logger.warning(f"杠桿使用率超限: {leverage_usage:.2%}")
            return False
        
        # 檢查最大回撤
        if self.account.unrealized_pnl / max(self.account.total_equity, 1.0) < -self.risk_limits['max_drawdown']:
            logger.warning("回撤超限，暫停交易")
            return False
        
        return True
    
    async def _create_order_from_signal(self, signal: StrategySignal, current_price: float) -> Optional[Order]:
        """從信號創建訂單"""
        try:
            # 計算訂單參數
            order_side = OrderSide.BUY if signal.signal_type == SignalType.BUY else OrderSide.SELL
            
            # 計算訂單數量
            quantity = self._calculate_order_quantity(signal, current_price)
            if quantity < self.execution_config['min_order_size']:
                logger.warning(f"訂單數量過小: {quantity}")
                return None
            
            # 計算訂單價格
            order_price = self._calculate_order_price(signal, current_price)
            
            # 確定杠桿倍數
            leverage = self._calculate_leverage(signal)
            
            # 創建訂單
            order = Order(
                id=self.generate_order_id(),
                symbol=signal.symbol,
                side=order_side,
                type=OrderType.MARKET,  # 默認使用市價單
                quantity=quantity,
                price=order_price,
                leverage=leverage,
                metadata={
                    'signal_strength': signal.strength,
                    'signal_timestamp': signal.timestamp,
                    'strategy_metadata': signal.metadata
                }
            )
            
            return order
            
        except Exception as e:
            logger.error(f"創建訂單失敗: {e}")
            return None
    
    def _calculate_order_quantity(self, signal: StrategySignal, current_price: float) -> float:
        """計算訂單數量"""
        # 獲取建議倉位大小
        suggested_size = self.strategy.calculate_position_size(
            signal, current_price, self.account.available_balance
        )
        
        # 考慮當前持倉
        current_position = self.account.positions.get(signal.symbol)
        
        if signal.signal_type == SignalType.BUY:
            if current_position and current_position.side == OrderSide.BUY:
                # 加倉
                return suggested_size * 0.5  # 加倉時使用較小的數量
            else:
                # 新開倉或平空倉
                return suggested_size
        
        elif signal.signal_type == SignalType.SELL:
            if current_position and current_position.side == OrderSide.BUY:
                # 平多倉
                sell_ratio = signal.metadata.get('sell_ratio', 0.3)
                return min(current_position.size * sell_ratio, current_position.size)
            elif current_position and current_position.side == OrderSide.SELL:
                # 加空倉
                return suggested_size * 0.5
            else:
                # 新開空倉
                return suggested_size
        
        return 0.0
    
    def _calculate_order_price(self, signal: StrategySignal, current_price: float) -> float:
        """計算訂單價格"""
        # 市價單使用當前價格
        if signal.signal_type == SignalType.BUY:
            # 買入時稍微高於當前價格以確保成交
            return current_price * (1 + self.execution_config['max_slippage'])
        else:
            # 賣出時稍微低於當前價格以確保成交
            return current_price * (1 - self.execution_config['max_slippage'])
    
    def _calculate_leverage(self, signal: StrategySignal) -> float:
        """計算杠桿倍數"""
        # 從策略獲取杠桿配置
        strategy_leverage = self.strategy.leverage_config.max_leverage
        
        # 根據信號強度調整杠桿
        if self.strategy.leverage_config.dynamic_leverage:
            signal_strength = signal.strength
            adjusted_leverage = 1.0 + (strategy_leverage - 1.0) * signal_strength
        else:
            adjusted_leverage = strategy_leverage
        
        # 考慮賬戶風險狀況
        max_allowed = self.account.get_max_leverage_allowed(signal.symbol, strategy_leverage)
        
        return min(adjusted_leverage, max_allowed)
    
    async def execute_order(self, order: Order) -> bool:
        """執行訂單"""
        try:
            logger.info(f"執行訂單: {order.id}")
            
            # 訂單前檢查
            if not self._pre_execution_check(order):
                order.status = OrderStatus.FAILED
                return False
            
            # 模擬訂單執行（實際實現中應該調用交易所API）
            execution_result = await self._simulate_order_execution(order)
            
            if execution_result:
                # 更新訂單狀態
                order.status = OrderStatus.FILLED
                order.filled_quantity = order.quantity
                order.filled_price = order.price
                order.updated_at = datetime.now()
                
                # 更新持倉
                self._update_position(order)
                
                # 更新統計
                self.trade_stats['successful_orders'] += 1
                self.trade_stats['total_volume'] += order.quantity * order.price
                
                logger.info(f"訂單執行成功: {order.id}")
                return True
            else:
                order.status = OrderStatus.FAILED
                self.trade_stats['failed_orders'] += 1
                logger.error(f"訂單執行失敗: {order.id}")
                return False
                
        except Exception as e:
            logger.error(f"執行訂單異常: {e}")
            order.status = OrderStatus.FAILED
            return False
        finally:
            self.orders[order.id] = order
            self.trade_stats['total_orders'] += 1
    
    def _pre_execution_check(self, order: Order) -> bool:
        """執行前檢查"""
        # 檢查可用餘額
        required_margin = (order.quantity * order.price) / order.leverage
        if required_margin > self.account.available_balance:
            logger.warning(f"可用餘額不足: 需要{required_margin}, 可用{self.account.available_balance}")
            return False
        
        # 檢查持倉限制
        if not self._check_position_limits(order):
            return False
        
        # 檢查價格合理性
        if order.price <= 0:
            logger.warning("訂單價格無效")
            return False
        
        return True
    
    def _check_position_limits(self, order: Order) -> bool:
        """檢查持倉限制"""
        # 計算執行後的持倉大小
        current_position = self.account.positions.get(order.symbol)
        
        if current_position:
            if order.side == current_position.side:
                # 同方向加倉
                new_size = current_position.size + order.quantity
            else:
                # 反方向平倉
                new_size = abs(current_position.size - order.quantity)
        else:
            # 新開倉
            new_size = order.quantity
        
        # 檢查持倉大小限制
        max_position_value = self.account.total_equity * self.risk_limits['max_position_size']
        new_position_value = new_size * order.price
        
        if new_position_value > max_position_value:
            logger.warning(f"持倉大小超限: {new_position_value} > {max_position_value}")
            return False
        
        return True
    
    async def _simulate_order_execution(self, order: Order) -> bool:
        """模擬訂單執行"""
        # 模擬執行延遲
        await asyncio.sleep(0.1)
        
        # 模擬成功率（實際實現中應該調用交易所API）
        success_rate = 0.95  # 95% 成功率
        
        import random
        return random.random() < success_rate
    
    def _update_position(self, order: Order):
        """更新持倉"""
        symbol = order.symbol
        current_position = self.account.positions.get(symbol)
        
        if current_position:
            if order.side == current_position.side:
                # 同方向加倉
                total_value = current_position.size * current_position.entry_price + order.quantity * order.price
                total_size = current_position.size + order.quantity
                new_entry_price = total_value / total_size
                
                current_position.size = total_size
                current_position.entry_price = new_entry_price
                current_position.leverage = max(current_position.leverage, order.leverage)
            else:
                # 反方向平倉
                if order.quantity >= current_position.size:
                    # 完全平倉或反向開倉
                    realized_pnl = current_position.calculate_unrealized_pnl(order.price)
                    self.account.realized_pnl += realized_pnl
                    current_position.realized_pnl += realized_pnl
                    
                    if order.quantity > current_position.size:
                        # 反向開倉
                        remaining_quantity = order.quantity - current_position.size
                        current_position.side = order.side
                        current_position.size = remaining_quantity
                        current_position.entry_price = order.price
                        current_position.leverage = order.leverage
                    else:
                        # 完全平倉
                        del self.account.positions[symbol]
                        return
                else:
                    # 部分平倉
                    partial_pnl = current_position.calculate_unrealized_pnl(order.price) * (order.quantity / current_position.size)
                    self.account.realized_pnl += partial_pnl
                    current_position.realized_pnl += partial_pnl
                    current_position.size -= order.quantity
        else:
            # 新開倉
            new_position = Position(
                symbol=symbol,
                side=order.side,
                size=order.quantity,
                entry_price=order.price,
                current_price=order.price,
                leverage=order.leverage
            )
            self.account.positions[symbol] = new_position
        
        # 更新賬戶信息
        self.account.update_from_positions()
        
        # 更新可用餘額
        used_margin = (order.quantity * order.price) / order.leverage
        if order.side == OrderSide.BUY:
            self.account.available_balance -= used_margin
        else:
            self.account.available_balance += used_margin
    
    def update_market_prices(self, prices: Dict[str, float]):
        """更新市場價格"""
        for symbol, price in prices.items():
            if symbol in self.account.positions:
                self.account.positions[symbol].update_current_price(price)
        
        # 更新賬戶信息
        self.account.update_from_positions()
    
    def check_stop_loss_take_profit(self, current_prices: Dict[str, float]) -> List[Order]:
        """檢查止損止盈"""
        orders = []
        
        for symbol, position in self.account.positions.items():
            if symbol not in current_prices:
                continue
            
            current_price = current_prices[symbol]
            
            # 檢查止損
            if self.strategy.should_stop_loss(current_price):
                stop_loss_order = Order(
                    id=self.generate_order_id(),
                    symbol=symbol,
                    side=OrderSide.SELL if position.side == OrderSide.BUY else OrderSide.BUY,
                    type=OrderType.STOP_LOSS,
                    quantity=position.size,
                    price=current_price,
                    metadata={'reason': 'stop_loss'}
                )
                orders.append(stop_loss_order)
                logger.warning(f"觸發止損: {symbol} @ {current_price}")
            
            # 檢查止盈
            elif self.strategy.should_take_profit(current_price):
                take_profit_order = Order(
                    id=self.generate_order_id(),
                    symbol=symbol,
                    side=OrderSide.SELL if position.side == OrderSide.BUY else OrderSide.BUY,
                    type=OrderType.TAKE_PROFIT,
                    quantity=position.size,
                    price=current_price,
                    metadata={'reason': 'take_profit'}
                )
                orders.append(take_profit_order)
                logger.info(f"觸發止盈: {symbol} @ {current_price}")
        
        return orders
    
    def get_execution_status(self) -> Dict[str, Any]:
        """獲取執行狀態"""
        return {
            'account': {
                'total_equity': self.account.total_equity,
                'available_balance': self.account.available_balance,
                'used_margin': self.account.used_margin,
                'unrealized_pnl': self.account.unrealized_pnl,
                'realized_pnl': self.account.realized_pnl,
                'positions_count': len(self.account.positions)
            },
            'orders': {
                'total_orders': len(self.orders),
                'pending_orders': len([o for o in self.orders.values() if o.status == OrderStatus.PENDING]),
                'filled_orders': len([o for o in self.orders.values() if o.status == OrderStatus.FILLED]),
                'failed_orders': len([o for o in self.orders.values() if o.status == OrderStatus.FAILED])
            },
            'statistics': self.trade_stats,
            'risk_status': self._get_risk_status()
        }
    
    def _get_risk_status(self) -> Dict[str, Any]:
        """獲取風險狀態"""
        position_ratio = self.account.used_margin / max(self.account.total_equity, 1.0)
        leverage_usage = self.account.used_margin / max(self.account.available_balance, 1.0)
        drawdown = self.account.unrealized_pnl / max(self.account.total_equity, 1.0)
        
        return {
            'position_ratio': position_ratio,
            'leverage_usage': leverage_usage,
            'drawdown': drawdown,
            'risk_level': self._calculate_risk_level(position_ratio, leverage_usage, drawdown)
        }
    
    def _calculate_risk_level(self, position_ratio: float, leverage_usage: float, drawdown: float) -> str:
        """計算風險等級"""
        if (position_ratio > 0.8 or leverage_usage > 0.8 or drawdown < -0.1):
            return "high"
        elif (position_ratio > 0.5 or leverage_usage > 0.5 or drawdown < -0.05):
            return "medium"
        else:
            return "low"
    
    def get_positions_summary(self) -> Dict[str, Any]:
        """獲取持倉摘要"""
        positions_data = []
        
        for symbol, position in self.account.positions.items():
            positions_data.append({
                'symbol': symbol,
                'side': position.side.value,
                'size': position.size,
                'entry_price': position.entry_price,
                'current_price': position.current_price,
                'leverage': position.leverage,
                'unrealized_pnl': position.unrealized_pnl,
                'margin_used': position.calculate_margin_used(),
                'pnl_percentage': position.unrealized_pnl / (position.size * position.entry_price) * 100
            })
        
        return {
            'positions': positions_data,
            'total_positions': len(positions_data),
            'total_unrealized_pnl': sum(p['unrealized_pnl'] for p in positions_data),
            'total_margin_used': sum(p['margin_used'] for p in positions_data)
        }
    
    async def cleanup_expired_orders(self):
        """清理過期訂單"""
        current_time = datetime.now()
        expired_orders = []
        
        for order in self.orders.values():
            if order.status == OrderStatus.PENDING:
                time_diff = (current_time - order.created_at).total_seconds()
                if time_diff > self.execution_config['order_timeout']:
                    order.status = OrderStatus.CANCELLED
                    expired_orders.append(order.id)
        
        if expired_orders:
            logger.info(f"清理過期訂單: {len(expired_orders)} 個")
        
        return expired_orders