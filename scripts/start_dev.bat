@echo off
echo 🚀 啟動量化交易機器人1.0...

REM 檢查必要工具
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤: cargo 未安裝
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤: node 未安裝
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤: npm 未安裝
    pause
    exit /b 1
)

echo 🔍 檢查依賴完成...

REM 創建必要目錄
if not exist logs mkdir logs
if not exist data mkdir data

REM 複製環境變量文件
if not exist .env (
    echo 📁 創建環境變量文件...
    copy .env.example .env
    echo ⚠️  請編輯 .env 文件設置您的API密鑰
)

REM 安裝依賴
echo 📦 安裝Rust依賴...
cargo build --release

echo 📦 安裝前端依賴...
cd frontend
npm install
cd ..

REM 啟動服務
echo 🖥️  啟動Tauri應用...
cd frontend
start /B npm run tauri dev

echo ✅ 應用正在啟動中...
echo 📊 儀表板將在幾秒後打開
echo 🔗 如果桌面應用未打開，請手動訪問: http://localhost:5173
echo.
echo 💡 提示:
echo    - 首次啟動可能需要較長時間進行編譯
echo    - 請確保已配置 .env 文件中的API密鑰
echo    - 默認運行在演示模式，不會進行實際交易
echo.
echo 🛑 要停止服務，請關閉此窗口
pause