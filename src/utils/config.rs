//! 配置管理模組

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// 主配置結構
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// 數據庫配置
    pub database: DatabaseConfig,
    /// 交易所配置
    pub exchanges: HashMap<String, ExchangeConfig>,
    /// 交易配置
    pub trading: TradingConfig,
    /// Discord配置
    pub discord: DiscordConfig,
    /// 日誌配置
    pub logging: LoggingConfig,
    /// 風險管理配置
    pub risk: RiskConfig,
}

/// 數據庫配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// ClickHouse連接URL
    pub clickhouse_url: String,
    /// PostgreSQL連接URL
    pub postgres_url: String,
    /// Redis連接URL
    pub redis_url: String,
    /// 連接池大小
    pub pool_size: u32,
    /// 連接超時時間(秒)
    pub connection_timeout: u64,
}

/// 交易所配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExchangeConfig {
    /// 交易所名稱
    pub name: String,
    /// API密鑰
    pub api_key: String,
    /// API密鑰密碼
    pub secret_key: String,
    /// 是否為測試網
    pub testnet: bool,
    /// API基礎URL
    pub base_url: Option<String>,
    /// WebSocket URL
    pub ws_url: Option<String>,
    /// 請求限制(每秒)
    pub rate_limit: u32,
}

/// 交易配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingConfig {
    /// 最大持倉大小(USD)
    pub max_position_size: f64,
    /// 風險限制(百分比)
    pub risk_limit: f64,
    /// 是否啟用實時交易
    pub live_trading: bool,
    /// 默認交易對
    pub default_symbols: Vec<String>,
    /// 交易手續費率
    pub fee_rate: f64,
    /// 滑點容忍度
    pub slippage_tolerance: f64,
}

/// Discord配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscordConfig {
    /// Bot Token
    pub token: String,
    /// 頻道ID
    pub channel_id: String,
    /// 用戶ID
    pub user_id: Option<String>,
    /// 是否啟用通知
    pub enabled: bool,
    /// 通知等級
    pub notification_level: NotificationLevel,
}

/// 日誌配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// 日誌等級
    pub level: String,
    /// 日誌文件路徑
    pub file_path: Option<String>,
    /// 是否輸出到控制台
    pub console: bool,
    /// 日誌格式
    pub format: LogFormat,
}

/// 風險管理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskConfig {
    /// 最大每日虧損
    pub max_daily_loss: f64,
    /// 最大回撤
    pub max_drawdown: f64,
    /// VaR置信度
    pub var_confidence: f64,
    /// 風險檢查間隔(秒)
    pub check_interval: u64,
    /// 緊急停止條件
    pub emergency_stop: EmergencyStopConfig,
}

/// 緊急停止配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyStopConfig {
    /// 是否啟用
    pub enabled: bool,
    /// 觸發條件
    pub triggers: Vec<StopTrigger>,
}

/// 停止觸發條件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StopTrigger {
    /// 虧損超過閾值
    LossThreshold(f64),
    /// 回撤超過閾值
    DrawdownThreshold(f64),
    /// 連續虧損次數
    ConsecutiveLosses(u32),
    /// API錯誤率
    ApiErrorRate(f64),
}

/// 通知等級
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationLevel {
    /// 全部通知
    All,
    /// 重要通知
    Important,
    /// 僅錯誤
    ErrorOnly,
    /// 關閉通知
    None,
}

/// 日誌格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogFormat {
    /// 純文本
    Text,
    /// JSON格式
    Json,
    /// 結構化格式
    Structured,
}

impl Config {
    /// 從文件加載配置
    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = std::fs::read_to_string(&path)
            .with_context(|| format!("無法讀取配置文件: {:?}", path.as_ref()))?;
        
        let config: Config = if path.as_ref().extension().and_then(|s| s.to_str()) == Some("yaml") {
            serde_yaml::from_str(&content)
                .with_context(|| "解析YAML配置文件失敗")?
        } else {
            toml::from_str(&content)
                .with_context(|| "解析TOML配置文件失敗")?
        };
        
        config.validate()?;
        Ok(config)
    }
    
    /// 保存配置到文件
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let content = if path.as_ref().extension().and_then(|s| s.to_str()) == Some("yaml") {
            serde_yaml::to_string(self)
                .with_context(|| "序列化配置為YAML失敗")?
        } else {
            toml::to_string_pretty(self)
                .with_context(|| "序列化配置為TOML失敗")?
        };
        
        std::fs::write(&path, content)
            .with_context(|| format!("寫入配置文件失敗: {:?}", path.as_ref()))?;
        
        Ok(())
    }
    
    /// 驗證配置
    pub fn validate(&self) -> Result<()> {
        // 驗證數據庫配置
        if self.database.clickhouse_url.is_empty() {
            return Err(anyhow::anyhow!("ClickHouse URL不能為空"));
        }
        if self.database.postgres_url.is_empty() {
            return Err(anyhow::anyhow!("PostgreSQL URL不能為空"));
        }
        if self.database.redis_url.is_empty() {
            return Err(anyhow::anyhow!("Redis URL不能為空"));
        }
        
        // 驗證交易配置
        if self.trading.max_position_size <= 0.0 {
            return Err(anyhow::anyhow!("最大持倉大小必須大於0"));
        }
        if self.trading.risk_limit <= 0.0 || self.trading.risk_limit > 1.0 {
            return Err(anyhow::anyhow!("風險限制必須在0和1之間"));
        }
        
        // 驗證Discord配置
        if self.discord.enabled && self.discord.token.is_empty() {
            return Err(anyhow::anyhow!("Discord Token不能為空"));
        }
        if self.discord.enabled && self.discord.channel_id.is_empty() {
            return Err(anyhow::anyhow!("Discord頻道ID不能為空"));
        }
        
        // 驗證交易所配置
        for (name, exchange) in &self.exchanges {
            if exchange.api_key.is_empty() {
                return Err(anyhow::anyhow!("交易所{}的API密鑰不能為空", name));
            }
            if exchange.secret_key.is_empty() {
                return Err(anyhow::anyhow!("交易所{}的密鑰不能為空", name));
            }
        }
        
        Ok(())
    }
    
    /// 獲取默認配置
    pub fn default() -> Self {
        Self {
            database: DatabaseConfig {
                clickhouse_url: "tcp://localhost:9000".to_string(),
                postgres_url: "postgresql://user:password@localhost/trading".to_string(),
                redis_url: "redis://localhost:6379".to_string(),
                pool_size: 10,
                connection_timeout: 30,
            },
            exchanges: HashMap::new(),
            trading: TradingConfig {
                max_position_size: 10000.0,
                risk_limit: 0.02,
                live_trading: false,
                default_symbols: vec!["BTCUSDT".to_string(), "ETHUSDT".to_string()],
                fee_rate: 0.001,
                slippage_tolerance: 0.001,
            },
            discord: DiscordConfig {
                token: String::new(),
                channel_id: String::new(),
                user_id: None,
                enabled: false,
                notification_level: NotificationLevel::Important,
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                file_path: Some("logs/trading-bot.log".to_string()),
                console: true,
                format: LogFormat::Structured,
            },
            risk: RiskConfig {
                max_daily_loss: 500.0,
                max_drawdown: 0.1,
                var_confidence: 0.95,
                check_interval: 60,
                emergency_stop: EmergencyStopConfig {
                    enabled: true,
                    triggers: vec![
                        StopTrigger::LossThreshold(1000.0),
                        StopTrigger::DrawdownThreshold(0.15),
                    ],
                },
            },
        }
    }
    
    /// 從環境變量加載敏感配置
    pub fn load_from_env(&mut self) -> Result<()> {
        // 加載Discord配置
        if let Ok(token) = std::env::var("DISCORD_TOKEN") {
            self.discord.token = token;
        }
        if let Ok(channel_id) = std::env::var("DISCORD_CHANNEL_ID") {
            self.discord.channel_id = channel_id;
        }
        
        // 加載交易所配置
        for (name, exchange) in &mut self.exchanges {
            let api_key_env = format!("{}_API_KEY", name.to_uppercase());
            let secret_key_env = format!("{}_SECRET_KEY", name.to_uppercase());
            
            if let Ok(api_key) = std::env::var(&api_key_env) {
                exchange.api_key = api_key;
            }
            if let Ok(secret_key) = std::env::var(&secret_key_env) {
                exchange.secret_key = secret_key;
            }
        }
        
        Ok(())
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::default()
    }
}
