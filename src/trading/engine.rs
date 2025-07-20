//! 交易執行引擎

use anyhow::Result;
use std::sync::Arc;
use std::str::FromStr;
use tracing::{info, error};
use tokio::sync::RwLock;
use std::collections::HashMap;
use chrono::Utc;
use uuid::Uuid;
use rust_decimal::prelude::FromPrimitive;

use crate::data::DataManager;
use crate::models::{Order, Trade, Position, OrderSide, OrderType, OrderStatus};
use crate::api::{BinanceApi, DiscordNotifier};
use crate::utils::Config;

/// 交易引擎 - 負責執行交易邏輯和管理訂單
#[derive(Debug)]
pub struct TradingEngine {
    config: Arc<Config>,
    data_manager: Arc<DataManager>,
    binance_api: Arc<BinanceApi>,
    discord_notifier: Arc<DiscordNotifier>,
    positions: Arc<RwLock<HashMap<String, Position>>>,
    active_orders: Arc<RwLock<HashMap<Uuid, Order>>>,
    is_running: Arc<RwLock<bool>>,
}

impl TradingEngine {
    /// 創建新的交易引擎
    pub fn new(
        config: Arc<Config>,
        data_manager: Arc<DataManager>,
    ) -> Self {
        let binance_api = Arc::new(BinanceApi::new(config.clone()));
        let discord_notifier = Arc::new(DiscordNotifier::new(config.clone()).unwrap());
        
        Self {
            config,
            data_manager,
            binance_api,
            discord_notifier,
            positions: Arc::new(RwLock::new(HashMap::new())),
            active_orders: Arc::new(RwLock::new(HashMap::new())),
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    /// 啟動交易引擎
    pub async fn start(&self) -> Result<()> {
        {
            let mut running = self.is_running.write().await;
            if *running {
                return Err(anyhow::anyhow!("交易引擎已經在運行中"));
            }
            *running = true;
        }

        info!("啟動交易引擎...");

        // 加載現有持倉
        self.load_positions().await?;

        // 啟動訂單監控
        let engine = Arc::new(self.clone());
        tokio::spawn(async move {
            if let Err(e) = engine.monitor_orders().await {
                error!("訂單監控錯誤: {}", e);
            }
        });

        // 發送啟動通知
        self.discord_notifier.send_system_notification(
            "交易引擎啟動",
            "交易引擎已成功啟動，準備執行交易策略。",
            crate::api::discord::NotificationLevel::Success,
        ).await?;

        info!("交易引擎啟動成功");
        Ok(())
    }

    /// 停止交易引擎
    pub async fn stop(&self) -> Result<()> {
        info!("停止交易引擎...");
        
        {
            let mut running = self.is_running.write().await;
            *running = false;
        }

        // 取消所有活躍訂單
        self.cancel_all_orders().await?;

        // 發送停止通知
        self.discord_notifier.send_system_notification(
            "交易引擎停止",
            "交易引擎已安全停止。",
            crate::api::discord::NotificationLevel::Info,
        ).await?;

        info!("交易引擎已停止");
        Ok(())
    }

    /// 執行交易
    pub async fn execute_trade(
        &self,
        symbol: &str,
        side: OrderSide,
        quantity: rust_decimal::Decimal,
        order_type: OrderType,
        price: Option<rust_decimal::Decimal>,
        strategy_id: Option<String>,
    ) -> Result<Order> {
        info!("執行交易: {} {} {} {:?}", symbol, side, quantity, order_type);

        // 風險檢查
        self.check_risk_limits(symbol, side, quantity).await?;

        // 創建訂單
        let order = Order {
            id: Uuid::new_v4(),
            client_order_id: Uuid::new_v4().to_string(),
            symbol: symbol.to_string(),
            side,
            order_type,
            quantity,
            price,
            status: OrderStatus::New,
            filled_quantity: rust_decimal::Decimal::ZERO,
            average_price: None,
            timestamp: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            time_in_force: crate::models::TimeInForce::GoodTillCancel,
            strategy_id,
        };

        // 提交訂單到交易所
        let submitted_order = self.submit_order(&order).await?;

        // 保存訂單
        {
            let mut orders = self.active_orders.write().await;
            orders.insert(submitted_order.id, submitted_order.clone());
        }

        // 發送訂單通知
        self.discord_notifier.send_order_notification(&submitted_order).await?;

        info!("訂單已提交: {}", submitted_order.id);
        Ok(submitted_order)
    }

    /// 提交訂單到交易所
    async fn submit_order(&self, order: &Order) -> Result<Order> {
        // 根據配置決定是否實際提交訂單
        let live_trading = self.config.trading.live_trading;
        
        if live_trading {
            // 實際提交到交易所
            self.binance_api.submit_order(order).await
        } else {
            // 紙上交易模式
            self.simulate_order_execution(order).await
        }
    }

    /// 模擬訂單執行（紙上交易）
    async fn simulate_order_execution(&self, order: &Order) -> Result<Order> {
        let mut executed_order = order.clone();
        
        // 獲取當前市場價格
        let current_price = self.data_manager.get_latest_price(&order.symbol).await?
            .unwrap_or(rust_decimal::Decimal::from(50000)); // 默認價格

        // 模擬訂單執行
        executed_order.status = OrderStatus::Filled;
        executed_order.filled_quantity = order.quantity;
        executed_order.average_price = Some(current_price);
        executed_order.updated_at = Utc::now();

        info!("模擬訂單執行: {} {} @ {}", order.symbol, order.quantity, current_price);

        // 創建交易記錄
        let trade = Trade {
            id: Uuid::new_v4(),
            order_id: order.id,
            exchange_trade_id: Uuid::new_v4().to_string(),
            symbol: order.symbol.clone(),
            side: order.side,
            quantity: order.quantity,
            price: current_price,
            fee: current_price * order.quantity * rust_decimal::Decimal::from_str("0.001").unwrap(),
            fee_currency: "USDT".to_string(),
            timestamp: Utc::now(),
            strategy_id: order.strategy_id.clone(),
        };

        // 更新持倉
        self.update_position(&trade).await?;

        // 保存交易記錄
        self.data_manager.save_trade(&trade).await?;

        // 發送交易通知
        self.discord_notifier.send_trade_notification(&trade).await?;

        Ok(executed_order)
    }

    /// 更新持倉
    async fn update_position(&self, trade: &Trade) -> Result<()> {
        let mut positions = self.positions.write().await;
        let position = positions.entry(trade.symbol.clone()).or_insert_with(|| {
            Position {
                symbol: trade.symbol.clone(),
                side: crate::models::PositionSide::Flat,
                quantity: rust_decimal::Decimal::ZERO,
                average_price: rust_decimal::Decimal::ZERO,
                unrealized_pnl: rust_decimal::Decimal::ZERO,
                realized_pnl: rust_decimal::Decimal::ZERO,
                updated_at: Utc::now(),
            }
        });

        // 更新持倉邏輯
        match trade.side {
            OrderSide::Buy => {
                if position.side == crate::models::PositionSide::Short {
                    // 平空倉
                    let close_quantity = std::cmp::min(position.quantity, trade.quantity);
                    let pnl = (position.average_price - trade.price) * close_quantity;
                    position.realized_pnl += pnl;
                    position.quantity -= close_quantity;
                    
                    if position.quantity == rust_decimal::Decimal::ZERO {
                        position.side = crate::models::PositionSide::Flat;
                        position.average_price = rust_decimal::Decimal::ZERO;
                    }
                } else {
                    // 開多倉或加多倉
                    let total_value = position.average_price * position.quantity + trade.price * trade.quantity;
                    position.quantity += trade.quantity;
                    position.average_price = total_value / position.quantity;
                    position.side = crate::models::PositionSide::Long;
                }
            }
            OrderSide::Sell => {
                if position.side == crate::models::PositionSide::Long {
                    // 平多倉
                    let close_quantity = std::cmp::min(position.quantity, trade.quantity);
                    let pnl = (trade.price - position.average_price) * close_quantity;
                    position.realized_pnl += pnl;
                    position.quantity -= close_quantity;
                    
                    if position.quantity == rust_decimal::Decimal::ZERO {
                        position.side = crate::models::PositionSide::Flat;
                        position.average_price = rust_decimal::Decimal::ZERO;
                    }
                } else {
                    // 開空倉或加空倉
                    let total_value = position.average_price * position.quantity + trade.price * trade.quantity;
                    position.quantity += trade.quantity;
                    position.average_price = total_value / position.quantity;
                    position.side = crate::models::PositionSide::Short;
                }
            }
        }

        position.updated_at = Utc::now();

        info!("持倉更新: {} {} {}", position.symbol, position.side, position.quantity);
        
        // 發送持倉通知
        self.discord_notifier.send_position_notification(position).await?;

        Ok(())
    }

    /// 風險檢查
    async fn check_risk_limits(
        &self,
        symbol: &str,
        _side: OrderSide,
        quantity: rust_decimal::Decimal,
    ) -> Result<()> {
        let max_position_size = self.config.trading.max_position_size;
        let current_price = self.data_manager.get_latest_price(symbol).await?
            .unwrap_or(rust_decimal::Decimal::from(50000));

        let position_value = current_price * quantity;
        
        if position_value > rust_decimal::Decimal::from_f64(max_position_size).unwrap() {
            return Err(anyhow::anyhow!("訂單超過最大持倉限制: {} > {}", position_value, max_position_size));
        }

        // 檢查賬戶餘額
        // TODO: 實現賬戶餘額檢查

        Ok(())
    }

    /// 加載現有持倉
    async fn load_positions(&self) -> Result<()> {
        info!("加載現有持倉...");
        
        // TODO: 從數據庫加載持倉
        
        Ok(())
    }

    /// 監控訂單狀態
    async fn monitor_orders(&self) -> Result<()> {
        info!("啟動訂單監控...");
        
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        
        loop {
            interval.tick().await;
            
            {
                let running = self.is_running.read().await;
                if !*running {
                    break;
                }
            }

            // 檢查活躍訂單狀態
            let active_orders = {
                let orders = self.active_orders.read().await;
                orders.values().cloned().collect::<Vec<_>>()
            };

            for order in active_orders {
                if let Err(e) = self.check_order_status(&order).await {
                    error!("檢查訂單狀態失敗: {}", e);
                }
            }
        }

        info!("訂單監控已停止");
        Ok(())
    }

    /// 檢查訂單狀態
    async fn check_order_status(&self, _order: &Order) -> Result<()> {
        // 在紙上交易模式下，訂單會立即執行，不需要檢查狀態
        if !self.config.trading.live_trading {
            return Ok(());
        }

        // TODO: 實現實時訂單狀態檢查
        Ok(())
    }

    /// 取消所有訂單
    async fn cancel_all_orders(&self) -> Result<()> {
        info!("取消所有活躍訂單...");
        
        let orders = {
            let active_orders = self.active_orders.read().await;
            active_orders.values().cloned().collect::<Vec<_>>()
        };

        for order in orders {
            if let Err(e) = self.cancel_order(&order).await {
                error!("取消訂單失敗: {}", e);
            }
        }

        Ok(())
    }

    /// 取消訂單
    async fn cancel_order(&self, order: &Order) -> Result<()> {
        info!("取消訂單: {}", order.id);
        
        // TODO: 實現訂單取消邏輯
        
        // 從活躍訂單中移除
        {
            let mut orders = self.active_orders.write().await;
            orders.remove(&order.id);
        }

        Ok(())
    }

    /// 獲取當前持倉
    pub async fn get_positions(&self) -> HashMap<String, Position> {
        let positions = self.positions.read().await;
        positions.clone()
    }

    /// 獲取活躍訂單
    pub async fn get_active_orders(&self) -> HashMap<Uuid, Order> {
        let orders = self.active_orders.read().await;
        orders.clone()
    }

    /// 健康檢查
    pub async fn health_check(&self) -> Result<bool> {
        let running = self.is_running.read().await;
        Ok(*running)
    }
}

// 實現Clone trait以支持Arc共享
impl Clone for TradingEngine {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            data_manager: self.data_manager.clone(),
            binance_api: self.binance_api.clone(),
            discord_notifier: self.discord_notifier.clone(),
            positions: self.positions.clone(),
            active_orders: self.active_orders.clone(),
            is_running: self.is_running.clone(),
        }
    }
}

/// 交易執行器實現
pub struct TradeExecutor {
    // TODO: 實現交易執行邏輯
}

impl TradeExecutor {
    /// 創建新的交易執行器
    pub fn new() -> Self {
        Self {}
    }
    
    /// 執行交易
    pub async fn execute_trade(&self) -> Result<()> {
        // TODO: 實現交易執行
        Ok(())
    }
}