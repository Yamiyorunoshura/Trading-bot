//! 日誌工具

use anyhow::Result;

/// 初始化日誌系統
pub fn init_logger() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "trading_bot=info".into()),
        )
        .init();
    
    Ok(())
}
