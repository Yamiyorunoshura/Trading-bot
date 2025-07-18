//! Python整合模塊
//! 
//! 提供與Python策略系統的交互接口

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error, warn};

/// Python策略管理器
#[derive(Debug)]
pub struct PythonStrategyManager {
    strategies: Arc<RwLock<HashMap<String, PythonStrategy>>>,
    python_executable: String,
}

/// Python策略信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonStrategy {
    pub id: String,
    pub name: String,
    pub symbol: String,
    pub timeframe: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub risk_params: HashMap<String, f64>,
    pub enabled: bool,
}

/// 策略信號
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonSignal {
    pub symbol: String,
    pub signal_type: String,
    pub strength: f64,
    pub price: Option<f64>,
    pub quantity: Option<f64>,
    pub timestamp: String,
    pub metadata: HashMap<String, String>,
}

/// 回測配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestConfig {
    pub strategy: PythonStrategy,
    pub market_data: Vec<MarketData>,
    pub start_date: String,
    pub end_date: String,
    pub initial_capital: f64,
    pub commission: f64,
    pub slippage: f64,
}

/// 市場數據
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketData {
    pub timestamp: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

/// 回測結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestResult {
    pub strategy_name: String,
    pub start_date: String,
    pub end_date: String,
    pub initial_capital: f64,
    pub final_capital: f64,
    pub total_trades: i32,
    pub winning_trades: i32,
    pub losing_trades: i32,
    pub total_pnl: f64,
    pub total_return: f64,
    pub annual_return: f64,
    pub max_drawdown: f64,
    pub sharpe_ratio: f64,
    pub sortino_ratio: f64,
    pub volatility: f64,
    pub win_rate: f64,
    pub avg_trade_pnl: f64,
    pub profit_factor: f64,
    pub trades: Vec<serde_json::Value>,
    pub daily_returns: Vec<f64>,
    pub equity_curve: Vec<f64>,
}

impl PythonStrategyManager {
    /// 創建新的Python策略管理器
    pub fn new() -> Self {
        Self {
            strategies: Arc::new(RwLock::new(HashMap::new())),
            python_executable: "python".to_string(),
        }
    }

    /// 設置Python可執行文件路徑
    pub fn set_python_executable(&mut self, path: String) {
        self.python_executable = path;
    }

    /// 創建策略
    pub async fn create_strategy(&self, strategy_config: PythonStrategy) -> Result<String> {
        let config_json = serde_json::to_string(&strategy_config)?;
        
        let result = self.call_python_function("create_strategy_from_json", &[&config_json]).await?;
        
        // 解析結果
        if let Ok(strategy_id) = serde_json::from_str::<String>(&result) {
            let mut strategies = self.strategies.write().await;
            strategies.insert(strategy_id.clone(), strategy_config);
            
            info!("Python策略創建成功: {}", strategy_id);
            Ok(strategy_id)
        } else {
            // 檢查是否是錯誤響應
            if let Ok(error) = serde_json::from_str::<serde_json::Value>(&result) {
                if let Some(error_msg) = error.get("error") {
                    return Err(anyhow::anyhow!("Python策略創建失敗: {}", error_msg));
                }
            }
            Err(anyhow::anyhow!("Python策略創建失敗: 無效響應"))
        }
    }

    /// 生成交易信號
    pub async fn generate_signals(&self, strategy_id: &str, market_data: &[MarketData]) -> Result<Vec<PythonSignal>> {
        let market_data_json = serde_json::to_string(market_data)?;
        
        let result = self.call_python_function("generate_signals", &[strategy_id, &market_data_json]).await?;
        
        // 解析結果
        if let Ok(signals) = serde_json::from_str::<Vec<PythonSignal>>(&result) {
            info!("生成了 {} 個交易信號", signals.len());
            Ok(signals)
        } else {
            // 檢查是否是錯誤響應
            if let Ok(error) = serde_json::from_str::<serde_json::Value>(&result) {
                if let Some(error_msg) = error.get("error") {
                    return Err(anyhow::anyhow!("生成信號失敗: {}", error_msg));
                }
            }
            Err(anyhow::anyhow!("生成信號失敗: 無效響應"))
        }
    }

    /// 運行回測
    pub async fn run_backtest(&self, config: BacktestConfig) -> Result<BacktestResult> {
        let config_json = serde_json::to_string(&config)?;
        
        let result = self.call_python_function("run_backtest_from_json", &[&config_json]).await?;
        
        // 解析結果
        if let Ok(backtest_result) = serde_json::from_str::<BacktestResult>(&result) {
            info!("回測完成: {}", backtest_result.strategy_name);
            Ok(backtest_result)
        } else {
            // 檢查是否是錯誤響應
            if let Ok(error) = serde_json::from_str::<serde_json::Value>(&result) {
                if let Some(error_msg) = error.get("error") {
                    return Err(anyhow::anyhow!("回測失敗: {}", error_msg));
                }
            }
            Err(anyhow::anyhow!("回測失敗: 無效響應"))
        }
    }

    /// 獲取策略信息
    pub async fn get_strategy_info(&self, strategy_id: &str) -> Result<serde_json::Value> {
        let result = self.call_python_function("get_strategy_info", &[strategy_id]).await?;
        
        let info = serde_json::from_str::<serde_json::Value>(&result)?;
        
        if let Some(error_msg) = info.get("error") {
            return Err(anyhow::anyhow!("獲取策略信息失敗: {}", error_msg));
        }
        
        Ok(info)
    }

    /// 列出所有策略
    pub async fn list_strategies(&self) -> Result<Vec<String>> {
        let result = self.call_python_function("list_strategies", &[]).await?;
        
        let strategies = serde_json::from_str::<Vec<String>>(&result)?;
        Ok(strategies)
    }

    /// 更新策略配置
    pub async fn update_strategy_config(&self, strategy_id: &str, config: &serde_json::Value) -> Result<bool> {
        let config_json = serde_json::to_string(config)?;
        
        let result = self.call_python_function("update_strategy_config", &[strategy_id, &config_json]).await?;
        
        let response = serde_json::from_str::<serde_json::Value>(&result)?;
        
        if let Some(success) = response.get("success").and_then(|v| v.as_bool()) {
            if success {
                // 更新本地策略緩存
                let mut strategies = self.strategies.write().await;
                if let Some(strategy) = strategies.get_mut(strategy_id) {
                    if let Some(parameters) = config.get("parameters") {
                        strategy.parameters = serde_json::from_value(parameters.clone())?;
                    }
                    if let Some(risk_params) = config.get("risk_params") {
                        strategy.risk_params = serde_json::from_value(risk_params.clone())?;
                    }
                    if let Some(enabled) = config.get("enabled").and_then(|v| v.as_bool()) {
                        strategy.enabled = enabled;
                    }
                }
            }
            Ok(success)
        } else {
            if let Some(error_msg) = response.get("error") {
                return Err(anyhow::anyhow!("更新策略配置失敗: {}", error_msg));
            }
            Ok(false)
        }
    }

    /// 調用Python函數
    async fn call_python_function(&self, function_name: &str, args: &[&str]) -> Result<String> {
        let script = format!(
            r#"
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'python'))

from bridge.rust_bridge import {}

if __name__ == "__main__":
    try:
        result = {}({})
        print(result)
    except Exception as e:
        import json
        print(json.dumps({{"error": str(e)}}))
"#,
            function_name,
            function_name,
            args.iter().enumerate().map(|(i, _)| format!("sys.argv[{}]", i + 1)).collect::<Vec<_>>().join(", ")
        );

        // 寫入臨時腳本文件
        let script_path = format!("/tmp/python_bridge_{}.py", function_name);
        std::fs::write(&script_path, script)?;

        // 構建命令
        let mut cmd = Command::new(&self.python_executable);
        cmd.arg(&script_path);
        
        for arg in args {
            cmd.arg(arg);
        }

        cmd.stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // 執行命令
        let output = cmd.output()?;

        // 清理臨時文件
        let _ = std::fs::remove_file(&script_path);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("Python腳本執行失敗: {}", stderr);
            return Err(anyhow::anyhow!("Python腳本執行失敗: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.trim().to_string())
    }

    /// 測試Python環境
    pub async fn test_python_environment(&self) -> Result<()> {
        let script = r#"
import sys
print("Python version:", sys.version)

# 測試必要的模塊
try:
    import pandas as pd
    print("pandas version:", pd.__version__)
except ImportError:
    print("ERROR: pandas not installed")

try:
    import numpy as np
    print("numpy version:", np.__version__)
except ImportError:
    print("ERROR: numpy not installed")

try:
    import yfinance as yf
    print("yfinance available")
except ImportError:
    print("WARNING: yfinance not available")

print("Python environment test completed")
"#;

        let script_path = "/tmp/test_python_env.py";
        std::fs::write(script_path, script)?;

        let output = Command::new(&self.python_executable)
            .arg(script_path)
            .output()?;

        let _ = std::fs::remove_file(script_path);

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        info!("Python環境測試輸出:\n{}", stdout);
        
        if !stderr.is_empty() {
            warn!("Python環境測試警告:\n{}", stderr);
        }

        if !output.status.success() {
            return Err(anyhow::anyhow!("Python環境測試失敗"));
        }

        Ok(())
    }
}

impl Default for PythonStrategyManager {
    fn default() -> Self {
        Self::new()
    }
}

// 輔助函數：將Rust的Candle轉換為Python的MarketData
impl From<crate::models::Candle> for MarketData {
    fn from(candle: crate::models::Candle) -> Self {
        Self {
            timestamp: candle.timestamp.to_rfc3339(),
            open: candle.open.to_string().parse().unwrap_or(0.0),
            high: candle.high.to_string().parse().unwrap_or(0.0),
            low: candle.low.to_string().parse().unwrap_or(0.0),
            close: candle.close.to_string().parse().unwrap_or(0.0),
            volume: candle.volume.to_string().parse().unwrap_or(0.0),
        }
    }
}

// 輔助函數：將Python信號轉換為Rust的策略信號
impl From<PythonSignal> for crate::models::strategy::StrategySignal {
    fn from(signal: PythonSignal) -> Self {
        use crate::models::strategy::SignalType;
        
        let signal_type = match signal.signal_type.as_str() {
            "buy" => SignalType::Buy,
            "sell" => SignalType::Sell,
            _ => SignalType::Hold,
        };
        
        Self {
            id: uuid::Uuid::new_v4(),
            strategy_id: "python_strategy".to_string(),
            symbol: signal.symbol,
            signal_type,
            strength: rust_decimal::Decimal::from_f64_retain(signal.strength).unwrap_or_default(),
            price: signal.price.map(|p| rust_decimal::Decimal::from_f64_retain(p).unwrap_or_default()),
            quantity: signal.quantity.map(|q| rust_decimal::Decimal::from_f64_retain(q).unwrap_or_default()),
            timestamp: chrono::DateTime::parse_from_rfc3339(&signal.timestamp)
                .unwrap_or_else(|_| chrono::Utc::now().into())
                .with_timezone(&chrono::Utc),
            metadata: signal.metadata,
        }
    }
}