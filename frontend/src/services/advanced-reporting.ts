/**
 * v1.03 第三階段：專業報告生成和數據導出系統
 * 
 * 支持PDF、Excel、HTML格式的專業回測報告和數據導出
 */

import { EnhancedBacktestResult, OptimizationResult } from './enhanced-backtest'
import { AdvancedOptimizationResult } from './advanced-optimization'
import { RiskReport } from './advanced-risk-analysis'
import { invoke } from '@tauri-apps/api/tauri'
import { tauriApiService } from './tauri'

// ===== 報告生成接口定義 =====

export interface ReportConfig {
  // 基礎配置
  report_type: 'comprehensive' | 'executive_summary' | 'risk_analysis' | 'optimization_report'
  output_format: 'pdf' | 'html' | 'excel' | 'json'
  template: 'professional' | 'detailed' | 'minimal' | 'custom'
  
  // 內容配置
  include_sections: {
    executive_summary: boolean
    performance_analysis: boolean
    risk_analysis: boolean
    trade_analysis: boolean
    optimization_results: boolean
    charts_and_graphs: boolean
    appendices: boolean
    raw_data: boolean
  }
  
  // 樣式配置
  branding: {
    company_name?: string
    logo_url?: string
    primary_color?: string
    secondary_color?: string
  }
  
  // 圖表配置
  chart_config: {
    chart_theme: 'light' | 'dark' | 'neon'
    include_interactive_charts: boolean
    chart_resolution: 'standard' | 'high' | 'print_quality'
    chart_formats: string[]
  }
  
  // 語言和地區
  locale: string
  currency: string
  date_format: string
  number_format: string
  
  // 高級選項
  include_disclaimers: boolean
  custom_sections?: Array<{
    title: string
    content: string
    position: number
  }>
  
  // 比較分析
  comparative_analysis?: {
    include_benchmark_comparison: boolean
    benchmark_data?: any
    peer_comparison: boolean
  }
}

export interface GeneratedReport {
  // 報告元數據
  report_id: string
  generated_at: string
  report_title: string
  report_type: string
  file_format: string
  
  // 文件信息
  file_path: string
  file_size: number
  page_count?: number
  
  // 內容摘要
  content_summary: {
    total_sections: number
    chart_count: number
    table_count: number
    key_metrics_count: number
  }
  
  // 下載信息
  download_url: string
  expires_at: string
  
  // 元數據
  metadata: {
    strategy_name: string
    analysis_period: string
    total_return: number
    max_drawdown: number
    sharpe_ratio: number
  }
}

export interface DataExportConfig {
  // 導出格式
  export_format: 'csv' | 'excel' | 'json' | 'parquet' | 'hdf5'
  
  // 數據選擇
  data_types: {
    equity_curve: boolean
    trade_history: boolean
    daily_returns: boolean
    risk_metrics: boolean
    optimization_results: boolean
    performance_metrics: boolean
    custom_indicators: boolean
  }
  
  // 格式選項
  csv_options?: {
    delimiter: string
    header: boolean
    index: boolean
    encoding: string
  }
  
  excel_options?: {
    sheet_names: Record<string, string>
    include_charts: boolean
    formatting: boolean
    multiple_sheets: boolean
  }
  
  json_options?: {
    pretty_print: boolean
    date_format: string
    null_handling: string
  }
  
  // 篩選選項
  date_range?: {
    start_date: string
    end_date: string
  }
  
  custom_filters?: Record<string, any>
  
  // 壓縮選項
  compression?: 'none' | 'gzip' | 'zip' | 'bz2'
}

export interface ExportedData {
  export_id: string
  exported_at: string
  export_format: string
  file_path: string
  file_size: number
  download_url: string
  expires_at: string
  
  data_summary: {
    total_records: number
    data_types_included: string[]
    date_range: {
      start_date: string
      end_date: string
    }
  }
  
  metadata: {
    exported_by: string
    source_backtest_id: string
    export_config: DataExportConfig
  }
}

// ===== 專業報告生成器 =====

export class AdvancedReportGenerator {
  
  // 生成綜合回測報告
  static async generateComprehensiveReport(
    backtestResult: EnhancedBacktestResult,
    optimizationResult?: AdvancedOptimizationResult,
    riskReport?: RiskReport,
    config: ReportConfig = this.getDefaultReportConfig()
  ): Promise<GeneratedReport> {
    if (tauriApiService()) {
      return await invoke('generate_comprehensive_report', { 
        backtestResult, 
        optimizationResult, 
        riskReport, 
        config 
      })
    } else {
      return await this.mockGenerateComprehensiveReport(backtestResult, optimizationResult, riskReport, config)
    }
  }
  
  // 生成執行摘要報告
  static async generateExecutiveSummary(
    backtestResult: EnhancedBacktestResult,
    config: ReportConfig = this.getDefaultReportConfig()
  ): Promise<GeneratedReport> {
    if (tauriApiService()) {
      return await invoke('generate_executive_summary', { backtestResult, config })
    } else {
      return await this.mockGenerateExecutiveSummary(backtestResult, config)
    }
  }
  
  // 生成優化結果報告
  static async generateOptimizationReport(
    optimizationResult: AdvancedOptimizationResult,
    config: ReportConfig = this.getDefaultReportConfig()
  ): Promise<GeneratedReport> {
    if (tauriApiService()) {
      return await invoke('generate_optimization_report', { optimizationResult, config })
    } else {
      return await this.mockGenerateOptimizationReport(optimizationResult, config)
    }
  }
  
  // 生成風險分析報告
  static async generateRiskAnalysisReport(
    riskReport: RiskReport,
    config: ReportConfig = this.getDefaultReportConfig()
  ): Promise<GeneratedReport> {
    if (tauriApiService()) {
      return await invoke('generate_risk_analysis_report', { riskReport, config })
    } else {
      return await this.mockGenerateRiskAnalysisReport(riskReport, config)
    }
  }
  
  // 生成比較分析報告
  static async generateComparisonReport(
    results: EnhancedBacktestResult[],
    config: ReportConfig = this.getDefaultReportConfig()
  ): Promise<GeneratedReport> {
    if (tauriApiService()) {
      return await invoke('generate_comparison_report', { results, config })
    } else {
      return await this.mockGenerateComparisonReport(results, config)
    }
  }
  
  // 導出原始數據
  static async exportRawData(
    backtestResult: EnhancedBacktestResult,
    config: DataExportConfig
  ): Promise<ExportedData> {
    if (tauriApiService()) {
      return await invoke('export_raw_data', { backtestResult, config })
    } else {
      return await this.mockExportRawData(backtestResult, config)
    }
  }
  
  // 導出優化結果數據
  static async exportOptimizationData(
    optimizationResult: AdvancedOptimizationResult,
    config: DataExportConfig
  ): Promise<ExportedData> {
    if (tauriApiService()) {
      return await invoke('export_optimization_data', { optimizationResult, config })
    } else {
      return await this.mockExportOptimizationData(optimizationResult, config)
    }
  }
  
  // 導出風險分析數據
  static async exportRiskData(
    riskReport: RiskReport,
    config: DataExportConfig
  ): Promise<ExportedData> {
    if (tauriApiService()) {
      return await invoke('export_risk_data', { riskReport, config })
    } else {
      return await this.mockExportRiskData(riskReport, config)
    }
  }
  
  // 批量導出
  static async batchExport(
    exports: Array<{
      type: 'backtest' | 'optimization' | 'risk'
      data: any
      config: DataExportConfig
    }>
  ): Promise<ExportedData[]> {
    if (tauriApiService()) {
      return await invoke('batch_export', { exports })
    } else {
      return await this.mockBatchExport(exports)
    }
  }
  
  // 獲取報告模板
  static async getReportTemplates(): Promise<Array<{
    id: string
    name: string
    description: string
    preview_url?: string
    supported_formats: string[]
  }>> {
    if (tauriApiService()) {
      return await invoke('get_report_templates')
    } else {
      return this.mockGetReportTemplates()
    }
  }
  
  // 自定義報告模板
  static async createCustomTemplate(
    template: {
      name: string
      description: string
      sections: any[]
      styling: any
    }
  ): Promise<string> {
    if (tauriApiService()) {
      return await invoke('create_custom_template', { template })
    } else {
      return `custom_template_${Date.now()}`
    }
  }
  
  // 預覽報告
  static async previewReport(
    backtestResult: EnhancedBacktestResult,
    config: ReportConfig
  ): Promise<{
    preview_html: string
    estimated_page_count: number
    generation_time_estimate: number
  }> {
    if (tauriApiService()) {
      return await invoke('preview_report', { backtestResult, config })
    } else {
      return await this.mockPreviewReport(backtestResult, config)
    }
  }
  
  // ===== 模擬API實現 =====
  
  private static async mockGenerateComprehensiveReport(
    backtestResult: EnhancedBacktestResult,
    optimizationResult?: AdvancedOptimizationResult,
    riskReport?: RiskReport,
    config: ReportConfig = this.getDefaultReportConfig()
  ): Promise<GeneratedReport> {
    console.log('📄 生成專業綜合報告...', { backtestResult, optimizationResult, riskReport, config })
    
    // 模擬報告生成過程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const reportId = `COMPREHENSIVE_${Date.now()}`
    
    return {
      report_id: reportId,
      generated_at: new Date().toISOString(),
      report_title: `${backtestResult.strategy_name} - 綜合回測分析報告`,
      report_type: 'comprehensive',
      file_format: config.output_format,
      
      file_path: `/reports/${reportId}.${config.output_format}`,
      file_size: this.estimateFileSize(config),
      page_count: config.output_format === 'pdf' ? 25 : undefined,
      
      content_summary: {
        total_sections: 8,
        chart_count: 12,
        table_count: 6,
        key_metrics_count: 35
      },
      
      download_url: `https://reports.example.com/${reportId}.${config.output_format}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      
      metadata: {
        strategy_name: backtestResult.strategy_name,
        analysis_period: `${backtestResult.start_date} - ${backtestResult.end_date}`,
        total_return: backtestResult.total_return,
        max_drawdown: backtestResult.max_drawdown,
        sharpe_ratio: backtestResult.sharpe_ratio
      }
    }
  }
  
  private static async mockGenerateExecutiveSummary(
    backtestResult: EnhancedBacktestResult,
    config: ReportConfig
  ): Promise<GeneratedReport> {
    console.log('📊 生成執行摘要報告...', { backtestResult, config })
    
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const reportId = `EXECUTIVE_${Date.now()}`
    
    return {
      report_id: reportId,
      generated_at: new Date().toISOString(),
      report_title: `${backtestResult.strategy_name} - 執行摘要`,
      report_type: 'executive_summary',
      file_format: config.output_format,
      
      file_path: `/reports/${reportId}.${config.output_format}`,
      file_size: Math.floor(this.estimateFileSize(config) * 0.3),
      page_count: config.output_format === 'pdf' ? 5 : undefined,
      
      content_summary: {
        total_sections: 3,
        chart_count: 4,
        table_count: 2,
        key_metrics_count: 12
      },
      
      download_url: `https://reports.example.com/${reportId}.${config.output_format}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      
      metadata: {
        strategy_name: backtestResult.strategy_name,
        analysis_period: `${backtestResult.start_date} - ${backtestResult.end_date}`,
        total_return: backtestResult.total_return,
        max_drawdown: backtestResult.max_drawdown,
        sharpe_ratio: backtestResult.sharpe_ratio
      }
    }
  }
  
  private static async mockGenerateOptimizationReport(
    optimizationResult: AdvancedOptimizationResult,
    config: ReportConfig
  ): Promise<GeneratedReport> {
    console.log('🎯 生成優化結果報告...', { optimizationResult, config })
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const reportId = `OPTIMIZATION_${Date.now()}`
    
    return {
      report_id: reportId,
      generated_at: new Date().toISOString(),
      report_title: `參數優化分析報告 - ${optimizationResult.method_used}`,
      report_type: 'optimization_report',
      file_format: config.output_format,
      
      file_path: `/reports/${reportId}.${config.output_format}`,
      file_size: this.estimateFileSize(config),
      page_count: config.output_format === 'pdf' ? 18 : undefined,
      
      content_summary: {
        total_sections: 6,
        chart_count: 8,
        table_count: 4,
        key_metrics_count: 20
      },
      
      download_url: `https://reports.example.com/${reportId}.${config.output_format}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      
      metadata: {
        strategy_name: `優化策略 - ${optimizationResult.method_used}`,
        analysis_period: '參數優化期間',
        total_return: optimizationResult.best_score,
        max_drawdown: -0.08, // 估算值
        sharpe_ratio: optimizationResult.best_score
      }
    }
  }
  
  private static async mockGenerateRiskAnalysisReport(
    riskReport: RiskReport,
    config: ReportConfig
  ): Promise<GeneratedReport> {
    console.log('⚠️ 生成風險分析報告...', { riskReport, config })
    
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    const reportId = `RISK_${Date.now()}`
    
    return {
      report_id: reportId,
      generated_at: new Date().toISOString(),
      report_title: `風險分析報告 - ${riskReport.analysis_period.start_date} 至 ${riskReport.analysis_period.end_date}`,
      report_type: 'risk_analysis',
      file_format: config.output_format,
      
      file_path: `/reports/${reportId}.${config.output_format}`,
      file_size: this.estimateFileSize(config),
      page_count: config.output_format === 'pdf' ? 15 : undefined,
      
      content_summary: {
        total_sections: 7,
        chart_count: 10,
        table_count: 5,
        key_metrics_count: 28
      },
      
      download_url: `https://reports.example.com/${reportId}.${config.output_format}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      
      metadata: {
        strategy_name: '風險分析',
        analysis_period: `${riskReport.analysis_period.start_date} - ${riskReport.analysis_period.end_date}`,
        total_return: riskReport.risk_metrics.risk_adjusted_returns.sharpe_ratio || 0,
        max_drawdown: riskReport.risk_metrics.drawdown_analysis.maximum_drawdown,
        sharpe_ratio: riskReport.risk_metrics.risk_adjusted_returns.sharpe_ratio
      }
    }
  }
  
  private static async mockGenerateComparisonReport(
    results: EnhancedBacktestResult[],
    config: ReportConfig
  ): Promise<GeneratedReport> {
    console.log('📊 生成比較分析報告...', { results, config })
    
    await new Promise(resolve => setTimeout(resolve, 1800))
    
    const reportId = `COMPARISON_${Date.now()}`
    
    return {
      report_id: reportId,
      generated_at: new Date().toISOString(),
      report_title: `策略比較分析報告 (${results.length}個策略)`,
      report_type: 'comparison_report',
      file_format: config.output_format,
      
      file_path: `/reports/${reportId}.${config.output_format}`,
      file_size: this.estimateFileSize(config) * 1.5,
      page_count: config.output_format === 'pdf' ? 20 : undefined,
      
      content_summary: {
        total_sections: 5,
        chart_count: 6,
        table_count: 3,
        key_metrics_count: results.length * 10
      },
      
      download_url: `https://reports.example.com/${reportId}.${config.output_format}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      
      metadata: {
        strategy_name: `比較分析 (${results.length}策略)`,
        analysis_period: results.length > 0 ? `${results[0].start_date} - ${results[0].end_date}` : '',
        total_return: results.length > 0 ? Math.max(...results.map(r => r.total_return)) : 0,
        max_drawdown: results.length > 0 ? Math.min(...results.map(r => r.max_drawdown)) : 0,
        sharpe_ratio: results.length > 0 ? Math.max(...results.map(r => r.sharpe_ratio)) : 0
      }
    }
  }
  
  private static async mockExportRawData(
    backtestResult: EnhancedBacktestResult,
    config: DataExportConfig
  ): Promise<ExportedData> {
    console.log('💾 導出原始數據...', { backtestResult, config })
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const exportId = `DATA_EXPORT_${Date.now()}`
    
    return {
      export_id: exportId,
      exported_at: new Date().toISOString(),
      export_format: config.export_format,
      file_path: `/exports/${exportId}.${config.export_format}`,
      file_size: this.estimateDataSize(config),
      download_url: `https://exports.example.com/${exportId}.${config.export_format}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      data_summary: {
        total_records: backtestResult.trades?.length || 0,
        data_types_included: Object.keys(config.data_types).filter(key => config.data_types[key as keyof typeof config.data_types]),
        date_range: {
          start_date: backtestResult.start_date,
          end_date: backtestResult.end_date
        }
      },
      
      metadata: {
        exported_by: 'system',
        source_backtest_id: 'backtest_123',
        export_config: config
      }
    }
  }
  
  private static async mockExportOptimizationData(
    optimizationResult: AdvancedOptimizationResult,
    config: DataExportConfig
  ): Promise<ExportedData> {
    console.log('🎯 導出優化數據...', { optimizationResult, config })
    
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const exportId = `OPT_EXPORT_${Date.now()}`
    
    return {
      export_id: exportId,
      exported_at: new Date().toISOString(),
      export_format: config.export_format,
      file_path: `/exports/${exportId}.${config.export_format}`,
      file_size: this.estimateDataSize(config) * 0.5,
      download_url: `https://exports.example.com/${exportId}.${config.export_format}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      data_summary: {
        total_records: optimizationResult.all_results.length,
        data_types_included: ['optimization_results', 'parameter_importance', 'convergence_plot'],
        date_range: {
          start_date: optimizationResult.best_backtest_result?.start_date || '',
          end_date: optimizationResult.best_backtest_result?.end_date || ''
        }
      },
      
      metadata: {
        exported_by: 'system',
        source_backtest_id: 'optimization_123',
        export_config: config
      }
    }
  }
  
  private static async mockExportRiskData(
    riskReport: RiskReport,
    config: DataExportConfig
  ): Promise<ExportedData> {
    console.log('⚠️ 導出風險數據...', { riskReport, config })
    
    await new Promise(resolve => setTimeout(resolve, 600))
    
    const exportId = `RISK_EXPORT_${Date.now()}`
    
    return {
      export_id: exportId,
      exported_at: new Date().toISOString(),
      export_format: config.export_format,
      file_size: this.estimateDataSize(config) * 0.3,
      file_path: `/exports/${exportId}.${config.export_format}`,
      download_url: `https://exports.example.com/${exportId}.${config.export_format}`,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      data_summary: {
        total_records: riskReport.chart_data.equity_curve.length,
        data_types_included: ['risk_metrics', 'drawdown_analysis', 'stress_tests'],
        date_range: {
          start_date: riskReport.analysis_period.start_date,
          end_date: riskReport.analysis_period.end_date
        }
      },
      
      metadata: {
        exported_by: 'system',
        source_backtest_id: riskReport.report_id,
        export_config: config
      }
    }
  }
  
  private static async mockBatchExport(exports: Array<any>): Promise<ExportedData[]> {
    console.log('📦 批量導出數據...', exports)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return exports.map((_, index) => ({
      export_id: `BATCH_EXPORT_${Date.now()}_${index}`,
      exported_at: new Date().toISOString(),
      export_format: 'zip',
      file_path: `/exports/batch_${Date.now()}_${index}.zip`,
      file_size: 1024 * 1024 * 5, // 5MB
      download_url: `https://exports.example.com/batch_${Date.now()}_${index}.zip`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      
      data_summary: {
        total_records: 100,
        data_types_included: ['multiple'],
        date_range: {
          start_date: '2024-01-01',
          end_date: '2024-07-31'
        }
      },
      
      metadata: {
        exported_by: 'system',
        source_backtest_id: `batch_${index}`,
        export_config: {} as DataExportConfig
      }
    }))
  }
  
  private static mockGetReportTemplates() {
    return [
      {
        id: 'professional',
        name: '專業版模板',
        description: '適合專業投資者的詳細分析報告',
        preview_url: '/templates/professional_preview.png',
        supported_formats: ['pdf', 'html', 'excel']
      },
      {
        id: 'executive',
        name: '高管摘要模板',
        description: '簡潔明了的執行摘要格式',
        preview_url: '/templates/executive_preview.png',
        supported_formats: ['pdf', 'html']
      },
      {
        id: 'detailed',
        name: '詳細分析模板',
        description: '包含所有技術細節的完整報告',
        preview_url: '/templates/detailed_preview.png',
        supported_formats: ['pdf', 'html', 'excel']
      },
      {
        id: 'minimal',
        name: '簡約模板',
        description: '關鍵指標和圖表的簡潔展示',
        preview_url: '/templates/minimal_preview.png',
        supported_formats: ['pdf', 'html']
      }
    ]
  }
  
  private static async mockPreviewReport(
    backtestResult: EnhancedBacktestResult,
    config: ReportConfig
  ) {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      preview_html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h1>📊 ${backtestResult.strategy_name}</h1>
          <h2>🎯 執行摘要</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7;">
              <h3>總收益率</h3>
              <p style="font-size: 24px; font-weight: bold; color: #059669;">${(backtestResult.total_return * 100).toFixed(2)}%</p>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #d97706;">
              <h3>夏普比率</h3>
              <p style="font-size: 24px; font-weight: bold; color: #d97706;">${backtestResult.sharpe_ratio.toFixed(2)}</p>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <h3>最大回撤</h3>
              <p style="font-size: 24px; font-weight: bold; color: #dc2626;">${(backtestResult.max_drawdown * 100).toFixed(2)}%</p>
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px;">這是報告預覽，實際報告將包含更多詳細分析...</p>
        </div>
      `,
      estimated_page_count: 15,
      generation_time_estimate: 30
    }
  }
  
  // 輔助方法
  private static estimateFileSize(config: ReportConfig): number {
    let baseSize = 1024 * 1024 // 1MB base
    
    if (config.output_format === 'pdf') baseSize *= 2
    if (config.output_format === 'excel') baseSize *= 1.5
    if (config.chart_config.include_interactive_charts) baseSize *= 1.8
    if (config.chart_config.chart_resolution === 'high') baseSize *= 1.5
    
    return Math.floor(baseSize)
  }
  
  private static estimateDataSize(config: DataExportConfig): number {
    let baseSize = 1024 * 50 // 50KB base
    
    const enabledTypes = Object.values(config.data_types).filter(Boolean).length
    baseSize *= enabledTypes * 2
    
    if (config.export_format === 'excel') baseSize *= 1.3
    if (config.export_format === 'json') baseSize *= 0.8
    if (config.compression && config.compression !== 'none') baseSize *= 0.3
    
    return Math.floor(baseSize)
  }
  
  // 獲取默認配置
  static getDefaultReportConfig(): ReportConfig {
    return {
      report_type: 'comprehensive',
      output_format: 'pdf',
      template: 'professional',
      
      include_sections: {
        executive_summary: true,
        performance_analysis: true,
        risk_analysis: true,
        trade_analysis: true,
        optimization_results: false,
        charts_and_graphs: true,
        appendices: true,
        raw_data: false
      },
      
      branding: {
        company_name: '量化交易分析平台',
        primary_color: '#00f5d4',
        secondary_color: '#7a81a3'
      },
      
      chart_config: {
        chart_theme: 'neon',
        include_interactive_charts: false,
        chart_resolution: 'high',
        chart_formats: ['png', 'svg']
      },
      
      locale: 'zh-TW',
      currency: 'USD',
      date_format: 'YYYY-MM-DD',
      number_format: '0,0.00',
      
      include_disclaimers: true
    }
  }
  
  static getDefaultDataExportConfig(): DataExportConfig {
    return {
      export_format: 'excel',
      
      data_types: {
        equity_curve: true,
        trade_history: true,
        daily_returns: true,
        risk_metrics: true,
        optimization_results: false,
        performance_metrics: true,
        custom_indicators: false
      },
      
      excel_options: {
        sheet_names: {
          equity_curve: '權益曲線',
          trades: '交易記錄',
          returns: '收益率',
          metrics: '績效指標'
        },
        include_charts: true,
        formatting: true,
        multiple_sheets: true
      },
      
      compression: 'zip'
    }
  }
}

// ===== 報告模板管理器 =====

export class ReportTemplateManager {
  // 加載模板
  static async loadTemplate(templateId: string): Promise<any> {
    if (tauriApiService()) {
      return await invoke('load_report_template', { templateId })
    } else {
      return { id: templateId, content: 'mock_template' }
    }
  }
  
  // 保存自定義模板
  static async saveCustomTemplate(template: any): Promise<string> {
    if (tauriApiService()) {
      return await invoke('save_custom_template', { template })
    } else {
      return `custom_${Date.now()}`
    }
  }
  
  // 刪除模板
  static async deleteTemplate(templateId: string): Promise<boolean> {
    if (tauriApiService()) {
      return await invoke('delete_report_template', { templateId })
    } else {
      return true
    }
  }
}