//! 量化交易機器人核心庫
//! 
//! 這個庫提供了高性能的交易執行引擎、數據處理系統和風險管理功能。

pub mod api;
pub mod data;
pub mod models;
pub mod python;
pub mod trading;
pub mod utils;

use std::sync::Arc;
use anyhow::Result;
use tracing::{info, error};

use crate::utils::Config;
use crate::data::DataManager;
use crate::trading::TradingEngine;
use crate::api::{BinanceApi, DiscordNotifier};

/// 交易機器人主結構
#[derive(Debug)]
pub struct TradingBot {
    config: Arc<Config>,
    data_manager: Arc<DataManager>,
    trading_engine: Arc<TradingEngine>,
    binance_api: Arc<BinanceApi>,
    discord_notifier: Arc<DiscordNotifier>,
}

impl TradingBot {
    /// 創建新的交易機器人實例
    pub async fn new(config: Arc<Config>) -> Result<Self> {
        info!("正在初始化交易機器人...");

        // 創建數據管理器
        let mut data_manager = DataManager::new(config.clone());
        data_manager.initialize().await?;
        let data_manager = Arc::new(data_manager);

        // 創建交易引擎
        let trading_engine = Arc::new(TradingEngine::new(
            config.clone(),
            data_manager.clone(),
        ));

        // 創建API客戶端
        let binance_api = Arc::new(BinanceApi::new(config.clone()));
        let discord_notifier = Arc::new(DiscordNotifier::new(config.clone())?);

        info!("交易機器人初始化完成");

        Ok(Self {
            config,
            data_manager,
            trading_engine,
            binance_api,
            discord_notifier,
        })
    }

    /// 啟動交易機器人
    pub async fn start(&self) -> Result<()> {
        info!("正在啟動交易機器人...");

        // 數據管理器已在初始化時啟動
        
        // 啟動交易引擎
        self.trading_engine.start().await?;

        info!("交易機器人啟動成功");
        Ok(())
    }

    /// 停止交易機器人
    pub async fn stop(&self) -> Result<()> {
        info!("正在停止交易機器人...");

        // 停止交易引擎
        if let Err(e) = self.trading_engine.stop().await {
            error!("停止交易引擎失敗: {}", e);
        }

        // 停止數據管理器
        if let Err(e) = self.data_manager.shutdown().await {
            error!("停止數據管理器失敗: {}", e);
        }

        info!("交易機器人已停止");
        Ok(())
    }

    /// 獲取系統狀態
    pub async fn get_status(&self) -> Result<BotStatus> {
        let health_status = self.data_manager.health_check().await?;
        
        Ok(BotStatus {
            data_manager_healthy: health_status.overall_healthy,
            trading_engine_healthy: true, // TODO: 實現交易引擎健康檢查
            api_healthy: true, // TODO: 實現API健康檢查
        })
    }

    /// 獲取數據管理器引用
    pub fn data_manager(&self) -> &Arc<DataManager> {
        &self.data_manager
    }

    /// 獲取交易引擎引用
    pub fn trading_engine(&self) -> &Arc<TradingEngine> {
        &self.trading_engine
    }
}

/// 機器人狀態
#[derive(Debug)]
pub struct BotStatus {
    pub data_manager_healthy: bool,
    pub trading_engine_healthy: bool,
    pub api_healthy: bool,
}

/// 初始化日誌系統
pub fn init_logging() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "trading_bot=info".into()),
        )
        .init();
    
    Ok(())
}
