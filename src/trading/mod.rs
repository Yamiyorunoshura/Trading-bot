//! 交易執行模組

pub mod engine;
pub mod orders;
pub mod risk;

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error};

use crate::data::DataManager;
use crate::utils::Config;

pub use engine::*;
pub use orders::*;
pub use risk::*;

/// 交易引擎
#[derive(Debug)]
pub struct TradingEngine {
    config: Arc<Config>,
    data_manager: Arc<DataManager>,
    is_running: Arc<RwLock<bool>>,
}

impl TradingEngine {
    /// 創建新的交易引擎
    pub fn new(config: Arc<Config>, data_manager: Arc<DataManager>) -> Self {
        info!("初始化交易引擎...");
        
        Self {
            config,
            data_manager,
            is_running: Arc::new(RwLock::new(false)),
        }
    }
    
    /// 啟動交易引擎
    pub async fn start(&self) -> Result<()> {
        info!("啟動交易引擎...");
        
        {
            let mut running = self.is_running.write().await;
            if *running {
                return Err(anyhow::anyhow!("交易引擎已經在運行中"));
            }
            *running = true;
        }
        
        info!("交易引擎啟動成功");
        Ok(())
    }
    
    /// 停止交易引擎
    pub async fn stop(&self) -> Result<()> {
        info!("停止交易引擎...");
        
        {
            let mut running = self.is_running.write().await;
            if !*running {
                return Ok(());
            }
            *running = false;
        }
        
        info!("交易引擎已停止");
        Ok(())
    }
    
    /// 獲取狀態
    pub async fn get_status(&self) -> Result<String> {
        let running = *self.is_running.read().await;
        Ok(if running { "運行中".to_string() } else { "已停止".to_string() })
    }
}
