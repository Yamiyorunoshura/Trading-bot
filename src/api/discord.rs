//! Discord API 整合

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, warn};

use crate::models::{Trade, Order, Position};
use crate::utils::Config;

/// Discord通知器
#[derive(Debug)]
pub struct DiscordNotifier {
    client: Client,
    webhook_url: String,
    channel_id: String,
    user_id: Option<String>,
    enabled: bool,
    rate_limiter: Arc<Mutex<RateLimiter>>,
}

/// Discord嵌入消息
#[derive(Debug, Serialize)]
struct DiscordEmbed {
    title: Option<String>,
    description: Option<String>,
    color: Option<u32>,
    fields: Vec<EmbedField>,
    footer: Option<EmbedFooter>,
    timestamp: Option<String>,
}

/// 嵌入字段
#[derive(Debug, Serialize)]
struct EmbedField {
    name: String,
    value: String,
    inline: bool,
}

/// 嵌入腳註
#[derive(Debug, Serialize)]
struct EmbedFooter {
    text: String,
    icon_url: Option<String>,
}

/// Discord消息
#[derive(Debug, Serialize)]
struct DiscordMessage {
    content: Option<String>,
    embeds: Option<Vec<DiscordEmbed>>,
}

/// 速率限制器
#[derive(Debug)]
struct RateLimiter {
    last_message_time: DateTime<Utc>,
    message_count: u32,
    max_messages_per_minute: u32,
}

impl DiscordNotifier {
    /// 創建新的Discord通知器
    pub fn new(_config: Arc<Config>) -> Result<Self> {
        let client = Client::new();
        
        // TODO: 從config中讀取Discord配置
        let webhook_url = "".to_string(); // 暫時為空
        let channel_id = "".to_string();
        
        Ok(Self {
            client,
            webhook_url,
            channel_id,
            user_id: None,
            enabled: true,
            rate_limiter: Arc::new(Mutex::new(RateLimiter {
                last_message_time: Utc::now(),
                message_count: 0,
                max_messages_per_minute: 30,
            })),
        })
    }
    
    /// 發送交易通知
    pub async fn send_trade_notification(&self, trade: &Trade) -> Result<()> {
        if !self.enabled {
            return Ok(());
        }
        
        let embed = self.create_trade_embed(trade);
        let message = DiscordMessage {
            content: self.user_id.as_ref().map(|id| format!("<@{}>", id)),
            embeds: Some(vec![embed]),
        };
        
        self.send_message(message).await
            .with_context(|| "發送交易通知失敗")?;
        
        info!("交易通知已發送: {} {} {}", trade.symbol, trade.side, trade.quantity);
        Ok(())
    }
    
    /// 發送訂單通知
    pub async fn send_order_notification(&self, order: &Order) -> Result<()> {
        if !self.enabled {
            return Ok(());
        }
        
        let embed = self.create_order_embed(order);
        let message = DiscordMessage {
            content: None,
            embeds: Some(vec![embed]),
        };
        
        self.send_message(message).await
            .with_context(|| "發送訂單通知失敗")?;
        
        info!("訂單通知已發送: {} {} {}", order.symbol, order.side, order.status);
        Ok(())
    }
    
    /// 發送持倉更新通知
    pub async fn send_position_notification(&self, position: &Position) -> Result<()> {
        if !self.enabled {
            return Ok(());
        }
        
        let embed = self.create_position_embed(position);
        let message = DiscordMessage {
            content: None,
            embeds: Some(vec![embed]),
        };
        
        self.send_message(message).await
            .with_context(|| "發送持倉通知失敗")?;
        
        info!("持倉通知已發送: {} {}", position.symbol, position.side);
        Ok(())
    }
    
    /// 發送系統通知
    pub async fn send_system_notification(&self, title: &str, message: &str, level: NotificationLevel) -> Result<()> {
        if !self.enabled {
            return Ok(());
        }
        
        let embed = self.create_system_embed(title, message, level);
        let discord_message = DiscordMessage {
            content: if level == NotificationLevel::Error {
                self.user_id.as_ref().map(|id| format!("<@{}>", id))
            } else {
                None
            },
            embeds: Some(vec![embed]),
        };
        
        self.send_message(discord_message).await
            .with_context(|| "發送系統通知失敗")?;
        
        info!("系統通知已發送: {}", title);
        Ok(())
    }
    
    /// 發送績效報告
    pub async fn send_performance_report(&self, report: &PerformanceReport) -> Result<()> {
        if !self.enabled {
            return Ok(());
        }
        
        let embed = self.create_performance_embed(report);
        let message = DiscordMessage {
            content: None,
            embeds: Some(vec![embed]),
        };
        
        self.send_message(message).await
            .with_context(|| "發送績效報告失敗")?;
        
        info!("績效報告已發送");
        Ok(())
    }
    
    /// 發送消息到Discord
    async fn send_message(&self, message: DiscordMessage) -> Result<()> {
        // 檢查速率限制
        if !self.check_rate_limit().await {
            warn!("Discord消息發送受到速率限制");
            return Ok(());
        }
        
        let response = self.client
            .post(&self.webhook_url)
            .json(&message)
            .send()
            .await
            .with_context(|| "發送Discord消息請求失敗")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Discord API錯誤: {} - {}", status, text));
        }
        
        Ok(())
    }
    
    /// 檢查速率限制
    async fn check_rate_limit(&self) -> bool {
        let mut limiter = self.rate_limiter.lock().await;
        let now = Utc::now();
        
        // 重置計數器（每分鐘）
        if (now - limiter.last_message_time).num_seconds() as u64 >= 60 {
            limiter.message_count = 0;
            limiter.last_message_time = now;
        }
        
        // 檢查是否超過限制
        if limiter.message_count >= limiter.max_messages_per_minute {
            return false;
        }
        
        limiter.message_count += 1;
        true
    }
    
    /// 創建交易嵌入消息
    fn create_trade_embed(&self, trade: &Trade) -> DiscordEmbed {
        let color = match trade.side {
            crate::models::OrderSide::Buy => 0x00FF00,  // 綠色
            crate::models::OrderSide::Sell => 0xFF0000, // 紅色
        };
        
        let side_emoji = match trade.side {
            crate::models::OrderSide::Buy => "🟢",
            crate::models::OrderSide::Sell => "🔴",
        };
        
        DiscordEmbed {
            title: Some(format!("{} 交易執行 - {}", side_emoji, trade.symbol)),
            description: Some(format!("策略: {}", trade.strategy_id.as_deref().unwrap_or("未知"))),
            color: Some(color),
            fields: vec![
                EmbedField {
                    name: "方向".to_string(),
                    value: format!("{}", trade.side),
                    inline: true,
                },
                EmbedField {
                    name: "價格".to_string(),
                    value: format!("{:.4}", trade.price),
                    inline: true,
                },
                EmbedField {
                    name: "數量".to_string(),
                    value: format!("{:.6}", trade.quantity),
                    inline: true,
                },
                EmbedField {
                    name: "總值".to_string(),
                    value: format!("{:.2} USDT", trade.price * trade.quantity),
                    inline: true,
                },
                EmbedField {
                    name: "手續費".to_string(),
                    value: format!("{:.4} {}", trade.fee, trade.fee_currency),
                    inline: true,
                },
                EmbedField {
                    name: "時間".to_string(),
                    value: trade.timestamp.format("%Y-%m-%d %H:%M:%S UTC").to_string(),
                    inline: true,
                },
            ],
            footer: Some(EmbedFooter {
                text: format!("交易ID: {}", trade.id),
                icon_url: None,
            }),
            timestamp: Some(trade.timestamp.to_rfc3339()),
        }
    }
    
    /// 創建訂單嵌入消息
    fn create_order_embed(&self, order: &Order) -> DiscordEmbed {
        let color = match order.status {
            crate::models::OrderStatus::Filled => 0x00FF00,
            crate::models::OrderStatus::Canceled => 0xFF0000,
            crate::models::OrderStatus::Rejected => 0xFF0000,
            _ => 0xFFFF00,
        };
        
        DiscordEmbed {
            title: Some(format!("📋 訂單更新 - {}", order.symbol)),
            description: Some(format!("訂單狀態: {}", order.status)),
            color: Some(color),
            fields: vec![
                EmbedField {
                    name: "類型".to_string(),
                    value: format!("{}", order.order_type),
                    inline: true,
                },
                EmbedField {
                    name: "方向".to_string(),
                    value: format!("{}", order.side),
                    inline: true,
                },
                EmbedField {
                    name: "數量".to_string(),
                    value: format!("{:.6}", order.quantity),
                    inline: true,
                },
                EmbedField {
                    name: "價格".to_string(),
                    value: order.price.map_or("市價".to_string(), |p| format!("{:.4}", p)),
                    inline: true,
                },
                EmbedField {
                    name: "策略".to_string(),
                    value: order.strategy_id.as_deref().unwrap_or("手動").to_string(),
                    inline: true,
                },
            ],
            footer: Some(EmbedFooter {
                text: format!("訂單ID: {}", order.id),
                icon_url: None,
            }),
            timestamp: Some(order.updated_at.to_rfc3339()),
        }
    }
    
    /// 創建持倉嵌入消息
    fn create_position_embed(&self, position: &Position) -> DiscordEmbed {
        let color = if position.unrealized_pnl >= rust_decimal::Decimal::ZERO {
            0x00FF00
        } else {
            0xFF0000
        };
        
        DiscordEmbed {
            title: Some(format!("💼 持倉更新 - {}", position.symbol)),
            description: Some(format!("持倉方向: {}", position.side)),
            color: Some(color),
            fields: vec![
                EmbedField {
                    name: "數量".to_string(),
                    value: format!("{:.6}", position.quantity),
                    inline: true,
                },
                EmbedField {
                    name: "平均價格".to_string(),
                    value: format!("{:.4}", position.average_price),
                    inline: true,
                },
                EmbedField {
                    name: "未實現盈虧".to_string(),
                    value: format!("{:.2} USDT", position.unrealized_pnl),
                    inline: true,
                },
                EmbedField {
                    name: "已實現盈虧".to_string(),
                    value: format!("{:.2} USDT", position.realized_pnl),
                    inline: true,
                },
            ],
            footer: None,
            timestamp: Some(position.updated_at.to_rfc3339()),
        }
    }
    
    /// 創建系統嵌入消息
    fn create_system_embed(&self, title: &str, message: &str, level: NotificationLevel) -> DiscordEmbed {
        let (color, emoji) = match level {
            NotificationLevel::Info => (0x0099FF, "ℹ️"),
            NotificationLevel::Warning => (0xFFCC00, "⚠️"),
            NotificationLevel::Error => (0xFF0000, "🚨"),
            NotificationLevel::Success => (0x00FF00, "✅"),
        };
        
        DiscordEmbed {
            title: Some(format!("{} {}", emoji, title)),
            description: Some(message.to_string()),
            color: Some(color),
            fields: vec![],
            footer: Some(EmbedFooter {
                text: "量化交易機器人".to_string(),
                icon_url: None,
            }),
            timestamp: Some(Utc::now().to_rfc3339()),
        }
    }
    
    /// 創建績效嵌入消息
    fn create_performance_embed(&self, report: &PerformanceReport) -> DiscordEmbed {
        let color = if report.total_pnl >= 0.0 { 0x00FF00 } else { 0xFF0000 };
        
        DiscordEmbed {
            title: Some("📊 績效報告".to_string()),
            description: Some(format!("期間: {} - {}", report.start_date, report.end_date)),
            color: Some(color),
            fields: vec![
                EmbedField {
                    name: "總盈虧".to_string(),
                    value: format!("{:.2} USDT", report.total_pnl),
                    inline: true,
                },
                EmbedField {
                    name: "勝率".to_string(),
                    value: format!("{:.1}%", report.win_rate * 100.0),
                    inline: true,
                },
                EmbedField {
                    name: "交易次數".to_string(),
                    value: format!("{}", report.total_trades),
                    inline: true,
                },
                EmbedField {
                    name: "最大回撤".to_string(),
                    value: format!("{:.2}%", report.max_drawdown * 100.0),
                    inline: true,
                },
                EmbedField {
                    name: "夏普比率".to_string(),
                    value: format!("{:.2}", report.sharpe_ratio),
                    inline: true,
                },
            ],
            footer: None,
            timestamp: Some(Utc::now().to_rfc3339()),
        }
    }
}

/// 通知等級
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NotificationLevel {
    Info,
    Warning,
    Error,
    Success,
}

/// 績效報告
#[derive(Debug)]
pub struct PerformanceReport {
    pub start_date: String,
    pub end_date: String,
    pub total_pnl: f64,
    pub win_rate: f64,
    pub total_trades: u32,
    pub max_drawdown: f64,
    pub sharpe_ratio: f64,
}
