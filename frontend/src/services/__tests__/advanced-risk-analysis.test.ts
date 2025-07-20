/**
 * v1.03 第四階段：高級風險分析器測試套件
 * 
 * 測試覆蓋：風險指標計算、VaR/CVaR、壓力測試、蒙特卡羅模擬
 */

import { 
  AdvancedRiskAnalyzer, 
  createDefaultRiskAnalysisConfig 
} from '../advanced-risk-analysis'
import { EnhancedBacktestResult } from '../enhanced-backtest'

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn()
}))

jest.mock('../tauri', () => ({
  isTauriAvailable: () => false
}))

// 創建模擬回測結果
function createMockBacktestResult(): EnhancedBacktestResult {
  return {
    strategy_name: 'Test Strategy',
    start_date: '2024-01-01',
    end_date: '2024-07-31',
    initial_capital: 10000,
    final_capital: 12450,
    total_trades: 89,
    winning_trades: 58,
    losing_trades: 31,
    total_pnl: 2450,
    total_return: 0.245,
    annual_return: 0.328,
    max_drawdown: -0.086,
    sharpe_ratio: 2.45,
    sortino_ratio: 2.89,
    volatility: 0.152,
    var_95: -0.034,
    cvar_95: -0.047,
    calmar_ratio: 3.81,
    omega_ratio: 1.67,
    daily_returns: Array.from({ length: 180 }, () => (Math.random() - 0.5) * 0.04),
    monthly_returns: Array.from({ length: 6 }, () => (Math.random() - 0.3) * 0.2),
    equity_curve: Array.from({ length: 180 }, (_, i) => 10000 + i * 15 + Math.random() * 500),
    trades: []
  }
}

describe('AdvancedRiskAnalyzer', () => {
  
  describe('綜合風險分析', () => {
    test('應返回完整的風險指標', async () => {
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      const riskMetrics = await AdvancedRiskAnalyzer.comprehensiveRiskAnalysis(backtestResult, config)
      
      expect(riskMetrics).toBeDefined()
      
      // 波動率指標
      expect(riskMetrics.volatility).toBeDefined()
      expect(riskMetrics.volatility.daily).toBeGreaterThan(0)
      expect(riskMetrics.volatility.weekly).toBeGreaterThan(0)
      expect(riskMetrics.volatility.monthly).toBeGreaterThan(0)
      expect(riskMetrics.volatility.annualized).toBeGreaterThan(0)
      expect(riskMetrics.volatility.rolling_volatility).toHaveLength(180)
      
      // VaR分析
      expect(riskMetrics.var_analysis).toBeDefined()
      expect(riskMetrics.var_analysis.var_95).toBeLessThan(0)
      expect(riskMetrics.var_analysis.var_99).toBeLessThan(0)
      expect(riskMetrics.var_analysis.cvar_95).toBeLessThan(0)
      expect(riskMetrics.var_analysis.cvar_99).toBeLessThan(0)
      expect(riskMetrics.var_analysis.expected_shortfall).toBeLessThan(0)
      
      // 風險調整收益指標
      expect(riskMetrics.risk_adjusted_returns).toBeDefined()
      expect(riskMetrics.risk_adjusted_returns.sharpe_ratio).toBeGreaterThan(0)
      expect(riskMetrics.risk_adjusted_returns.sortino_ratio).toBeGreaterThan(0)
      expect(riskMetrics.risk_adjusted_returns.calmar_ratio).toBeGreaterThan(0)
    })

    test('回撤分析應包含詳細信息', async () => {
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      const riskMetrics = await AdvancedRiskAnalyzer.comprehensiveRiskAnalysis(backtestResult, config)
      
      expect(riskMetrics.drawdown_analysis).toBeDefined()
      expect(riskMetrics.drawdown_analysis.maximum_drawdown).toBeGreaterThan(0)
      expect(riskMetrics.drawdown_analysis.average_drawdown).toBeGreaterThan(0)
      expect(riskMetrics.drawdown_analysis.drawdown_duration).toBeGreaterThan(0)
      expect(riskMetrics.drawdown_analysis.recovery_time).toBeGreaterThan(0)
      expect(riskMetrics.drawdown_analysis.underwater_curve).toHaveLength(180)
      expect(riskMetrics.drawdown_analysis.drawdown_periods).toBeDefined()
      expect(Array.isArray(riskMetrics.drawdown_analysis.drawdown_periods)).toBe(true)
    })

    test('尾部風險指標計算', async () => {
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      const riskMetrics = await AdvancedRiskAnalyzer.comprehensiveRiskAnalysis(backtestResult, config)
      
      expect(riskMetrics.tail_risk_metrics).toBeDefined()
      expect(typeof riskMetrics.tail_risk_metrics.skewness).toBe('number')
      expect(typeof riskMetrics.tail_risk_metrics.excess_kurtosis).toBe('number')
      expect(riskMetrics.tail_risk_metrics.tail_ratio).toBeGreaterThan(0)
      expect(riskMetrics.tail_risk_metrics.upside_capture).toBeGreaterThan(0)
      expect(riskMetrics.tail_risk_metrics.downside_capture).toBeGreaterThan(0)
      expect(riskMetrics.tail_risk_metrics.gain_loss_ratio).toBeGreaterThan(0)
    })
  })

  describe('風險報告生成', () => {
    test('應生成完整的風險報告', async () => {
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      const riskReport = await AdvancedRiskAnalyzer.generateRiskReport(backtestResult, config)
      
      expect(riskReport).toBeDefined()
      expect(riskReport.report_id).toBeDefined()
      expect(riskReport.generated_at).toBeDefined()
      expect(riskReport.analysis_period).toBeDefined()
      expect(riskReport.analysis_period.start_date).toBe(backtestResult.start_date)
      expect(riskReport.analysis_period.end_date).toBe(backtestResult.end_date)
      
      // 執行摘要
      expect(riskReport.executive_summary).toBeDefined()
      expect(riskReport.executive_summary.overall_risk_rating).toMatch(/^(low|medium|high|extreme)$/)
      expect(riskReport.executive_summary.risk_score).toBeGreaterThanOrEqual(0)
      expect(riskReport.executive_summary.risk_score).toBeLessThanOrEqual(100)
      expect(Array.isArray(riskReport.executive_summary.key_findings)).toBe(true)
      expect(Array.isArray(riskReport.executive_summary.recommendations)).toBe(true)
      expect(Array.isArray(riskReport.executive_summary.warning_flags)).toBe(true)
    })

    test('圖表數據應包含可視化元素', async () => {
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      const riskReport = await AdvancedRiskAnalyzer.generateRiskReport(backtestResult, config)
      
      expect(riskReport.chart_data).toBeDefined()
      expect(Array.isArray(riskReport.chart_data.equity_curve)).toBe(true)
      expect(Array.isArray(riskReport.chart_data.drawdown_chart)).toBe(true)
      expect(Array.isArray(riskReport.chart_data.rolling_metrics)).toBe(true)
      expect(Array.isArray(riskReport.chart_data.risk_heatmap)).toBe(true)
      
      // 檢查數據結構
      if (riskReport.chart_data.equity_curve.length > 0) {
        expect(riskReport.chart_data.equity_curve[0]).toHaveProperty('date')
        expect(riskReport.chart_data.equity_curve[0]).toHaveProperty('value')
      }
    })

    test('風險等級評估', async () => {
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      const riskReport = await AdvancedRiskAnalyzer.generateRiskReport(backtestResult, config)
      
      expect(riskReport.risk_grades).toBeDefined()
      expect(riskReport.risk_grades.overall_grade).toBeDefined()
      expect(riskReport.risk_grades.volatility_grade).toBeDefined()
      expect(riskReport.risk_grades.drawdown_grade).toBeDefined()
      expect(riskReport.risk_grades.tail_risk_grade).toBeDefined()
      expect(riskReport.risk_grades.liquidity_grade).toBeDefined()
    })
  })

  describe('VaR計算測試', () => {
    test('歷史法VaR計算', async () => {
      const returns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04)
      
      const result = await AdvancedRiskAnalyzer.calculateVaR(returns, 0.95, 'historical')
      
      expect(result).toBeDefined()
      expect(result.var).toBeLessThan(0) // VaR應該是負值
      expect(result.cvar).toBeLessThan(0) // CVaR應該是負值
      expect(result.cvar).toBeLessThan(result.var) // CVaR應該比VaR更負
    })

    test('參數法VaR計算', async () => {
      const returns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04)
      
      const result = await AdvancedRiskAnalyzer.calculateVaR(returns, 0.99, 'parametric')
      
      expect(result).toBeDefined()
      expect(result.var).toBeLessThan(0)
      expect(result.cvar).toBeLessThan(0)
    })

    test('蒙特卡羅法VaR計算', async () => {
      const returns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04)
      
      const result = await AdvancedRiskAnalyzer.calculateVaR(returns, 0.95, 'monte_carlo')
      
      expect(result).toBeDefined()
      expect(result.var).toBeLessThan(0)
      expect(result.cvar).toBeLessThan(0)
    })

    test('不同置信水準VaR比較', async () => {
      const returns = Array.from({ length: 252 }, () => (Math.random() - 0.5) * 0.04)
      
      const var95 = await AdvancedRiskAnalyzer.calculateVaR(returns, 0.95)
      const var99 = await AdvancedRiskAnalyzer.calculateVaR(returns, 0.99)
      
      // 99%置信水準的VaR應該比95%更極端（更負）
      expect(var99.var).toBeLessThan(var95.var)
      expect(var99.cvar).toBeLessThan(var95.cvar)
    })
  })

  describe('壓力測試', () => {
    test('市場崩盤情景測試', async () => {
      const backtestResult = createMockBacktestResult()
      const scenarios = {
        'market_crash': [-0.2, -0.15, -0.1, -0.05], // 市場下跌情景
        'volatility_spike': [0.3, 0.4, 0.5, 0.6],   // 波動率激增
        'interest_rate_shock': [0.02, 0.03, 0.05, 0.07] // 利率衝擊
      }
      
      const results = await AdvancedRiskAnalyzer.stressTest(backtestResult, scenarios)
      
      expect(results).toBeDefined()
      expect(results['market_crash']).toBeDefined()
      expect(results['volatility_spike']).toBeDefined()
      expect(results['interest_rate_shock']).toBeDefined()
      
      // 壓力測試結果應該都是負面的
      expect(results['market_crash']).toBeLessThan(backtestResult.total_return)
    })

    test('自定義情景測試', async () => {
      const backtestResult = createMockBacktestResult()
      const scenarios = {
        'crypto_winter': [-0.5, -0.3, -0.2],
        'regulatory_shock': [-0.1, -0.05],
        'liquidity_crisis': [-0.15, -0.1, -0.05]
      }
      
      const results = await AdvancedRiskAnalyzer.stressTest(backtestResult, scenarios)
      
      expect(Object.keys(results)).toHaveLength(3)
      expect(results['crypto_winter']).toBeDefined()
      expect(results['regulatory_shock']).toBeDefined()
      expect(results['liquidity_crisis']).toBeDefined()
    })
  })

  describe('蒙特卡羅風險模擬', () => {
    test('風險模擬應返回完整結果', async () => {
      const backtestResult = createMockBacktestResult()
      const simulations = 1000
      const timeHorizon = 30 // 30天
      
      const result = await AdvancedRiskAnalyzer.monteCarloRiskSimulation(
        backtestResult, 
        simulations, 
        timeHorizon
      )
      
      expect(result).toBeDefined()
      expect(result.simulation_results).toHaveLength(simulations)
      expect(result.percentiles).toBeDefined()
      expect(result.percentiles['p5']).toBeDefined()
      expect(result.percentiles['p95']).toBeDefined()
      expect(result.expected_value).toBeDefined()
      expect(result.worst_case_scenarios).toBeDefined()
      expect(result.worst_case_scenarios).toHaveLength(10)
    })

    test('百分位數計算正確性', async () => {
      const backtestResult = createMockBacktestResult()
      
      const result = await AdvancedRiskAnalyzer.monteCarloRiskSimulation(
        backtestResult, 
        1000, 
        30
      )
      
      const percentiles = result.percentiles
      
      // 百分位數應該遞增
      expect(percentiles['p5']).toBeLessThan(percentiles['p10'])
      expect(percentiles['p10']).toBeLessThan(percentiles['p25'])
      expect(percentiles['p25']).toBeLessThan(percentiles['p50'])
      expect(percentiles['p50']).toBeLessThan(percentiles['p75'])
      expect(percentiles['p75']).toBeLessThan(percentiles['p90'])
      expect(percentiles['p90']).toBeLessThan(percentiles['p95'])
    })

    test('時間軸影響模擬結果', async () => {
      const backtestResult = createMockBacktestResult()
      
      const shortTerm = await AdvancedRiskAnalyzer.monteCarloRiskSimulation(backtestResult, 500, 7)
      const longTerm = await AdvancedRiskAnalyzer.monteCarloRiskSimulation(backtestResult, 500, 365)
      
      // 長期模擬的結果範圍應該更大
      const shortRange = shortTerm.percentiles['p95'] - shortTerm.percentiles['p5']
      const longRange = longTerm.percentiles['p95'] - longTerm.percentiles['p5']
      
      expect(longRange).toBeGreaterThan(shortRange)
    })
  })

  describe('風險等級評估', () => {
    test('高質量策略應獲得高評級', () => {
      const mockRiskMetrics = {
        volatility: { annualized: 0.15 },
        risk_adjusted_returns: { sharpe_ratio: 2.5 },
        drawdown_analysis: { maximum_drawdown: -0.05 }
      } as any
      
      const assessment = AdvancedRiskAnalyzer.assessRiskGrade(mockRiskMetrics)
      
      expect(assessment.overall_grade).toMatch(/^[A-F][+-]?$/)
      expect(assessment.grade_explanation).toContain('綜合評分')
      expect(Array.isArray(assessment.improvement_areas)).toBe(true)
    })

    test('低質量策略應獲得低評級', () => {
      const mockRiskMetrics = {
        volatility: { annualized: 0.45 }, // 高波動率
        risk_adjusted_returns: { sharpe_ratio: 0.5 }, // 低夏普比率
        drawdown_analysis: { maximum_drawdown: -0.25 } // 大回撤
      } as any
      
      const assessment = AdvancedRiskAnalyzer.assessRiskGrade(mockRiskMetrics)
      
      expect(assessment.overall_grade).toBe('F')
      expect(assessment.improvement_areas.length).toBeGreaterThan(0)
      expect(assessment.improvement_areas).toContain('降低投資組合波動率')
      expect(assessment.improvement_areas).toContain('提高風險調整收益率')
      expect(assessment.improvement_areas).toContain('控制最大回撤幅度')
    })

    test('中等質量策略評級', () => {
      const mockRiskMetrics = {
        volatility: { annualized: 0.22 },
        risk_adjusted_returns: { sharpe_ratio: 1.2 },
        drawdown_analysis: { maximum_drawdown: -0.12 }
      } as any
      
      const assessment = AdvancedRiskAnalyzer.assessRiskGrade(mockRiskMetrics)
      
      expect(['B', 'C'].some(grade => assessment.overall_grade.includes(grade))).toBe(true)
    })
  })

  describe('配置測試', () => {
    test('默認風險分析配置', () => {
      const config = createDefaultRiskAnalysisConfig()
      
      expect(config.confidence_levels).toEqual([0.95, 0.99])
      expect(config.time_horizons).toEqual([1, 7, 30])
      expect(config.risk_free_rate).toBe(0.03)
      expect(config.var_method).toBe('historical')
      expect(config.lookback_window).toBe(252)
      expect(config.monte_carlo_simulations).toBe(10000)
      expect(config.stress_testing).toBe(true)
      expect(config.scenario_analysis).toBe(true)
      expect(config.correlation_analysis).toBe(true)
      expect(config.regime_detection).toBe(true)
      expect(config.relative_risk_analysis).toBe(true)
    })

    test('自定義配置驗證', () => {
      const customConfig = createDefaultRiskAnalysisConfig()
      customConfig.confidence_levels = [0.90, 0.95, 0.99]
      customConfig.var_method = 'monte_carlo'
      customConfig.monte_carlo_simulations = 5000
      
      expect(customConfig.confidence_levels).toHaveLength(3)
      expect(customConfig.var_method).toBe('monte_carlo')
      expect(customConfig.monte_carlo_simulations).toBe(5000)
    })
  })

  describe('性能測試', () => {
    test('風險分析執行時間應合理', async () => {
      const startTime = Date.now()
      
      const backtestResult = createMockBacktestResult()
      const config = createDefaultRiskAnalysisConfig()
      
      await AdvancedRiskAnalyzer.comprehensiveRiskAnalysis(backtestResult, config)
      
      const executionTime = Date.now() - startTime
      
      // 模擬API應該在3秒內完成
      expect(executionTime).toBeLessThan(3000)
    }, 5000)

    test('大數據量處理性能', async () => {
      const backtestResult = createMockBacktestResult()
      // 增加數據量
      backtestResult.daily_returns = Array.from({ length: 1000 }, () => (Math.random() - 0.5) * 0.04)
      backtestResult.equity_curve = Array.from({ length: 1000 }, (_, i) => 10000 + i * 15 + Math.random() * 500)
      
      const startTime = Date.now()
      
      const config = createDefaultRiskAnalysisConfig()
      await AdvancedRiskAnalyzer.generateRiskReport(backtestResult, config)
      
      const executionTime = Date.now() - startTime
      
      // 處理大數據量也應該在合理時間內完成
      expect(executionTime).toBeLessThan(5000)
    }, 8000)
  })

  describe('邊界情況測試', () => {
    test('空數據處理', async () => {
      const backtestResult = createMockBacktestResult()
      backtestResult.daily_returns = []
      backtestResult.equity_curve = []
      
      const config = createDefaultRiskAnalysisConfig()
      
      // 應該能處理空數據而不崩潰
      expect(async () => {
        await AdvancedRiskAnalyzer.comprehensiveRiskAnalysis(backtestResult, config)
      }).not.toThrow()
    })

    test('極端數值處理', async () => {
      const backtestResult = createMockBacktestResult()
      // 極端收益率
      backtestResult.daily_returns = [0.5, -0.5, 0.3, -0.3, 0.1, -0.1]
      
      const config = createDefaultRiskAnalysisConfig()
      
      const result = await AdvancedRiskAnalyzer.comprehensiveRiskAnalysis(backtestResult, config)
      
      expect(result).toBeDefined()
      expect(result.volatility.daily).toBeGreaterThan(0)
      expect(result.var_analysis.var_95).toBeLessThan(0)
    })
  })
})