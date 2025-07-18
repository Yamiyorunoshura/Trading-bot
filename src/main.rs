//! 量化交易機器人主程序入口

use clap::{Parser, Subcommand};
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, error, warn};
use trading_bot::{TradingBot, utils::Config, data::DataManager};
use tracing_subscriber;

#[derive(Parser)]
#[command(name = "trading-bot")]
#[command(about = "高性能量化交易機器人")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// 啟動交易機器人
    Start {
        /// 配置文件路徑
        #[arg(short, long, default_value = "config/config.toml")]
        config: String,
        
        /// 是否為演示模式
        #[arg(short, long)]
        demo: bool,
    },
    /// 驗證配置文件
    ValidateConfig {
        /// 配置文件路徑
        #[arg(short, long, default_value = "config/config.toml")]
        config: String,
    },
    /// 運行回測
    Backtest {
        /// 策略名稱
        #[arg(short, long)]
        strategy: String,
        
        /// 開始日期 (YYYY-MM-DD)
        #[arg(short = 'f', long)]
        from: String,
        
        /// 結束日期 (YYYY-MM-DD)
        #[arg(short = 't', long)]
        to: String,
        
        /// 初始資金
        #[arg(short, long, default_value = "10000")]
        capital: f64,
    },
    /// 獲取系統狀態
    Status,
    /// 停止交易機器人
    Stop,
}

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日誌系統
    tracing_subscriber::fmt::init();
    
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Start { config, demo } => {
            info!("啟動交易機器人 (配置: {}, 演示模式: {})", config, demo);
            start_trading_bot(&config, demo).await?;
        }
        Commands::ValidateConfig { config } => {
            info!("驗證配置文件: {}", config);
            validate_config(&config).await?;
        }
        Commands::Backtest { strategy, from, to, capital } => {
            info!("運行回測: 策略={}, 期間={}到{}, 資金={}", strategy, from, to, capital);
            run_backtest(&strategy, &from, &to, capital).await?;
        }
        Commands::Status => {
            info!("獲取系統狀態");
            show_status().await?;
        }
        Commands::Stop => {
            info!("停止交易機器人");
            stop_trading_bot().await?;
        }
    }
    
    Ok(())
}

async fn start_trading_bot(config_path: &str, demo_mode: bool) -> Result<()> {
    info!("正在初始化交易機器人...");
    
    // 加載配置
    let config = Arc::new(Config::load(config_path)?);
    
    // 創建交易機器人實例
    let bot = TradingBot::new(config).await?;
    
    if demo_mode {
        info!("演示模式：交易機器人將使用模擬數據運行");
    }
    
    // 啟動機器人
    bot.start().await?;
    
    // 設置優雅關閉
    let bot_arc = std::sync::Arc::new(bot);
    let bot_for_signal = bot_arc.clone();
    
    let signal_handler = tokio::spawn(async move {
        tokio::signal::ctrl_c().await.expect("無法監聽Ctrl+C信號");
        info!("收到停止信號，正在關閉交易機器人...");
        
        if let Err(e) = bot_for_signal.stop().await {
            error!("關閉交易機器人時發生錯誤: {}", e);
        }
    });
    
    // 等待信號
    signal_handler.await.expect("信號處理器失敗");
    
    info!("交易機器人已安全關閉");
    Ok(())
}

async fn validate_config(config_path: &str) -> Result<()> {
    info!("驗證配置文件: {}", config_path);
    
    match trading_bot::utils::config::Config::load(config_path) {
        Ok(_) => {
            info!("✅ 配置文件驗證成功");
            Ok(())
        }
        Err(e) => {
            error!("❌ 配置文件驗證失敗: {}", e);
            Err(e)
        }
    }
}

async fn run_backtest(strategy: &str, from: &str, to: &str, capital: f64) -> Result<()> {
    info!("開始回測: 策略={}, 期間={}到{}, 初始資金={}", strategy, from, to, capital);
    
    // 解析日期
    let start_date = chrono::NaiveDate::parse_from_str(from, "%Y-%m-%d")?
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc();
    let end_date = chrono::NaiveDate::parse_from_str(to, "%Y-%m-%d")?
        .and_hms_opt(23, 59, 59)
        .unwrap()
        .and_utc();
    
    // 載入配置
    let config = Arc::new(Config::load("config/config.toml")?);
    
    // 創建數據管理器
    let mut data_manager = DataManager::new(config.clone());
    data_manager.initialize().await?;
    
    // 創建Python策略管理器
    let python_manager = Arc::new(trading_bot::python::PythonStrategyManager::new());
    
    // 測試Python環境
    python_manager.test_python_environment().await?;
    
    // 創建策略配置
    let strategy_config = trading_bot::python::PythonStrategy {
        id: strategy.to_string(),
        name: strategy.to_string(),
        symbol: "BTCUSDT".to_string(),
        timeframe: "1h".to_string(),
        parameters: {
            let mut params = std::collections::HashMap::new();
            params.insert("fast_period".to_string(), serde_json::Value::Number(serde_json::Number::from(10)));
            params.insert("slow_period".to_string(), serde_json::Value::Number(serde_json::Number::from(30)));
            params
        },
        risk_params: {
            let mut params = std::collections::HashMap::new();
            params.insert("max_position_size".to_string(), 1000.0);
            params.insert("stop_loss".to_string(), 0.02);
            params.insert("take_profit".to_string(), 0.04);
            params
        },
        enabled: true,
    };
    
    // 創建策略
    let strategy_id = python_manager.create_strategy(strategy_config.clone()).await?;
    info!("策略創建成功: {}", strategy_id);
    
    // 獲取歷史數據
    info!("正在獲取歷史數據...");
    let candles = data_manager.collect_historical_data(
        &strategy_config.symbol,
        trading_bot::models::market::Timeframe::H1,
        start_date,
        Some(end_date),
    ).await?;
    
    if candles.is_empty() {
        warn!("未獲取到歷史數據，將使用模擬數據進行回測");
        info!("回測功能需要歷史數據支援");
        return Ok(());
    }
    
    // 轉換數據格式
    let market_data: Vec<trading_bot::python::MarketData> = candles.into_iter()
        .map(|candle| candle.into())
        .collect();
    
    // 配置回測
    let backtest_config = trading_bot::python::BacktestConfig {
        strategy: strategy_config,
        market_data,
        start_date: start_date.to_rfc3339(),
        end_date: end_date.to_rfc3339(),
        initial_capital: capital,
        commission: 0.001,
        slippage: 0.0001,
    };
    
    // 運行回測
    info!("正在運行回測...");
    let result = python_manager.run_backtest(backtest_config).await?;
    
    // 顯示結果
    info!("回測完成！");
    info!("策略名稱: {}", result.strategy_name);
    info!("回測期間: {} - {}", result.start_date, result.end_date);
    info!("初始資金: ${:.2}", result.initial_capital);
    info!("最終資金: ${:.2}", result.final_capital);
    info!("總收益: ${:.2}", result.total_pnl);
    info!("收益率: {:.2}%", result.total_return * 100.0);
    info!("年化收益: {:.2}%", result.annual_return * 100.0);
    info!("最大回撤: {:.2}%", result.max_drawdown * 100.0);
    info!("交易次數: {}", result.total_trades);
    info!("勝率: {:.2}%", result.win_rate * 100.0);
    info!("盈利因子: {:.2}", result.profit_factor);
    info!("夏普比率: {:.2}", result.sharpe_ratio);
    info!("波動率: {:.2}%", result.volatility * 100.0);
    
    Ok(())
}

async fn show_status() -> Result<()> {
    info!("獲取系統狀態...");
    
    // TODO: 實現狀態檢查
    info!("狀態檢查功能正在開發中...");
    
    Ok(())
}

async fn stop_trading_bot() -> Result<()> {
    info!("停止交易機器人...");
    
    // TODO: 實現遠程停止功能
    info!("遠程停止功能正在開發中...");
    
    Ok(())
}
