//! 量化交易機器人Tauri GUI應用程式
//! 
//! 提供基於Web技術的桌面用戶界面

use std::sync::Arc;
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State, Window};
use trading_bot::{TradingBot, utils::Config};
use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade, Message},
    response::Response,
    routing::get,
    Router,
};

/// 應用程式狀態
#[derive(Debug)]
pub struct AppState {
    pub trading_bot: Arc<RwLock<Option<TradingBot>>>,
    pub config: Arc<Config>,
    pub web_server: Arc<WebServer>,
}

/// Web服務器
#[derive(Debug)]
pub struct WebServer {
    pub port: u16,
    pub is_running: Arc<RwLock<bool>>,
}

/// 系統狀態響應
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub bot_running: bool,
    pub data_healthy: bool,
    pub trading_healthy: bool,
    pub api_healthy: bool,
    pub uptime: u64,
    pub strategies_count: u32,
    pub active_strategies: u32,
}

/// 策略信息
#[derive(Debug, Serialize, Deserialize)]
pub struct StrategyInfo {
    pub id: String,
    pub name: String,
    pub symbol: String,
    pub status: String,
    pub pnl: f64,
    pub win_rate: f64,
    pub max_drawdown: f64,
    pub running_time: u64,
}

/// 市場數據
#[derive(Debug, Serialize, Deserialize)]
pub struct MarketData {
    pub symbol: String,
    pub price: f64,
    pub change_24h: f64,
    pub volume: f64,
    pub timestamp: i64,
}

/// 初始化Tauri命令
#[tauri::command]
async fn init_trading_bot(
    state: State<'_, AppState>,
    window: Window,
) -> Result<String, String> {
    let mut bot_guard = state.trading_bot.write().await;
    
    if bot_guard.is_some() {
        return Ok("交易機器人已經初始化".to_string());
    }
    
    // 創建交易機器人實例
    let bot = TradingBot::new(state.config.clone())
        .await
        .map_err(|e| format!("初始化交易機器人失敗: {}", e))?;
    
    *bot_guard = Some(bot);
    
    // 發送初始化完成事件
    window.emit("bot-initialized", ()).map_err(|e| e.to_string())?;
    
    Ok("交易機器人初始化成功".to_string())
}

/// 啟動交易機器人
#[tauri::command]
async fn start_trading_bot(
    state: State<'_, AppState>,
    window: Window,
) -> Result<String, String> {
    let bot_guard = state.trading_bot.read().await;
    
    if let Some(bot) = bot_guard.as_ref() {
        bot.start().await.map_err(|e| format!("啟動交易機器人失敗: {}", e))?;
        
        // 發送啟動完成事件
        window.emit("bot-started", ()).map_err(|e| e.to_string())?;
        
        Ok("交易機器人啟動成功".to_string())
    } else {
        Err("交易機器人未初始化".to_string())
    }
}

/// 停止交易機器人
#[tauri::command]
async fn stop_trading_bot(
    state: State<'_, AppState>,
    window: Window,
) -> Result<String, String> {
    let bot_guard = state.trading_bot.read().await;
    
    if let Some(bot) = bot_guard.as_ref() {
        bot.stop().await.map_err(|e| format!("停止交易機器人失敗: {}", e))?;
        
        // 發送停止完成事件
        window.emit("bot-stopped", ()).map_err(|e| e.to_string())?;
        
        Ok("交易機器人已停止".to_string())
    } else {
        Err("交易機器人未初始化".to_string())
    }
}

/// 獲取系統狀態
#[tauri::command]
async fn get_system_status(
    state: State<'_, AppState>,
) -> Result<SystemStatus, String> {
    let bot_guard = state.trading_bot.read().await;
    
    if let Some(bot) = bot_guard.as_ref() {
        let status = bot.get_status().await.map_err(|e| e.to_string())?;
        
        Ok(SystemStatus {
            bot_running: true,
            data_healthy: status.data_manager_healthy,
            trading_healthy: status.trading_engine_healthy,
            api_healthy: status.api_healthy,
            uptime: 0, // TODO: 實現運行時間計算
            strategies_count: 0, // TODO: 從策略管理器獲取
            active_strategies: 0, // TODO: 從策略管理器獲取
        })
    } else {
        Ok(SystemStatus {
            bot_running: false,
            data_healthy: false,
            trading_healthy: false,
            api_healthy: false,
            uptime: 0,
            strategies_count: 0,
            active_strategies: 0,
        })
    }
}

/// 獲取策略列表
#[tauri::command]
async fn get_strategies(
    state: State<'_, AppState>,
) -> Result<Vec<StrategyInfo>, String> {
    // TODO: 實現策略列表獲取
    Ok(vec![
        StrategyInfo {
            id: "sma_crossover_1".to_string(),
            name: "SMA交叉策略".to_string(),
            symbol: "BTCUSDT".to_string(),
            status: "運行中".to_string(),
            pnl: 1250.50,
            win_rate: 0.65,
            max_drawdown: 0.08,
            running_time: 86400,
        },
        StrategyInfo {
            id: "mean_reversion_1".to_string(),
            name: "均值回歸策略".to_string(),
            symbol: "ETHUSDT".to_string(),
            status: "暫停".to_string(),
            pnl: -320.75,
            win_rate: 0.58,
            max_drawdown: 0.12,
            running_time: 43200,
        },
    ])
}

/// 獲取市場數據
#[tauri::command]
async fn get_market_data(
    state: State<'_, AppState>,
) -> Result<Vec<MarketData>, String> {
    // TODO: 實現市場數據獲取
    Ok(vec![
        MarketData {
            symbol: "BTCUSDT".to_string(),
            price: 43250.50,
            change_24h: 2.35,
            volume: 1250000.0,
            timestamp: chrono::Utc::now().timestamp(),
        },
        MarketData {
            symbol: "ETHUSDT".to_string(),
            price: 2650.25,
            change_24h: -1.45,
            volume: 850000.0,
            timestamp: chrono::Utc::now().timestamp(),
        },
    ])
}

/// 啟動Web服務器
async fn start_web_server(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let app = Router::new()
        .route("/ws", get(websocket_handler))
        .route("/health", get(health_check));
    
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    tracing::info!("Web服務器啟動在 http://127.0.0.1:{}", port);
    
    axum::serve(listener, app).await?;
    Ok(())
}

/// WebSocket處理器
async fn websocket_handler(ws: WebSocketUpgrade) -> Response {
    ws.on_upgrade(handle_websocket)
}

/// 處理WebSocket連接
async fn handle_websocket(mut socket: WebSocket) {
    let mut interval = tokio::time::interval(Duration::from_secs(1));
    
    loop {
        tokio::select! {
            _ = interval.tick() => {
                // 發送即時數據
                let data = serde_json::json!({
                    "type": "market_data",
                    "timestamp": chrono::Utc::now().timestamp(),
                    "data": {
                        "BTCUSDT": {
                            "price": 43250.50 + rand::random::<f64>() * 100.0 - 50.0,
                            "volume": 1250000.0
                        }
                    }
                });
                
                if socket.send(Message::Text(data.to_string())).await.is_err() {
                    break;
                }
            }
            msg = socket.recv() => {
                if let Some(msg) = msg {
                    if let Ok(msg) = msg {
                        if let Message::Text(text) = msg {
                            tracing::info!("收到WebSocket消息: {}", text);
                        }
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }
    }
}

/// 健康檢查
async fn health_check() -> &'static str {
    "OK"
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化日誌
    tracing_subscriber::fmt::init();
    
    // 載入配置
    let config = Arc::new(Config::load("config/config.toml")?);
    
    // 創建Web服務器
    let web_server = Arc::new(WebServer {
        port: 8080,
        is_running: Arc::new(RwLock::new(false)),
    });
    
    // 啟動Web服務器
    let web_server_clone = web_server.clone();
    tokio::spawn(async move {
        if let Err(e) = start_web_server(web_server_clone.port).await {
            tracing::error!("Web服務器啟動失敗: {}", e);
        }
    });
    
    // 創建應用程式狀態
    let state = AppState {
        trading_bot: Arc::new(RwLock::new(None)),
        config,
        web_server,
    };
    
    // 啟動Tauri應用程式
    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            init_trading_bot,
            start_trading_bot,
            stop_trading_bot,
            get_system_status,
            get_strategies,
            get_market_data
        ])
        .run(tauri::generate_context!())
        .expect("啟動Tauri應用程式失敗");
    
    Ok(())
}