# 任務完成工作流程

## 開發任務完成檢查清單

### 1. 代碼質量檢查
- [ ] 運行 `cargo fmt` 格式化Rust代碼
- [ ] 運行 `cargo clippy` 檢查Rust代碼質量
- [ ] 運行 `black python/` 格式化Python代碼
- [ ] 運行 `flake8 python/` 檢查Python代碼質量
- [ ] 運行 `mypy python/` 檢查Python類型

### 2. 測試驗證
- [ ] 運行 `cargo test` 執行Rust單元測試
- [ ] 運行 `pytest python/tests/` 執行Python測試
- [ ] 運行 `python scripts/verify.py` 進行項目驗證
- [ ] 運行 `cargo run -- validate-config` 驗證配置

### 3. 功能測試
- [ ] 運行 `cargo run -- start --demo` 測試演示模式
- [ ] 檢查日誌文件是否正常記錄
- [ ] 驗證Discord通知功能（如果啟用）
- [ ] 測試回測功能（如果相關）

### 4. 文檔更新
- [ ] 更新README.md（如果需要）
- [ ] 更新相關文檔
- [ ] 檢查代碼註釋是否完整
- [ ] 更新變更日誌

### 5. 版本控制
- [ ] 提交代碼到Git
- [ ] 創建適當的提交消息
- [ ] 推送到遠程倉庫
- [ ] 創建Pull Request（如果適用）

### 6. 部署準備
- [ ] 運行 `cargo build --release` 構建發布版本
- [ ] 檢查配置文件是否正確
- [ ] 確保環境變量設置正確
- [ ] 備份重要數據

## 錯誤處理流程
1. 檢查錯誤日誌 `logs/error.log`
2. 檢查系統日誌 `logs/trading-bot.log`
3. 運行診斷命令 `cargo run -- status`
4. 如果需要，重啟系統 `cargo run -- stop && cargo run -- start`

## 性能監控
- 檢查系統資源使用情況
- 監控交易執行延遲
- 檢查數據庫連接狀態
- 監控Discord通知發送狀態