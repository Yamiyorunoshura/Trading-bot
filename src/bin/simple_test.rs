use serde::{Deserialize, Serialize};

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

#[tauri::command]
async fn get_trading_system_status() -> Result<SystemStatus, String> {
    Ok(SystemStatus {
        bot_running: true,
        data_healthy: true,
        trading_healthy: true,
        api_healthy: true,
        uptime: 3600,
        strategies_count: 2,
        active_strategies: 1,
    })
}

#[tauri::command]
async fn start_trading_system() -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
async fn stop_trading_system() -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
async fn ping() -> Result<String, String> {
    Ok("pong".to_string())
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_trading_system_status,
            start_trading_system,
            stop_trading_system,
            ping
        ])
        .run(tauri::generate_context!())
        .expect("啟動Tauri應用程式失敗");
}