"""
交易協調器

整合動態倉位策略、交易執行引擎、風險管理和交易所接口，提供統一的交易管理。
"""

from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import asyncio
import logging
import pandas as pd
from contextlib import asynccontextmanager

from ..strategies.dynamic_position_strategy import DynamicPositionStrategy
from ..strategies.dynamic_position_config import DynamicPositionConfig
from .execution_engine import ExecutionEngine, Order, OrderStatus
from .exchange_interface import ExchangeManager, ExchangeInterface, MarketData
from .risk_management import RiskManager, RiskAlert, RiskLevel

logger = logging.getLogger(__name__)


class TradingState(Enum):
    """交易狀態"""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    PAUSED = "paused"
    EMERGENCY = "emergency"
    SHUTTING_DOWN = "shutting_down"


@dataclass
class TradingStatus:
    """交易狀態信息"""
    state: TradingState
    start_time: Optional[datetime] = None
    uptime: Optional[timedelta] = None
    processed_signals: int = 0
    executed_orders: int = 0
    failed_orders: int = 0
    last_update: datetime = None
    
    def update_uptime(self):
        """更新運行時間"""
        if self.start_time:
            self.uptime = datetime.now() - self.start_time
        self.last_update = datetime.now()


class TradingCoordinator:
    """交易協調器"""
    
    def __init__(
        self,
        strategy_config: DynamicPositionConfig,
        exchange_manager: ExchangeManager,
        initial_balance: float = 10000.0,
        update_interval: float = 1.0  # 更新間隔（秒）
    ):
        # 初始化組件
        self.strategy = self._create_strategy(strategy_config)
        self.execution_engine = ExecutionEngine(self.strategy, initial_balance)
        self.risk_manager = RiskManager()
        self.exchange_manager = exchange_manager
        
        # 配置
        self.config = strategy_config
        self.update_interval = update_interval
        
        # 狀態管理
        self.status = TradingStatus(state=TradingState.STOPPED)
        self.running = False
        self.main_task: Optional[asyncio.Task] = None
        
        # 數據管理
        self.market_data: Dict[str, MarketData] = {}
        self.price_history: Dict[str, List[float]] = {}
        
        # 事件回調
        self.event_callbacks: Dict[str, List[Callable]] = {
            'order_executed': [],
            'signal_generated': [],
            'risk_alert': [],
            'position_updated': [],
            'error_occurred': []
        }
        
        # 註冊風險管理器回調
        self.risk_manager.add_alert_callback(self._handle_risk_alert)
        
        logger.info(f"交易協調器初始化完成 - 策略: {strategy_config.name}")
    
    def _create_strategy(self, config: DynamicPositionConfig) -> DynamicPositionStrategy:
        """創建策略實例"""
        from ..strategies.dynamic_position_config import create_strategy_from_config
        return create_strategy_from_config(config)
    
    def add_event_callback(self, event_type: str, callback: Callable):
        """添加事件回調"""
        if event_type in self.event_callbacks:
            self.event_callbacks[event_type].append(callback)
        else:
            logger.warning(f"未知事件類型: {event_type}")
    
    def _trigger_event(self, event_type: str, data: Any):
        """觸發事件"""
        if event_type in self.event_callbacks:
            for callback in self.event_callbacks[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    logger.error(f"事件回調執行失敗: {event_type}, 錯誤: {e}")
    
    async def start(self):
        """啟動交易協調器"""
        if self.running:
            logger.warning("交易協調器已在運行")
            return
        
        logger.info("正在啟動交易協調器...")
        self.status.state = TradingState.STARTING
        
        try:
            # 連接交易所
            await self.exchange_manager.connect_all()
            
            # 初始化市場數據
            await self._initialize_market_data()
            
            # 啟動主循環
            self.running = True
            self.main_task = asyncio.create_task(self._main_loop())
            
            self.status.state = TradingState.RUNNING
            self.status.start_time = datetime.now()
            logger.info("交易協調器啟動成功")
            
        except Exception as e:
            logger.error(f"啟動交易協調器失敗: {e}")
            self.status.state = TradingState.STOPPED
            self.running = False
            raise
    
    async def stop(self):
        """停止交易協調器"""
        if not self.running:
            logger.warning("交易協調器未在運行")
            return
        
        logger.info("正在停止交易協調器...")
        self.status.state = TradingState.SHUTTING_DOWN
        
        try:
            # 停止主循環
            self.running = False
            if self.main_task:
                self.main_task.cancel()
                try:
                    await self.main_task
                except asyncio.CancelledError:
                    pass
            
            # 清理過期訂單
            await self.execution_engine.cleanup_expired_orders()
            
            # 斷開交易所連接
            await self.exchange_manager.disconnect_all()
            
            self.status.state = TradingState.STOPPED
            self.status.update_uptime()
            logger.info("交易協調器已停止")
            
        except Exception as e:
            logger.error(f"停止交易協調器失敗: {e}")
            raise
    
    async def pause(self):
        """暫停交易"""
        if self.status.state == TradingState.RUNNING:
            self.status.state = TradingState.PAUSED
            logger.info("交易已暫停")
    
    async def resume(self):
        """恢復交易"""
        if self.status.state == TradingState.PAUSED:
            self.status.state = TradingState.RUNNING
            logger.info("交易已恢復")
    
    async def emergency_stop(self):
        """緊急停止"""
        logger.critical("執行緊急停止")
        self.status.state = TradingState.EMERGENCY
        
        # 取消所有待執行訂單
        for order in self.execution_engine.orders.values():
            if order.status == OrderStatus.PENDING:
                exchange = self.exchange_manager.get_exchange()
                if exchange:
                    await exchange.cancel_order(order.exchange_order_id, order.symbol)
        
        # 停止協調器
        await self.stop()
    
    async def _initialize_market_data(self):
        """初始化市場數據"""
        exchange = self.exchange_manager.get_exchange()
        if not exchange:
            raise RuntimeError("未找到可用的交易所")
        
        symbol = self.config.symbol
        try:
            market_data = await exchange.get_market_data(symbol)
            self.market_data[symbol] = market_data
            self.risk_manager.update_market_data(symbol, market_data)
            
            # 初始化價格歷史
            if symbol not in self.price_history:
                self.price_history[symbol] = []
            self.price_history[symbol].append(market_data.price)
            
            logger.info(f"初始化市場數據: {symbol} @ {market_data.price}")
            
        except Exception as e:
            logger.error(f"初始化市場數據失敗: {e}")
            raise
    
    async def _main_loop(self):
        """主循環"""
        logger.info("交易主循環開始")
        
        while self.running:
            try:
                # 更新狀態
                self.status.update_uptime()
                
                # 檢查是否暫停
                if self.status.state == TradingState.PAUSED:
                    await asyncio.sleep(self.update_interval)
                    continue
                
                # 檢查緊急模式
                if self.risk_manager.emergency_mode:
                    await self.emergency_stop()
                    break
                
                # 更新市場數據
                await self._update_market_data()
                
                # 檢查風險
                await self._check_risks()
                
                # 檢查止損止盈
                await self._check_stop_loss_take_profit()
                
                # 生成和處理交易信號
                await self._process_trading_signals()
                
                # 清理過期訂單
                await self.execution_engine.cleanup_expired_orders()
                
                await asyncio.sleep(self.update_interval)
                
            except asyncio.CancelledError:
                logger.info("主循環被取消")
                break
            except Exception as e:
                logger.error(f"主循環執行錯誤: {e}")
                self._trigger_event('error_occurred', {'error': str(e), 'timestamp': datetime.now()})
                await asyncio.sleep(self.update_interval)
        
        logger.info("交易主循環結束")
    
    async def _update_market_data(self):
        """更新市場數據"""
        exchange = self.exchange_manager.get_exchange()
        if not exchange:
            return
        
        symbol = self.config.symbol
        try:
            market_data = await exchange.get_market_data(symbol)
            self.market_data[symbol] = market_data
            self.risk_manager.update_market_data(symbol, market_data)
            
            # 更新價格歷史
            if symbol not in self.price_history:
                self.price_history[symbol] = []
            self.price_history[symbol].append(market_data.price)
            
            # 限制歷史長度
            if len(self.price_history[symbol]) > 1000:
                self.price_history[symbol] = self.price_history[symbol][-1000:]
            
            # 更新執行引擎的市場價格
            self.execution_engine.update_market_prices({symbol: market_data.price})
            
        except Exception as e:
            logger.error(f"更新市場數據失敗: {e}")
    
    async def _check_risks(self):
        """檢查風險"""
        try:
            current_prices = {symbol: data.price for symbol, data in self.market_data.items()}
            alerts = self.risk_manager.check_risk_violations(
                self.execution_engine.account, 
                current_prices
            )
            
            for alert in alerts:
                self._trigger_event('risk_alert', alert)
                
        except Exception as e:
            logger.error(f"風險檢查失敗: {e}")
    
    async def _check_stop_loss_take_profit(self):
        """檢查止損止盈"""
        try:
            current_prices = {symbol: data.price for symbol, data in self.market_data.items()}
            
            # 檢查止損
            stop_loss_orders = self.risk_manager.get_stop_loss_orders(
                self.execution_engine.account, 
                current_prices
            )
            
            for order in stop_loss_orders:
                await self._execute_order(order)
                self._trigger_event('order_executed', {
                    'order': order,
                    'reason': 'stop_loss',
                    'timestamp': datetime.now()
                })
            
            # 檢查止盈
            take_profit_orders = self.risk_manager.get_take_profit_orders(
                self.execution_engine.account, 
                current_prices
            )
            
            for order in take_profit_orders:
                await self._execute_order(order)
                self._trigger_event('order_executed', {
                    'order': order,
                    'reason': 'take_profit',
                    'timestamp': datetime.now()
                })
                
        except Exception as e:
            logger.error(f"止損止盈檢查失敗: {e}")
    
    async def _process_trading_signals(self):
        """處理交易信號"""
        try:
            # 獲取歷史價格數據
            symbol = self.config.symbol
            if symbol not in self.price_history or len(self.price_history[symbol]) < 100:
                return
            
            # 構建DataFrame
            prices = self.price_history[symbol][-1000:]  # 最近1000個價格點
            market_data = self.market_data[symbol]
            
            # 創建OHLCV數據（簡化版）
            data = pd.DataFrame({
                'close': prices,
                'open': prices,  # 簡化：使用收盤價作為開盤價
                'high': [p * 1.01 for p in prices],  # 簡化：假設高點
                'low': [p * 0.99 for p in prices],   # 簡化：假設低點
                'volume': [market_data.volume] * len(prices)
            })
            
            # 生成交易信號
            signals = self.strategy.generate_signals(data)
            
            if signals:
                logger.info(f"生成 {len(signals)} 個交易信號")
                self.status.processed_signals += len(signals)
                
                # 處理每個信號
                current_price = market_data.price
                orders = await self.execution_engine.process_signals(signals, current_price)
                
                # 執行訂單
                for order in orders:
                    # 驗證訂單風險
                    current_prices = {symbol: data.price for symbol, data in self.market_data.items()}
                    valid, reason = self.risk_manager.validate_order(
                        order, 
                        self.execution_engine.account, 
                        current_prices
                    )
                    
                    if valid:
                        success = await self._execute_order(order)
                        if success:
                            self.status.executed_orders += 1
                            self._trigger_event('order_executed', {
                                'order': order,
                                'reason': 'signal',
                                'timestamp': datetime.now()
                            })
                        else:
                            self.status.failed_orders += 1
                    else:
                        logger.warning(f"訂單風險驗證失敗: {reason}")
                        self.status.failed_orders += 1
                
                # 觸發信號事件
                self._trigger_event('signal_generated', {
                    'signals': signals,
                    'orders': orders,
                    'timestamp': datetime.now()
                })
                
        except Exception as e:
            logger.error(f"處理交易信號失敗: {e}")
    
    async def _execute_order(self, order: Order) -> bool:
        """執行訂單"""
        try:
            # 通過執行引擎執行訂單
            success = await self.execution_engine.execute_order(order)
            
            if success:
                # 如果使用真實交易所，也需要提交到交易所
                exchange = self.exchange_manager.get_exchange()
                if exchange and hasattr(exchange, 'place_order'):
                    try:
                        await exchange.place_order(order)
                    except Exception as e:
                        logger.error(f"提交訂單到交易所失敗: {e}")
                        return False
                
                # 觸發持倉更新事件
                self._trigger_event('position_updated', {
                    'account': self.execution_engine.account,
                    'order': order,
                    'timestamp': datetime.now()
                })
                
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"執行訂單失敗: {e}")
            return False
    
    def _handle_risk_alert(self, alert: RiskAlert):
        """處理風險警報"""
        logger.warning(f"風險警報: {alert}")
        
        if alert.level == RiskLevel.CRITICAL:
            logger.critical("收到緊急風險警報，準備緊急停止")
            # 不在這裡直接調用emergency_stop，而是設置標誌讓主循環處理
            # 避免在回調中進行複雜的異步操作
    
    def get_trading_status(self) -> Dict[str, Any]:
        """獲取交易狀態"""
        return {
            'state': self.status.state.value,
            'start_time': self.status.start_time.isoformat() if self.status.start_time else None,
            'uptime': str(self.status.uptime) if self.status.uptime else None,
            'processed_signals': self.status.processed_signals,
            'executed_orders': self.status.executed_orders,
            'failed_orders': self.status.failed_orders,
            'last_update': self.status.last_update.isoformat() if self.status.last_update else None,
            'strategy': self.strategy.get_strategy_status(),
            'execution': self.execution_engine.get_execution_status(),
            'risk': self.risk_manager.get_risk_report()
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """獲取績效指標"""
        account = self.execution_engine.account
        strategy_metrics = self.strategy.get_performance_metrics()
        
        return {
            'account_metrics': {
                'total_equity': account.total_equity,
                'available_balance': account.available_balance,
                'used_margin': account.used_margin,
                'unrealized_pnl': account.unrealized_pnl,
                'realized_pnl': account.realized_pnl,
                'total_pnl': account.unrealized_pnl + account.realized_pnl,
                'return_percentage': (account.unrealized_pnl + account.realized_pnl) / 10000.0 * 100
            },
            'strategy_metrics': strategy_metrics,
            'trading_metrics': {
                'total_signals': self.status.processed_signals,
                'total_orders': self.status.executed_orders + self.status.failed_orders,
                'success_rate': self.status.executed_orders / max(self.status.executed_orders + self.status.failed_orders, 1) * 100,
                'positions_count': len(account.positions)
            }
        }
    
    def get_positions_summary(self) -> Dict[str, Any]:
        """獲取持倉摘要"""
        return self.execution_engine.get_positions_summary()
    
    def get_market_data_summary(self) -> Dict[str, Any]:
        """獲取市場數據摘要"""
        return {
            symbol: {
                'price': data.price,
                'volume': data.volume,
                'change_24h': data.change_24h,
                'timestamp': datetime.fromtimestamp(data.timestamp / 1000).isoformat()
            }
            for symbol, data in self.market_data.items()
        }
    
    @asynccontextmanager
    async def trading_session(self):
        """交易會話上下文管理器"""
        try:
            await self.start()
            yield self
        finally:
            await self.stop()
    
    def update_strategy_config(self, new_config: DynamicPositionConfig):
        """更新策略配置"""
        logger.info(f"更新策略配置: {new_config.name}")
        self.config = new_config
        self.strategy = self._create_strategy(new_config)
        self.execution_engine.strategy = self.strategy
    
    def update_risk_limits(self, new_limits: Dict[str, float]):
        """更新風險限制"""
        logger.info("更新風險限制")
        self.risk_manager.update_risk_limits(new_limits)
    
    async def manual_order(self, order: Order) -> bool:
        """手動下單"""
        logger.info(f"手動下單: {order.symbol} {order.side.value} {order.quantity}")
        
        # 驗證訂單
        current_prices = {symbol: data.price for symbol, data in self.market_data.items()}
        valid, reason = self.risk_manager.validate_order(
            order, 
            self.execution_engine.account, 
            current_prices
        )
        
        if not valid:
            logger.warning(f"手動訂單驗證失敗: {reason}")
            return False
        
        # 執行訂單
        return await self._execute_order(order)
    
    async def close_position(self, symbol: str) -> bool:
        """平倉"""
        if symbol not in self.execution_engine.account.positions:
            logger.warning(f"沒有找到持倉: {symbol}")
            return False
        
        position = self.execution_engine.account.positions[symbol]
        current_price = self.market_data[symbol].price
        
        # 創建平倉訂單
        close_order = Order(
            id=f"CLOSE_{symbol}_{int(datetime.now().timestamp())}",
            symbol=symbol,
            side=OrderSide.SELL if position.side == OrderSide.BUY else OrderSide.BUY,
            type=OrderType.MARKET,
            quantity=position.size,
            price=current_price,
            leverage=position.leverage,
            metadata={'reason': 'manual_close'}
        )
        
        return await self._execute_order(close_order)
    
    async def close_all_positions(self) -> int:
        """平倉所有持倉"""
        logger.info("平倉所有持倉")
        closed_count = 0
        
        for symbol in list(self.execution_engine.account.positions.keys()):
            if await self.close_position(symbol):
                closed_count += 1
        
        logger.info(f"成功平倉 {closed_count} 個持倉")
        return closed_count