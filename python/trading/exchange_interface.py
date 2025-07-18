"""
交易所接口層

提供統一的交易所API接口，支持多個交易所的集成。
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import aiohttp
import hmac
import hashlib
import time
import json
import logging
from urllib.parse import urlencode

from .execution_engine import Order, OrderStatus, OrderType, OrderSide

logger = logging.getLogger(__name__)


class ExchangeType(Enum):
    """交易所類型"""
    BINANCE = "binance"
    BYBIT = "bybit"
    OKX = "okx"
    MOCK = "mock"  # 模擬交易所


@dataclass
class ExchangeConfig:
    """交易所配置"""
    name: str
    api_key: str
    api_secret: str
    base_url: str
    testnet: bool = True
    rate_limit: int = 100  # 每秒請求限制
    timeout: int = 30  # 請求超時時間
    
    def __post_init__(self):
        if not self.api_key or not self.api_secret:
            logger.warning(f"交易所 {self.name} 的API密鑰未設置")


@dataclass
class MarketData:
    """市場數據"""
    symbol: str
    price: float
    volume: float
    timestamp: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    change_24h: Optional[float] = None


@dataclass
class BalanceInfo:
    """餘額信息"""
    asset: str
    free: float
    used: float
    total: float


@dataclass
class PositionInfo:
    """持倉信息"""
    symbol: str
    side: str
    size: float
    entry_price: float
    mark_price: float
    unrealized_pnl: float
    percentage: float
    leverage: float
    margin: float


class ExchangeInterface(ABC):
    """交易所接口基類"""
    
    def __init__(self, config: ExchangeConfig):
        self.config = config
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = asyncio.Semaphore(config.rate_limit)
        
    async def __aenter__(self):
        await self.connect()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()
    
    async def connect(self):
        """建立連接"""
        if self.session is None:
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        logger.info(f"連接到交易所: {self.config.name}")
    
    async def disconnect(self):
        """斷開連接"""
        if self.session:
            await self.session.close()
            self.session = None
        logger.info(f"斷開交易所連接: {self.config.name}")
    
    @abstractmethod
    async def get_account_balance(self) -> List[BalanceInfo]:
        """獲取賬戶餘額"""
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[PositionInfo]:
        """獲取持倉信息"""
        pass
    
    @abstractmethod
    async def get_market_data(self, symbol: str) -> MarketData:
        """獲取市場數據"""
        pass
    
    @abstractmethod
    async def place_order(self, order: Order) -> Dict[str, Any]:
        """下單"""
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """取消訂單"""
        pass
    
    @abstractmethod
    async def get_order_status(self, order_id: str, symbol: str) -> Dict[str, Any]:
        """獲取訂單狀態"""
        pass
    
    @abstractmethod
    async def get_trading_fees(self, symbol: str) -> Dict[str, float]:
        """獲取交易手續費"""
        pass
    
    async def _make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, 
                           data: Optional[Dict] = None, signed: bool = False) -> Dict[str, Any]:
        """發送HTTP請求"""
        async with self.rate_limiter:
            if not self.session:
                await self.connect()
            
            url = f"{self.config.base_url}{endpoint}"
            
            if signed:
                params = params or {}
                params['timestamp'] = int(time.time() * 1000)
                params = self._sign_request(params)
            
            try:
                async with self.session.request(method, url, params=params, json=data) as response:
                    response.raise_for_status()
                    return await response.json()
            except Exception as e:
                logger.error(f"請求失敗: {method} {url}, 錯誤: {e}")
                raise
    
    def _sign_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """簽名請求"""
        query_string = urlencode(sorted(params.items()))
        signature = hmac.new(
            self.config.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        params['signature'] = signature
        return params


class BinanceInterface(ExchangeInterface):
    """Binance交易所接口"""
    
    def __init__(self, config: ExchangeConfig):
        super().__init__(config)
        self.headers = {
            'X-MBX-APIKEY': config.api_key,
            'Content-Type': 'application/json'
        }
    
    async def get_account_balance(self) -> List[BalanceInfo]:
        """獲取賬戶餘額"""
        try:
            result = await self._make_request('GET', '/fapi/v2/balance', signed=True)
            balances = []
            
            for item in result:
                if float(item['balance']) > 0:
                    balances.append(BalanceInfo(
                        asset=item['asset'],
                        free=float(item['availableBalance']),
                        used=float(item['balance']) - float(item['availableBalance']),
                        total=float(item['balance'])
                    ))
            
            return balances
        except Exception as e:
            logger.error(f"獲取餘額失敗: {e}")
            return []
    
    async def get_positions(self) -> List[PositionInfo]:
        """獲取持倉信息"""
        try:
            result = await self._make_request('GET', '/fapi/v2/positionRisk', signed=True)
            positions = []
            
            for item in result:
                if float(item['positionAmt']) != 0:
                    positions.append(PositionInfo(
                        symbol=item['symbol'],
                        side='long' if float(item['positionAmt']) > 0 else 'short',
                        size=abs(float(item['positionAmt'])),
                        entry_price=float(item['entryPrice']),
                        mark_price=float(item['markPrice']),
                        unrealized_pnl=float(item['unRealizedProfit']),
                        percentage=float(item['percentage']),
                        leverage=float(item['leverage']),
                        margin=float(item['isolatedMargin'])
                    ))
            
            return positions
        except Exception as e:
            logger.error(f"獲取持倉失敗: {e}")
            return []
    
    async def get_market_data(self, symbol: str) -> MarketData:
        """獲取市場數據"""
        try:
            # 獲取價格數據
            ticker_result = await self._make_request('GET', '/fapi/v1/ticker/24hr', 
                                                   params={'symbol': symbol})
            
            return MarketData(
                symbol=symbol,
                price=float(ticker_result['lastPrice']),
                volume=float(ticker_result['volume']),
                timestamp=float(ticker_result['closeTime']),
                bid=float(ticker_result['bidPrice']),
                ask=float(ticker_result['askPrice']),
                high_24h=float(ticker_result['highPrice']),
                low_24h=float(ticker_result['lowPrice']),
                change_24h=float(ticker_result['priceChangePercent'])
            )
        except Exception as e:
            logger.error(f"獲取市場數據失敗: {e}")
            raise
    
    async def place_order(self, order: Order) -> Dict[str, Any]:
        """下單"""
        try:
            params = {
                'symbol': order.symbol,
                'side': order.side.value.upper(),
                'type': self._convert_order_type(order.type),
                'quantity': str(order.quantity),
                'timeInForce': 'GTC'
            }
            
            if order.type == OrderType.LIMIT and order.price:
                params['price'] = str(order.price)
            
            result = await self._make_request('POST', '/fapi/v1/order', params=params, signed=True)
            
            # 更新訂單狀態
            order.exchange_order_id = result['orderId']
            order.status = OrderStatus.PENDING
            
            return result
        except Exception as e:
            logger.error(f"下單失敗: {e}")
            order.status = OrderStatus.FAILED
            raise
    
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """取消訂單"""
        try:
            params = {
                'symbol': symbol,
                'orderId': order_id
            }
            
            await self._make_request('DELETE', '/fapi/v1/order', params=params, signed=True)
            return True
        except Exception as e:
            logger.error(f"取消訂單失敗: {e}")
            return False
    
    async def get_order_status(self, order_id: str, symbol: str) -> Dict[str, Any]:
        """獲取訂單狀態"""
        try:
            params = {
                'symbol': symbol,
                'orderId': order_id
            }
            
            result = await self._make_request('GET', '/fapi/v1/order', params=params, signed=True)
            return result
        except Exception as e:
            logger.error(f"獲取訂單狀態失敗: {e}")
            return {}
    
    async def get_trading_fees(self, symbol: str) -> Dict[str, float]:
        """獲取交易手續費"""
        try:
            result = await self._make_request('GET', '/fapi/v1/commissionRate', 
                                            params={'symbol': symbol}, signed=True)
            return {
                'maker': float(result['makerCommissionRate']),
                'taker': float(result['takerCommissionRate'])
            }
        except Exception as e:
            logger.error(f"獲取手續費失敗: {e}")
            return {'maker': 0.0002, 'taker': 0.0004}  # 默認手續費
    
    def _convert_order_type(self, order_type: OrderType) -> str:
        """轉換訂單類型"""
        type_map = {
            OrderType.MARKET: 'MARKET',
            OrderType.LIMIT: 'LIMIT',
            OrderType.STOP_LOSS: 'STOP_MARKET',
            OrderType.TAKE_PROFIT: 'TAKE_PROFIT_MARKET'
        }
        return type_map.get(order_type, 'MARKET')


class MockExchangeInterface(ExchangeInterface):
    """模擬交易所接口"""
    
    def __init__(self, config: ExchangeConfig):
        super().__init__(config)
        self.balances = {
            'USDT': BalanceInfo('USDT', 10000.0, 0.0, 10000.0)
        }
        self.positions = {}
        self.orders = {}
        self.market_prices = {
            'BTCUSDT': 50000.0,
            'ETHUSDT': 3000.0
        }
    
    async def get_account_balance(self) -> List[BalanceInfo]:
        """獲取賬戶餘額"""
        return list(self.balances.values())
    
    async def get_positions(self) -> List[PositionInfo]:
        """獲取持倉信息"""
        return list(self.positions.values())
    
    async def get_market_data(self, symbol: str) -> MarketData:
        """獲取市場數據"""
        price = self.market_prices.get(symbol, 50000.0)
        
        # 模擬價格波動
        import random
        price_change = random.uniform(-0.01, 0.01)
        price *= (1 + price_change)
        self.market_prices[symbol] = price
        
        return MarketData(
            symbol=symbol,
            price=price,
            volume=random.uniform(1000, 10000),
            timestamp=time.time() * 1000,
            bid=price * 0.999,
            ask=price * 1.001,
            high_24h=price * 1.02,
            low_24h=price * 0.98,
            change_24h=random.uniform(-2, 2)
        )
    
    async def place_order(self, order: Order) -> Dict[str, Any]:
        """下單"""
        # 模擬訂單執行
        await asyncio.sleep(0.1)
        
        order_id = f"MOCK_{int(time.time() * 1000)}"
        order.exchange_order_id = order_id
        
        # 模擬成交
        success_rate = 0.95
        import random
        if random.random() < success_rate:
            order.status = OrderStatus.FILLED
            order.filled_quantity = order.quantity
            order.filled_price = order.price
            
            # 更新模擬持倉
            self._update_mock_position(order)
            
            return {
                'orderId': order_id,
                'status': 'FILLED',
                'executedQty': str(order.quantity),
                'avgPrice': str(order.price)
            }
        else:
            order.status = OrderStatus.FAILED
            return {
                'orderId': order_id,
                'status': 'FAILED',
                'msg': 'Insufficient balance'
            }
    
    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """取消訂單"""
        return True
    
    async def get_order_status(self, order_id: str, symbol: str) -> Dict[str, Any]:
        """獲取訂單狀態"""
        return {
            'orderId': order_id,
            'status': 'FILLED',
            'executedQty': '1.0',
            'avgPrice': '50000.0'
        }
    
    async def get_trading_fees(self, symbol: str) -> Dict[str, float]:
        """獲取交易手續費"""
        return {'maker': 0.0002, 'taker': 0.0004}
    
    def _update_mock_position(self, order: Order):
        """更新模擬持倉"""
        symbol = order.symbol
        
        if symbol in self.positions:
            pos = self.positions[symbol]
            if order.side.value == pos.side:
                # 同方向加倉
                total_value = pos.size * pos.entry_price + order.quantity * order.price
                total_size = pos.size + order.quantity
                pos.entry_price = total_value / total_size
                pos.size = total_size
            else:
                # 反方向平倉
                if order.quantity >= pos.size:
                    # 完全平倉
                    del self.positions[symbol]
                else:
                    # 部分平倉
                    pos.size -= order.quantity
        else:
            # 新開倉
            self.positions[symbol] = PositionInfo(
                symbol=symbol,
                side=order.side.value,
                size=order.quantity,
                entry_price=order.price,
                mark_price=order.price,
                unrealized_pnl=0.0,
                percentage=0.0,
                leverage=order.leverage,
                margin=order.quantity * order.price / order.leverage
            )


class ExchangeManager:
    """交易所管理器"""
    
    def __init__(self):
        self.exchanges: Dict[str, ExchangeInterface] = {}
        self.default_exchange: Optional[str] = None
    
    def add_exchange(self, name: str, exchange: ExchangeInterface, is_default: bool = False):
        """添加交易所"""
        self.exchanges[name] = exchange
        if is_default or self.default_exchange is None:
            self.default_exchange = name
        logger.info(f"添加交易所: {name}")
    
    def get_exchange(self, name: Optional[str] = None) -> Optional[ExchangeInterface]:
        """獲取交易所接口"""
        if name is None:
            name = self.default_exchange
        return self.exchanges.get(name) if name else None
    
    async def connect_all(self):
        """連接所有交易所"""
        for name, exchange in self.exchanges.items():
            try:
                await exchange.connect()
                logger.info(f"交易所 {name} 連接成功")
            except Exception as e:
                logger.error(f"交易所 {name} 連接失敗: {e}")
    
    async def disconnect_all(self):
        """斷開所有交易所連接"""
        for name, exchange in self.exchanges.items():
            try:
                await exchange.disconnect()
                logger.info(f"交易所 {name} 斷開連接")
            except Exception as e:
                logger.error(f"交易所 {name} 斷開連接失敗: {e}")
    
    def create_exchange(self, exchange_type: ExchangeType, config: ExchangeConfig) -> ExchangeInterface:
        """創建交易所接口"""
        if exchange_type == ExchangeType.BINANCE:
            return BinanceInterface(config)
        elif exchange_type == ExchangeType.MOCK:
            return MockExchangeInterface(config)
        else:
            raise ValueError(f"不支持的交易所類型: {exchange_type}")
    
    async def get_all_balances(self) -> Dict[str, List[BalanceInfo]]:
        """獲取所有交易所餘額"""
        balances = {}
        for name, exchange in self.exchanges.items():
            try:
                balances[name] = await exchange.get_account_balance()
            except Exception as e:
                logger.error(f"獲取 {name} 餘額失敗: {e}")
                balances[name] = []
        return balances
    
    async def get_all_positions(self) -> Dict[str, List[PositionInfo]]:
        """獲取所有交易所持倉"""
        positions = {}
        for name, exchange in self.exchanges.items():
            try:
                positions[name] = await exchange.get_positions()
            except Exception as e:
                logger.error(f"獲取 {name} 持倉失敗: {e}")
                positions[name] = []
        return positions