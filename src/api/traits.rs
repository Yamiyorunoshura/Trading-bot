//! API特徵定義

use anyhow::Result;
use async_trait::async_trait;

use crate::models::{Order, Trade, Account, OrderBook, Candle};

/// 交易所API特徵
#[async_trait]
pub trait ExchangeApi: Send + Sync {
    /// 獲取賬戶信息
    async fn get_account_info(&self) -> Result<Account>;
    
    /// 下單
    async fn place_order(&self, order: &Order) -> Result<Order>;
    
    /// 取消訂單
    async fn cancel_order(&self, order_id: &str) -> Result<()>;
    
    /// 獲取訂單狀態
    async fn get_order_status(&self, order_id: &str) -> Result<Order>;
    
    /// 獲取交易歷史
    async fn get_trade_history(&self, symbol: &str, limit: Option<u32>) -> Result<Vec<Trade>>;
    
    /// 獲取訂單簿
    async fn get_orderbook(&self, symbol: &str) -> Result<OrderBook>;
    
    /// 獲取K線數據
    async fn get_candles(&self, symbol: &str, interval: &str, limit: Option<u32>) -> Result<Vec<Candle>>;
}
