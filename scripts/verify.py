#!/usr/bin/env python3
"""
項目實現驗證腳本
檢查已實現的功能和組件
"""

import os
import sys
from pathlib import Path

def check_file_exists(file_path, description):
    """檢查文件是否存在"""
    if Path(file_path).exists():
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path}")
        return False

def check_python_imports():
    """檢查Python模組是否可以導入"""
    try:
        sys.path.append('python')
        from strategies.base import BaseStrategy, StrategySignal, StrategyConfig
        from strategies.sma_crossover import SMACrossoverStrategy
        print("✅ Python策略模組導入成功")
        return True
    except ImportError as e:
        print(f"❌ Python策略模組導入失敗: {e}")
        return False

def main():
    print("🔍 量化交易機器人實現驗證")
    print("=" * 50)
    
    # 檢查項目結構
    print("\n📁 項目結構檢查:")
    structure_checks = [
        ("src/lib.rs", "Rust主庫文件"),
        ("src/main.rs", "Rust主程序"),
        ("src/models/mod.rs", "數據模型模組"),
        ("src/utils/config.rs", "配置管理"),
        ("src/api/discord.rs", "Discord通知"),
        ("python/strategies/base.py", "策略基類"),
        ("python/strategies/sma_crossover.py", "SMA策略"),
        ("config/config.toml", "配置文件"),
        ("Cargo.toml", "Rust依賴配置"),
        ("requirements.txt", "Python依賴配置"),
    ]
    
    structure_score = 0
    for file_path, description in structure_checks:
        if check_file_exists(file_path, description):
            structure_score += 1
    
    # 檢查Python模組
    print("\n🐍 Python模組檢查:")
    python_ok = check_python_imports()
    
    # 檢查配置文件
    print("\n⚙️ 配置文件檢查:")
    config_checks = [
        (".env.example", "環境變數範例"),
        ("scripts/setup.sh", "環境設置腳本"),
        ("README.md", "項目文檔"),
    ]
    
    config_score = 0
    for file_path, description in config_checks:
        if check_file_exists(file_path, description):
            config_score += 1
    
    # 計算總分
    total_checks = len(structure_checks) + len(config_checks) + (1 if python_ok else 0)
    passed_checks = structure_score + config_score + (1 if python_ok else 0)
    
    print("\n📊 驗證結果:")
    print(f"通過檢查: {passed_checks}/{total_checks}")
    print(f"完成度: {passed_checks/total_checks*100:.1f}%")
    
    if passed_checks == total_checks:
        print("🎉 所有檢查通過！項目實現基本完成。")
    elif passed_checks >= total_checks * 0.8:
        print("✅ 大部分檢查通過，項目實現良好。")
    else:
        print("⚠️ 部分檢查未通過，需要完善實現。")
    
    print("\n🚀 下一步:")
    print("1. 運行 ./scripts/setup.sh 設置環境")
    print("2. 編輯 .env 文件設置API密鑰")
    print("3. 運行 cargo run -- start --demo 測試系統")

if __name__ == "__main__":
    main()
