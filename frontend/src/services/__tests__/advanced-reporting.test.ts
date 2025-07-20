/**
 * v1.03 第四階段：專業報告生成系統測試套件
 * 
 * 測試覆蓋：報告生成、數據導出、模板管理、格式驗證
 */

import { 
  AdvancedReportGenerator,
  ReportTemplateManager
} from '../advanced-reporting'
import { 
  EnhancedBacktestResult,
} from '../enhanced-backtest'
import { AdvancedOptimizationResult } from '../advanced-optimization'
import { RiskReport } from '../advanced-risk-analysis'

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn()
}))

jest.mock('../tauri', () => ({
  isTauriAvailable: () => false
}))

// 測試數據工廠
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

function createMockOptimizationResult(): AdvancedOptimizationResult {
  return {
    best_parameters: { fast_period: 12, slow_period: 26 },
    best_score: 2.73,
    best_backtest_result: createMockBacktestResult(),
    all_results: [],
    optimization_history: [1.0, 1.5, 2.0, 2.5, 2.73],
    convergence_info: { converged: true, iterations_to_converge: 85 },
    total_evaluations: 100,
    execution_time: 5800,
    method_used: 'bayesian_optimization',
    parameter_importance: { fast_period: 0.7, slow_period: 0.6 },
    parameter_correlations: { fast_period: { slow_period: -0.3 } },
    sensitivity_analysis: { fast_period: 0.8, slow_period: 0.5 },
    risk_adjusted_ranking: [],
    stability_metrics: {
      parameter_stability: 0.89,
      performance_consistency: 0.85,
      robustness_score: 0.87
    },
    overfitting_indicators: {
      in_sample_performance: 2.73,
      out_sample_performance: 2.48,
      performance_degradation: 0.09,
      overfitting_risk: 'low'
    },
    optimization_surface: [],
    convergence_plot: []
  } as AdvancedOptimizationResult
}

function createMockRiskReport(): RiskReport {
  return {
    report_id: 'RISK_TEST_123',
    generated_at: '2024-07-31T12:00:00Z',
    analysis_period: {
      start_date: '2024-01-01',
      end_date: '2024-07-31',
      total_days: 180
    },
    executive_summary: {
      overall_risk_rating: 'medium',
      risk_score: 75.8,
      key_findings: ['夏普比率達到2.34，表現優異'],
      recommendations: ['建議進一步優化倉位管理'],
      warning_flags: ['⚠️ 部分期間存在較高的尾部風險']
    },
    risk_metrics: {
      volatility: { 
        daily: 0.018, 
        weekly: 0.042, 
        monthly: 0.085, 
        annualized: 0.182,
        rolling_volatility: []
      },
      var_analysis: {
        var_95: -0.034,
        var_99: -0.058,
        cvar_95: -0.047,
        cvar_99: -0.074,
        expected_shortfall: -0.052
      },
      risk_adjusted_returns: {
        sharpe_ratio: 2.34,
        sortino_ratio: 2.67,
        calmar_ratio: 1.85
      },
      drawdown_analysis: {
        maximum_drawdown: 0.086,
        average_drawdown: 0.032,
        drawdown_duration: 15.5,
        recovery_time: 8.2,
        drawdown_frequency: 0.15,
        underwater_curve: [],
        drawdown_periods: []
      },
      tail_risk_metrics: {
        skewness: 0.12,
        excess_kurtosis: 1.85,
        tail_ratio: 0.68,
        upside_capture: 1.15,
        downside_capture: 0.82,
        gain_loss_ratio: 1.45
      },
      risk_attribution: {
        systematic_risk: 0.65,
        idiosyncratic_risk: 0.35,
        concentration_risk: 0.15,
        liquidity_risk: 0.08
      },
      dynamic_risk_metrics: {
        rolling_sharpe: [],
        rolling_volatility: [],
        risk_regime: []
      }
    } as any,
    chart_data: {
      equity_curve: [],
      drawdown_chart: [],
      rolling_metrics: [],
      risk_heatmap: []
    },
    risk_grades: {
      overall_grade: 'B+',
      volatility_grade: 'B',
      drawdown_grade: 'A-',
      tail_risk_grade: 'B+',
      liquidity_grade: 'A'
    }
  }
}

describe('AdvancedReportGenerator', () => {
  
  describe('綜合報告生成', () => {
    test('應生成完整的綜合報告', async () => {
      const backtestResult = createMockBacktestResult()
      const optimizationResult = createMockOptimizationResult()
      const riskReport = createMockRiskReport()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateComprehensiveReport(
        backtestResult,
        optimizationResult,
        riskReport,
        config
      )
      
      expect(report).toBeDefined()
      expect(report.report_id).toBeDefined()
      expect(report.report_id).toMatch(/^COMPREHENSIVE_\d+$/)
      expect(report.generated_at).toBeDefined()
      expect(report.report_title).toContain(backtestResult.strategy_name)
      expect(report.report_type).toBe('comprehensive')
      expect(report.file_format).toBe(config.output_format)
      
      // 內容摘要驗證
      expect(report.content_summary).toBeDefined()
      expect(report.content_summary.total_sections).toBeGreaterThan(0)
      expect(report.content_summary.chart_count).toBeGreaterThan(0)
      expect(report.content_summary.table_count).toBeGreaterThan(0)
      expect(report.content_summary.key_metrics_count).toBeGreaterThan(0)
      
      // 下載信息
      expect(report.download_url).toBeDefined()
      expect(report.expires_at).toBeDefined()
      expect(report.file_path).toBeDefined()
      expect(report.file_size).toBeGreaterThan(0)
      
      // 元數據
      expect(report.metadata).toBeDefined()
      expect(report.metadata.strategy_name).toBe(backtestResult.strategy_name)
      expect(report.metadata.total_return).toBe(backtestResult.total_return)
      expect(report.metadata.max_drawdown).toBe(backtestResult.max_drawdown)
      expect(report.metadata.sharpe_ratio).toBe(backtestResult.sharpe_ratio)
    })

    test('不同格式生成測試', async () => {
      const backtestResult = createMockBacktestResult()
      const formats: Array<'pdf' | 'html' | 'excel' | 'json'> = ['pdf', 'html', 'excel', 'json']
      
      for (const format of formats) {
        const config = AdvancedReportGenerator.getDefaultReportConfig()
        config.output_format = format
        
        const report = await AdvancedReportGenerator.generateComprehensiveReport(
          backtestResult,
          undefined,
          undefined,
          config
        )
        
        expect(report.file_format).toBe(format)
        expect(report.file_path).toContain(`.${format}`)
        
        // PDF應該有頁數信息
        if (format === 'pdf') {
          expect(report.page_count).toBeDefined()
          expect(report.page_count).toBeGreaterThan(0)
        }
      }
    })

    test('報告模板測試', async () => {
      const backtestResult = createMockBacktestResult()
      const templates: Array<'professional' | 'detailed' | 'minimal'> = ['professional', 'detailed', 'minimal']
      
      for (const template of templates) {
        const config = AdvancedReportGenerator.getDefaultReportConfig()
        config.template = template
        
        const report = await AdvancedReportGenerator.generateComprehensiveReport(
          backtestResult,
          undefined,
          undefined,
          config
        )
        
        expect(report).toBeDefined()
        expect(report.report_id).toBeDefined()
        
        // 不同模板的文件大小可能不同
        if (template === 'minimal') {
          expect(report.content_summary.total_sections).toBeLessThanOrEqual(5)
        } else if (template === 'detailed') {
          expect(report.content_summary.total_sections).toBeGreaterThanOrEqual(6)
        }
      }
    })
  })

  describe('執行摘要報告', () => {
    test('應生成簡潔的執行摘要', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateExecutiveSummary(backtestResult, config)
      
      expect(report).toBeDefined()
      expect(report.report_type).toBe('executive_summary')
      expect(report.report_title).toContain('執行摘要')
      expect(report.content_summary.total_sections).toBeLessThanOrEqual(5)
      expect(report.file_size).toBeLessThan(5 * 1024 * 1024) // 應該小於5MB
      
      // PDF格式的執行摘要應該頁數較少
      if (config.output_format === 'pdf') {
        expect(report.page_count).toBeLessThanOrEqual(10)
      }
    })

    test('執行摘要應包含關鍵指標', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateExecutiveSummary(backtestResult, config)
      
      expect(report.metadata.total_return).toBe(backtestResult.total_return)
      expect(report.metadata.max_drawdown).toBe(backtestResult.max_drawdown)
      expect(report.metadata.sharpe_ratio).toBe(backtestResult.sharpe_ratio)
      expect(report.content_summary.key_metrics_count).toBeGreaterThan(5)
    })
  })

  describe('優化報告生成', () => {
    test('應生成詳細的優化報告', async () => {
      const optimizationResult = createMockOptimizationResult()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateOptimizationReport(optimizationResult, config)
      
      expect(report).toBeDefined()
      expect(report.report_type).toBe('optimization_report')
      expect(report.report_title).toContain('參數優化分析報告')
      expect(report.report_title).toContain(optimizationResult.method_used)
      expect(report.metadata.strategy_name).toContain('優化策略')
      expect(report.metadata.total_return).toBe(optimizationResult.best_score)
    })

    test('優化報告應包含算法信息', async () => {
      const optimizationResult = createMockOptimizationResult()
      optimizationResult.method_used = 'genetic_algorithm'
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateOptimizationReport(optimizationResult, config)
      
      expect(report.report_title).toContain('genetic_algorithm')
      expect(report.content_summary.chart_count).toBeGreaterThan(5) // 優化報告應有多個圖表
    })
  })

  describe('風險分析報告', () => {
    test('應生成專業的風險報告', async () => {
      const riskReport = createMockRiskReport()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateRiskAnalysisReport(riskReport, config)
      
      expect(report).toBeDefined()
      expect(report.report_type).toBe('risk_analysis')
      expect(report.report_title).toContain('風險分析報告')
      expect(report.report_title).toContain(riskReport.analysis_period.start_date)
      expect(report.report_title).toContain(riskReport.analysis_period.end_date)
      expect(report.metadata.strategy_name).toBe('風險分析')
    })

    test('風險報告元數據驗證', async () => {
      const riskReport = createMockRiskReport()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateRiskAnalysisReport(riskReport, config)
      
      expect(report.metadata.max_drawdown).toBe(riskReport.risk_metrics.drawdown_analysis.maximum_drawdown)
      expect(report.metadata.sharpe_ratio).toBe(riskReport.risk_metrics.risk_adjusted_returns.sharpe_ratio)
      expect(report.content_summary.chart_count).toBeGreaterThan(8) // 風險報告圖表較多
    })
  })

  describe('比較分析報告', () => {
    test('應生成多策略比較報告', async () => {
      const results = [
        createMockBacktestResult(),
        { ...createMockBacktestResult(), strategy_name: 'Strategy B', sharpe_ratio: 1.89 },
        { ...createMockBacktestResult(), strategy_name: 'Strategy C', sharpe_ratio: 3.12 }
      ]
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateComparisonReport(results, config)
      
      expect(report).toBeDefined()
      expect(report.report_type).toBe('comparison_report')
      expect(report.report_title).toContain('策略比較分析報告')
      expect(report.report_title).toContain(`${results.length}個策略`)
      expect(report.metadata.strategy_name).toContain(`比較分析 (${results.length}策略)`)
      
      // 比較報告應該取最好的指標
      expect(report.metadata.sharpe_ratio).toBe(Math.max(...results.map(r => r.sharpe_ratio)))
      expect(report.content_summary.key_metrics_count).toBe(results.length * 10)
    })

    test('空結果數組處理', async () => {
      const results: EnhancedBacktestResult[] = []
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const report = await AdvancedReportGenerator.generateComparisonReport(results, config)
      
      expect(report).toBeDefined()
      expect(report.metadata.total_return).toBe(0)
      expect(report.metadata.max_drawdown).toBe(0)
      expect(report.metadata.sharpe_ratio).toBe(0)
    })
  })

  describe('數據導出功能', () => {
    test('Excel格式導出', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      config.export_format = 'excel'
      
      const exportResult = await AdvancedReportGenerator.exportRawData(backtestResult, config)
      
      expect(exportResult).toBeDefined()
      expect(exportResult.export_format).toBe('excel')
      expect(exportResult.file_path).toContain('.excel')
      expect(exportResult.data_summary).toBeDefined()
      expect(exportResult.data_summary.total_records).toBe(backtestResult.trades?.length || 0)
      expect(exportResult.metadata.export_config).toBe(config)
    })

    test('CSV格式導出', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      config.export_format = 'csv'
      
      const exportResult = await AdvancedReportGenerator.exportRawData(backtestResult, config)
      
      expect(exportResult).toBeDefined()
      expect(exportResult.export_format).toBe('csv')
      expect(exportResult.file_path).toContain('.csv')
    })

    test('JSON格式導出', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      config.export_format = 'json'
      
      const exportResult = await AdvancedReportGenerator.exportRawData(backtestResult, config)
      
      expect(exportResult).toBeDefined()
      expect(exportResult.export_format).toBe('json')
      expect(exportResult.file_path).toContain('.json')
    })

    test('數據類型選擇', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      
      // 只選擇部分數據類型
      config.data_types = {
        equity_curve: true,
        trade_history: false,
        daily_returns: true,
        risk_metrics: false,
        optimization_results: false,
        performance_metrics: true,
        custom_indicators: false
      }
      
      const exportResult = await AdvancedReportGenerator.exportRawData(backtestResult, config)
      
      const enabledTypes = Object.keys(config.data_types).filter(
        key => config.data_types[key as keyof typeof config.data_types]
      )
      
      expect(exportResult.data_summary.data_types_included).toHaveLength(enabledTypes.length)
    })

    test('優化數據導出', async () => {
      const optimizationResult = createMockOptimizationResult()
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      
      const exportResult = await AdvancedReportGenerator.exportOptimizationData(optimizationResult, config)
      
      expect(exportResult).toBeDefined()
      expect(exportResult.data_summary.total_records).toBe(optimizationResult.all_results.length)
      expect(exportResult.data_summary.data_types_included).toContain('optimization_results')
      expect(exportResult.data_summary.data_types_included).toContain('parameter_importance')
    })

    test('風險數據導出', async () => {
      const riskReport = createMockRiskReport()
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      
      const exportResult = await AdvancedReportGenerator.exportRiskData(riskReport, config)
      
      expect(exportResult).toBeDefined()
      expect(exportResult.data_summary.data_types_included).toContain('risk_metrics')
      expect(exportResult.data_summary.data_types_included).toContain('drawdown_analysis')
      expect(exportResult.data_summary.date_range.start_date).toBe(riskReport.analysis_period.start_date)
      expect(exportResult.data_summary.date_range.end_date).toBe(riskReport.analysis_period.end_date)
    })
  })

  describe('批量導出', () => {
    test('多類型數據批量導出', async () => {
      const backtestResult = createMockBacktestResult()
      const optimizationResult = createMockOptimizationResult()
      const riskReport = createMockRiskReport()
      
      const exports = [
        {
          type: 'backtest' as const,
          data: backtestResult,
          config: AdvancedReportGenerator.getDefaultDataExportConfig()
        },
        {
          type: 'optimization' as const,
          data: optimizationResult,
          config: { ...AdvancedReportGenerator.getDefaultDataExportConfig(), export_format: 'json' as const }
        },
        {
          type: 'risk' as const,
          data: riskReport,
          config: { ...AdvancedReportGenerator.getDefaultDataExportConfig(), export_format: 'csv' as const }
        }
      ]
      
      const results = await AdvancedReportGenerator.batchExport(exports)
      
      expect(results).toHaveLength(3)
      expect(results[0].export_format).toBe('zip')
      expect(results[0].file_path).toContain('batch_')
      
      results.forEach((result, index) => {
        expect(result.export_id).toContain(`BATCH_EXPORT_`)
        expect(result.file_size).toBeGreaterThan(0)
        expect(result.download_url).toBeDefined()
        expect(result.expires_at).toBeDefined()
      })
    })

    test('空批量導出處理', async () => {
      const results = await AdvancedReportGenerator.batchExport([])
      
      expect(results).toHaveLength(0)
    })
  })

  describe('報告模板管理', () => {
    test('獲取可用模板', async () => {
      const templates = await AdvancedReportGenerator.getReportTemplates()
      
      expect(templates).toBeDefined()
      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBeGreaterThan(0)
      
      templates.forEach(template => {
        expect(template.id).toBeDefined()
        expect(template.name).toBeDefined()
        expect(template.description).toBeDefined()
        expect(Array.isArray(template.supported_formats)).toBe(true)
        expect(template.supported_formats.length).toBeGreaterThan(0)
      })
      
      // 檢查默認模板存在
      const templateIds = templates.map(t => t.id)
      expect(templateIds).toContain('professional')
      expect(templateIds).toContain('executive')
      expect(templateIds).toContain('detailed')
      expect(templateIds).toContain('minimal')
    })

    test('創建自定義模板', async () => {
      const customTemplate = {
        name: '測試模板',
        description: '用於單元測試的自定義模板',
        sections: ['summary', 'charts', 'analysis'],
        styling: { theme: 'dark', color: '#00f5d4' }
      }
      
      const templateId = await AdvancedReportGenerator.createCustomTemplate(customTemplate)
      
      expect(templateId).toBeDefined()
      expect(templateId).toMatch(/^custom_template_\d+$/)
    })

    test('報告預覽', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      const preview = await AdvancedReportGenerator.previewReport(backtestResult, config)
      
      expect(preview).toBeDefined()
      expect(preview.preview_html).toBeDefined()
      expect(preview.preview_html).toContain(backtestResult.strategy_name)
      expect(preview.preview_html).toContain((backtestResult.total_return * 100).toFixed(2))
      expect(preview.preview_html).toContain(backtestResult.sharpe_ratio.toFixed(2))
      expect(preview.estimated_page_count).toBeGreaterThan(0)
      expect(preview.generation_time_estimate).toBeGreaterThan(0)
    })
  })

  describe('配置測試', () => {
    test('默認報告配置', () => {
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      expect(config.report_type).toBe('comprehensive')
      expect(config.output_format).toBe('pdf')
      expect(config.template).toBe('professional')
      expect(config.locale).toBe('zh-TW')
      expect(config.currency).toBe('USD')
      expect(config.include_disclaimers).toBe(true)
      
      // 檢查包含的章節
      expect(config.include_sections.executive_summary).toBe(true)
      expect(config.include_sections.performance_analysis).toBe(true)
      expect(config.include_sections.risk_analysis).toBe(true)
      expect(config.include_sections.charts_and_graphs).toBe(true)
      
      // 檢查品牌配置
      expect(config.branding).toBeDefined()
      expect(config.branding.company_name).toBe('量化交易分析平台')
      expect(config.branding.primary_color).toBe('#00f5d4')
      
      // 檢查圖表配置
      expect(config.chart_config).toBeDefined()
      expect(config.chart_config.chart_theme).toBe('neon')
      expect(config.chart_config.chart_resolution).toBe('high')
    })

    test('默認數據導出配置', () => {
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      
      expect(config.export_format).toBe('excel')
      expect(config.compression).toBe('zip')
      
      // 檢查數據類型選擇
      expect(config.data_types.equity_curve).toBe(true)
      expect(config.data_types.trade_history).toBe(true)
      expect(config.data_types.daily_returns).toBe(true)
      expect(config.data_types.performance_metrics).toBe(true)
      
      // Excel選項
      expect(config.excel_options).toBeDefined()
      expect(config.excel_options!.include_charts).toBe(true)
      expect(config.excel_options!.formatting).toBe(true)
      expect(config.excel_options!.multiple_sheets).toBe(true)
      expect(config.excel_options!.sheet_names).toBeDefined()
    })
  })

  describe('性能測試', () => {
    test('報告生成時間應合理', async () => {
      const startTime = Date.now()
      
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      
      await AdvancedReportGenerator.generateExecutiveSummary(backtestResult, config)
      
      const executionTime = Date.now() - startTime
      
      // 模擬API應該在3秒內完成
      expect(executionTime).toBeLessThan(3000)
    }, 5000)

    test('大量數據導出性能', async () => {
      const backtestResult = createMockBacktestResult()
      // 增加數據量
      backtestResult.equity_curve = Array.from({ length: 5000 }, (_, i) => 10000 + i * 5)
      backtestResult.daily_returns = Array.from({ length: 5000 }, () => (Math.random() - 0.5) * 0.02)
      
      const startTime = Date.now()
      
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      await AdvancedReportGenerator.exportRawData(backtestResult, config)
      
      const executionTime = Date.now() - startTime
      
      // 處理大數據量也應該在合理時間內完成
      expect(executionTime).toBeLessThan(4000)
    }, 6000)
  })

  describe('錯誤處理', () => {
    test('無效報告類型處理', async () => {
      const backtestResult = createMockBacktestResult()
      const config = AdvancedReportGenerator.getDefaultReportConfig()
      config.report_type = 'invalid_type' as any
      
      // 應該能處理無效類型而不崩潰
      expect(async () => {
        await AdvancedReportGenerator.generateComprehensiveReport(backtestResult, undefined, undefined, config)
      }).not.toThrow()
    })

    test('缺失數據處理', async () => {
      const backtestResult = createMockBacktestResult()
      backtestResult.equity_curve = []
      backtestResult.daily_returns = []
      
      const config = AdvancedReportGenerator.getDefaultDataExportConfig()
      
      const exportResult = await AdvancedReportGenerator.exportRawData(backtestResult, config)
      
      expect(exportResult).toBeDefined()
      expect(exportResult.data_summary.total_records).toBe(0)
    })
  })
})

describe('ReportTemplateManager', () => {
  
  describe('模板管理', () => {
    test('加載模板', async () => {
      const template = await ReportTemplateManager.loadTemplate('professional')
      
      expect(template).toBeDefined()
      expect(template.id).toBe('professional')
      expect(template.content).toBeDefined()
    })

    test('保存自定義模板', async () => {
      const customTemplate = {
        name: '測試模板',
        sections: ['header', 'content', 'footer'],
        styling: { color: '#ff0000' }
      }
      
      const templateId = await ReportTemplateManager.saveCustomTemplate(customTemplate)
      
      expect(templateId).toBeDefined()
      expect(templateId).toMatch(/^custom_\d+$/)
    })

    test('刪除模板', async () => {
      const result = await ReportTemplateManager.deleteTemplate('custom_123')
      
      expect(result).toBe(true)
    })
  })
})