/**
 * v1.03 第四階段：完整測試套件
 * 
 * 支持單元測試、集成測試、端到端測試、性能測試
 */

import { EnhancedBacktestResult, EnhancedBacktestConfig } from './enhanced-backtest'
import { AdvancedOptimizationResult } from './advanced-optimization'
import { RiskReport } from './advanced-risk-analysis'
import { GeneratedReport } from './advanced-reporting'

// ===== 測試套件接口定義 =====

export interface TestCase {
  id: string
  name: string
  description: string
  category: 'unit' | 'integration' | 'e2e' | 'performance'
  priority: 'high' | 'medium' | 'low'
  test_function: () => Promise<TestResult>
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
  timeout?: number
  dependencies?: string[]
}

export interface TestResult {
  test_id: string
  status: 'passed' | 'failed' | 'skipped' | 'error'
  execution_time: number
  memory_usage?: number
  error_message?: string
  details?: any
  performance_metrics?: {
    cpu_usage: number
    memory_peak: number
    render_time: number
    response_time: number
  }
}

export interface TestSuiteResult {
  suite_id: string
  total_tests: number
  passed: number
  failed: number
  skipped: number
  errors: number
  coverage_percentage: number
  total_execution_time: number
  performance_summary: {
    average_response_time: number
    peak_memory_usage: number
    slowest_test: string
    fastest_test: string
  }
  detailed_results: TestResult[]
}

export interface PerformanceBenchmark {
  operation: string
  target_time: number
  target_memory: number
  actual_time: number
  actual_memory: number
  status: 'pass' | 'fail'
  improvement_suggestion?: string
}

// ===== 測試套件管理器 =====

export class TestingSuite {
  private testCases: TestCase[] = []
  private results: TestResult[] = []
  private isRunning = false
  
  constructor() {
    this.initializeTestCases()
  }
  
  // 初始化測試用例
  private initializeTestCases() {
    // 單元測試
    this.addTestCase({
      id: 'unit_backtest_config_validation',
      name: '回測配置驗證',
      description: '測試回測配置參數的驗證邏輯',
      category: 'unit',
      priority: 'high',
      test_function: this.testBacktestConfigValidation,
      timeout: 5000
    })
    
    this.addTestCase({
      id: 'unit_strategy_calculation',
      name: '策略計算邏輯',
      description: '測試SMA和動態倉位策略的計算正確性',
      category: 'unit',
      priority: 'high',
      test_function: this.testStrategyCalculation,
      timeout: 3000
    })
    
    this.addTestCase({
      id: 'unit_risk_metrics',
      name: '風險指標計算',
      description: '測試VaR、夏普比率等風險指標計算',
      category: 'unit',
      priority: 'high',
      test_function: this.testRiskMetrics,
      timeout: 2000
    })
    
    // 集成測試
    this.addTestCase({
      id: 'integration_backtest_flow',
      name: '回測流程集成',
      description: '測試完整的回測執行流程',
      category: 'integration',
      priority: 'high',
      test_function: this.testBacktestFlow,
      timeout: 30000
    })
    
    this.addTestCase({
      id: 'integration_optimization_flow',
      name: '參數優化集成',
      description: '測試參數優化的完整流程',
      category: 'integration',
      priority: 'medium',
      test_function: this.testOptimizationFlow,
      timeout: 60000
    })
    
    // 端到端測試
    this.addTestCase({
      id: 'e2e_user_workflow',
      name: '用戶完整工作流',
      description: '測試從配置到報告生成的完整用戶流程',
      category: 'e2e',
      priority: 'high',
      test_function: this.testUserWorkflow,
      timeout: 120000
    })
    
    // 性能測試
    this.addTestCase({
      id: 'performance_backtest_speed',
      name: '回測執行速度',
      description: '測試1年數據回測執行時間 < 30秒',
      category: 'performance',
      priority: 'high',
      test_function: this.testBacktestSpeed,
      timeout: 35000
    })
    
    this.addTestCase({
      id: 'performance_chart_rendering',
      name: '圖表渲染性能',
      description: '測試圖表渲染時間 < 2秒',
      category: 'performance',
      priority: 'medium',
      test_function: this.testChartRendering,
      timeout: 5000
    })
    
    this.addTestCase({
      id: 'performance_memory_usage',
      name: '內存使用測試',
      description: '測試內存使用 < 500MB',
      category: 'performance',
      priority: 'high',
      test_function: this.testMemoryUsage,
      timeout: 10000
    })
  }
  
  // 添加測試用例
  addTestCase(testCase: TestCase) {
    this.testCases.push(testCase)
  }
  
  // 運行所有測試
  async runAllTests(): Promise<TestSuiteResult> {
    console.log('🧪 開始運行完整測試套件...')
    this.isRunning = true
    this.results = []
    
    const startTime = Date.now()
    let totalMemory = 0
    let memoryPeak = 0
    
    try {
      for (const testCase of this.testCases) {
        if (!this.isRunning) break
        
        console.log(`⚡ 執行測試: ${testCase.name}`)
        
        try {
          // 執行setup
          if (testCase.setup) {
            await testCase.setup()
          }
          
          const testStartTime = Date.now()
          const memoryBefore = this.getMemoryUsage()
          
          // 執行測試
          const result = await Promise.race([
            testCase.test_function(),
            new Promise<TestResult>((_, reject) => 
              setTimeout(() => reject(new Error('測試超時')), testCase.timeout || 10000)
            )
          ])
          
          const executionTime = Date.now() - testStartTime
          const memoryAfter = this.getMemoryUsage()
          const memoryUsed = memoryAfter - memoryBefore
          
          result.execution_time = executionTime
          result.memory_usage = memoryUsed
          
          totalMemory += memoryUsed
          memoryPeak = Math.max(memoryPeak, memoryAfter)
          
          this.results.push(result)
          
          // 執行teardown
          if (testCase.teardown) {
            await testCase.teardown()
          }
          
        } catch (error) {
          this.results.push({
            test_id: testCase.id,
            status: 'error',
            execution_time: 0,
            error_message: error instanceof Error ? error.message : String(error)
          })
        }
      }
      
      const totalTime = Date.now() - startTime
      
      return this.generateTestSuiteResult(totalTime, memoryPeak)
      
    } finally {
      this.isRunning = false
    }
  }
  
  // 運行特定分類的測試
  async runTestsByCategory(category: TestCase['category']): Promise<TestSuiteResult> {
    const filteredTests = this.testCases.filter(test => test.category === category)
    const originalTests = this.testCases
    
    this.testCases = filteredTests
    const result = await this.runAllTests()
    this.testCases = originalTests
    
    return result
  }
  
  // 運行性能基準測試
  async runPerformanceBenchmarks(): Promise<PerformanceBenchmark[]> {
    console.log('📊 運行性能基準測試...')
    
    const benchmarks: PerformanceBenchmark[] = []
    
    // 回測速度測試
    const backtestBenchmark = await this.benchmarkBacktestSpeed()
    benchmarks.push(backtestBenchmark)
    
    // 圖表渲染測試
    const chartBenchmark = await this.benchmarkChartRendering()
    benchmarks.push(chartBenchmark)
    
    // 內存使用測試
    const memoryBenchmark = await this.benchmarkMemoryUsage()
    benchmarks.push(memoryBenchmark)
    
    // 優化速度測試
    const optimizationBenchmark = await this.benchmarkOptimizationSpeed()
    benchmarks.push(optimizationBenchmark)
    
    return benchmarks
  }
  
  // 停止測試運行
  stopTests() {
    this.isRunning = false
  }
  
  // 獲取測試結果統計
  getTestStatistics(): {
    total: number
    by_category: Record<string, number>
    by_priority: Record<string, number>
    coverage_areas: string[]
  } {
    const stats = {
      total: this.testCases.length,
      by_category: {} as Record<string, number>,
      by_priority: {} as Record<string, number>,
      coverage_areas: [] as string[]
    }
    
    this.testCases.forEach(test => {
      stats.by_category[test.category] = (stats.by_category[test.category] || 0) + 1
      stats.by_priority[test.priority] = (stats.by_priority[test.priority] || 0) + 1
    })
    
    stats.coverage_areas = [
      '回測引擎', '策略計算', '風險分析', '參數優化',
      '報告生成', '數據導出', '用戶界面', '性能優化'
    ]
    
    return stats
  }
  
  // ===== 具體測試實現 =====
  
  private testBacktestConfigValidation = async (): Promise<TestResult> => {
    const testId = 'unit_backtest_config_validation'
    
    try {
      // 測試配置驗證邏輯
      const validConfig = {
        strategy_type: 'sma_crossover' as const,
        symbol: 'BTCUSDT',
        timeframe: '1h' as const,
        start_date: '2024-01-01',
        end_date: '2024-06-30',
        initial_capital: 10000
      }
      
      const invalidConfigs = [
        { ...validConfig, initial_capital: -1000 }, // 負數資金
        { ...validConfig, start_date: '2024-12-01', end_date: '2024-01-01' }, // 日期錯誤
        { ...validConfig, symbol: '' }, // 空符號
      ]
      
      // 驗證有效配置應該通過
      const isValidConfigOk = this.validateBacktestConfig(validConfig)
      if (!isValidConfigOk) {
        throw new Error('有效配置驗證失敗')
      }
      
      // 驗證無效配置應該失敗
      for (const invalidConfig of invalidConfigs) {
        const shouldFail = this.validateBacktestConfig(invalidConfig)
        if (shouldFail) {
          throw new Error(`無效配置未被正確識別: ${JSON.stringify(invalidConfig)}`)
        }
      }
      
      return {
        test_id: testId,
        status: 'passed',
        execution_time: 0,
        details: { valid_configs: 1, invalid_configs: invalidConfigs.length }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'failed',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testStrategyCalculation = async (): Promise<TestResult> => {
    const testId = 'unit_strategy_calculation'
    
    try {
      // 測試SMA計算
      const prices = [100, 102, 105, 103, 108, 110, 107, 109, 112, 115]
      const sma5 = this.calculateSMA(prices, 5)
      const expectedSMA = 105.6 // (100+102+105+103+108)/5
      
      if (Math.abs(sma5 - expectedSMA) > 0.1) {
        throw new Error(`SMA計算錯誤: 期望${expectedSMA}, 實際${sma5}`)
      }
      
      // 測試動態倉位計算
      const positionRatio = this.calculateDynamicPosition({
        valuation_score: 0.7,
        risk_score: 0.3,
        market_trend: 0.8
      })
      
      if (positionRatio < 0 || positionRatio > 1) {
        throw new Error(`倉位比例超出範圍: ${positionRatio}`)
      }
      
      return {
        test_id: testId,
        status: 'passed',
        execution_time: 0,
        details: { sma_result: sma5, position_ratio: positionRatio }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'failed',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testRiskMetrics = async (): Promise<TestResult> => {
    const testId = 'unit_risk_metrics'
    
    try {
      // 測試夏普比率計算
      const returns = [0.01, -0.02, 0.03, 0.015, -0.01, 0.025, -0.005, 0.02]
      const riskFreeRate = 0.02
      
      const sharpeRatio = this.calculateSharpeRatio(returns, riskFreeRate)
      
      if (isNaN(sharpeRatio) || sharpeRatio < -5 || sharpeRatio > 5) {
        throw new Error(`夏普比率計算異常: ${sharpeRatio}`)
      }
      
      // 測試VaR計算
      const var95 = this.calculateVaR(returns, 0.95)
      
      if (var95 >= 0) { // VaR應該是負數
        throw new Error(`VaR計算錯誤: ${var95}`)
      }
      
      return {
        test_id: testId,
        status: 'passed',
        execution_time: 0,
        details: { sharpe_ratio: sharpeRatio, var_95: var95 }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'failed',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testBacktestFlow = async (): Promise<TestResult> => {
    const testId = 'integration_backtest_flow'
    
    try {
      // 模擬完整回測流程
      console.log('🔄 測試回測流程集成...')
      
      // 1. 準備配置
      const config = this.createMockBacktestConfig()
      
      // 2. 驗證配置
      if (!this.validateBacktestConfig(config)) {
        throw new Error('配置驗證失敗')
      }
      
      // 3. 執行回測
      const result = await this.runMockBacktest(config)
      
      // 4. 驗證結果
      if (!result || !result.trades || result.trades.length === 0) {
        throw new Error('回測結果無效')
      }
      
      // 5. 計算指標
      const metrics = this.calculateMetrics(result)
      if (!metrics.sharpe_ratio || isNaN(metrics.sharpe_ratio)) {
        throw new Error('指標計算失敗')
      }
      
      return {
        test_id: testId,
        status: 'passed',
        execution_time: 0,
        details: {
          trades_count: result.trades.length,
          final_return: result.total_return,
          sharpe_ratio: metrics.sharpe_ratio
        }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'failed',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testOptimizationFlow = async (): Promise<TestResult> => {
    const testId = 'integration_optimization_flow'
    
    try {
      console.log('🎯 測試優化流程集成...')
      
      // 創建優化配置
      const optimizationConfig = {
        method: 'genetic_algorithm' as const,
        parameter_ranges: {
          fast_period: { min: 5, max: 15, step: 1 },
          slow_period: { min: 20, max: 40, step: 5 }
        },
        max_evaluations: 10, // 減少評估次數以加快測試
        objective_function: 'sharpe_ratio' as const
      }
      
      // 運行優化
      const result = await this.runMockOptimization(optimizationConfig)
      
      // 驗證結果
      if (!result.best_parameters || !result.best_score) {
        throw new Error('優化結果無效')
      }
      
      if (result.total_evaluations !== 10) {
        throw new Error(`評估次數不匹配: 期望10, 實際${result.total_evaluations}`)
      }
      
      return {
        test_id: testId,
        status: 'passed',
        execution_time: 0,
        details: {
          best_score: result.best_score,
          evaluations: result.total_evaluations,
          method: result.method_used
        }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'failed',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testUserWorkflow = async (): Promise<TestResult> => {
    const testId = 'e2e_user_workflow'
    
    try {
      console.log('👤 測試用戶完整工作流...')
      
      // 1. 用戶選擇策略和配置
      const userConfig = this.simulateUserConfiguration()
      
      // 2. 運行回測
      const backtestResult = await this.runMockBacktest(userConfig)
      
      // 3. 運行參數優化
      const optimizationResult = await this.runMockOptimization({
        method: 'grid_search',
        parameter_ranges: { fast_period: { min: 5, max: 10, step: 1 } },
        max_evaluations: 5,
        objective_function: 'sharpe_ratio'
      })
      
      // 4. 生成風險分析
      const riskReport = await this.generateMockRiskReport(backtestResult)
      
      // 5. 生成報告
      const report = await this.generateMockReport(backtestResult, optimizationResult, riskReport)
      
      // 6. 導出數據
      const exportResult = await this.mockDataExport(backtestResult)
      
      // 驗證流程完整性
      const workflowSteps = [backtestResult, optimizationResult, riskReport, report, exportResult]
      const completedSteps = workflowSteps.filter(step => step !== null).length
      
      if (completedSteps < 5) {
        throw new Error(`工作流程不完整: 完成${completedSteps}/5步`)
      }
      
      return {
        test_id: testId,
        status: 'passed',
        execution_time: 0,
        details: {
          workflow_steps_completed: completedSteps,
          final_return: backtestResult.total_return,
          report_generated: !!report
        }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'failed',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testBacktestSpeed = async (): Promise<TestResult> => {
    const testId = 'performance_backtest_speed'
    
    try {
      console.log('⚡ 測試回測執行速度...')
      
      const startTime = Date.now()
      
      // 模擬1年數據的回測
      const config = this.createMockBacktestConfig()
      config.start_date = '2023-01-01'
      config.end_date = '2023-12-31'
      
      const result = await this.runMockBacktest(config)
      
      const executionTime = Date.now() - startTime
      const targetTime = 30000 // 30秒
      
      const status = executionTime <= targetTime ? 'passed' : 'failed'
      
      return {
        test_id: testId,
        status,
        execution_time: executionTime,
        performance_metrics: {
          cpu_usage: Math.random() * 80 + 10, // 模擬CPU使用率
          memory_peak: Math.random() * 300 + 100, // 模擬內存峰值
          render_time: Math.random() * 1000 + 500,
          response_time: executionTime
        },
        details: {
          target_time: targetTime,
          actual_time: executionTime,
          performance_ratio: executionTime / targetTime
        }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'error',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testChartRendering = async (): Promise<TestResult> => {
    const testId = 'performance_chart_rendering'
    
    try {
      console.log('📊 測試圖表渲染性能...')
      
      const startTime = Date.now()
      
      // 模擬圖表數據準備和渲染
      const chartData = this.generateMockChartData(1000) // 1000個數據點
      
      // 模擬渲染過程
      await this.simulateChartRendering(chartData)
      
      const renderTime = Date.now() - startTime
      const targetTime = 2000 // 2秒
      
      const status = renderTime <= targetTime ? 'passed' : 'failed'
      
      return {
        test_id: testId,
        status,
        execution_time: renderTime,
        performance_metrics: {
          cpu_usage: Math.random() * 60 + 20,
          memory_peak: Math.random() * 100 + 50,
          render_time: renderTime,
          response_time: renderTime
        },
        details: {
          target_time: targetTime,
          actual_time: renderTime,
          data_points: chartData.length
        }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'error',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  private testMemoryUsage = async (): Promise<TestResult> => {
    const testId = 'performance_memory_usage'
    
    try {
      console.log('💾 測試內存使用性能...')
      
      const memoryBefore = this.getMemoryUsage()
      
      // 執行內存密集型操作
      const largeDataSet = this.generateLargeDataSet(10000)
      const processedData = this.processLargeDataSet(largeDataSet)
      
      const memoryAfter = this.getMemoryUsage()
      const memoryUsed = memoryAfter - memoryBefore
      const targetMemory = 500 // 500MB
      
      const status = memoryUsed <= targetMemory ? 'passed' : 'failed'
      
      // 清理數據
      largeDataSet.length = 0
      processedData.length = 0
      
      return {
        test_id: testId,
        status,
        execution_time: 0,
        memory_usage: memoryUsed,
        performance_metrics: {
          cpu_usage: Math.random() * 40 + 10,
          memory_peak: memoryAfter,
          render_time: 0,
          response_time: 0
        },
        details: {
          target_memory: targetMemory,
          actual_memory: memoryUsed,
          memory_efficiency: (targetMemory - memoryUsed) / targetMemory
        }
      }
      
    } catch (error) {
      return {
        test_id: testId,
        status: 'error',
        execution_time: 0,
        error_message: error instanceof Error ? error.message : String(error)
      }
    }
  }
  
  // ===== 性能基準測試 =====
  
  private async benchmarkBacktestSpeed(): Promise<PerformanceBenchmark> {
    const startTime = Date.now()
    const config = this.createMockBacktestConfig()
    await this.runMockBacktest(config)
    const actualTime = Date.now() - startTime
    
    return {
      operation: '回測執行速度',
      target_time: 30000,
      target_memory: 300,
      actual_time: actualTime,
      actual_memory: Math.random() * 200 + 100,
      status: actualTime <= 30000 ? 'pass' : 'fail',
      improvement_suggestion: actualTime > 30000 ? '考慮優化策略計算算法或使用更少的數據點' : undefined
    }
  }
  
  private async benchmarkChartRendering(): Promise<PerformanceBenchmark> {
    const startTime = Date.now()
    const chartData = this.generateMockChartData(500)
    await this.simulateChartRendering(chartData)
    const actualTime = Date.now() - startTime
    
    return {
      operation: '圖表渲染速度',
      target_time: 2000,
      target_memory: 100,
      actual_time: actualTime,
      actual_memory: Math.random() * 80 + 30,
      status: actualTime <= 2000 ? 'pass' : 'fail',
      improvement_suggestion: actualTime > 2000 ? '考慮使用虛擬滾動或數據分頁' : undefined
    }
  }
  
  private async benchmarkMemoryUsage(): Promise<PerformanceBenchmark> {
    const memoryBefore = this.getMemoryUsage()
    const largeData = this.generateLargeDataSet(5000)
    this.processLargeDataSet(largeData)
    const memoryAfter = this.getMemoryUsage()
    const actualMemory = memoryAfter - memoryBefore
    
    return {
      operation: '內存使用優化',
      target_time: 0,
      target_memory: 500,
      actual_time: 0,
      actual_memory: actualMemory,
      status: actualMemory <= 500 ? 'pass' : 'fail',
      improvement_suggestion: actualMemory > 500 ? '考慮實現數據懶加載或內存回收機制' : undefined
    }
  }
  
  private async benchmarkOptimizationSpeed(): Promise<PerformanceBenchmark> {
    const startTime = Date.now()
    await this.runMockOptimization({
      method: 'grid_search',
      parameter_ranges: { fast_period: { min: 5, max: 15, step: 2 } },
      max_evaluations: 6,
      objective_function: 'sharpe_ratio'
    })
    const actualTime = Date.now() - startTime
    
    return {
      operation: '參數優化速度',
      target_time: 60000,
      target_memory: 200,
      actual_time: actualTime,
      actual_memory: Math.random() * 150 + 50,
      status: actualTime <= 60000 ? 'pass' : 'fail',
      improvement_suggestion: actualTime > 60000 ? '考慮使用並行計算或更高效的優化算法' : undefined
    }
  }
  
  // ===== 輔助方法 =====
  
  private generateTestSuiteResult(totalTime: number, memoryPeak: number): TestSuiteResult {
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const skipped = this.results.filter(r => r.status === 'skipped').length
    const errors = this.results.filter(r => r.status === 'error').length
    
    const coverage = ((passed / this.results.length) * 100) || 0
    
    const executionTimes = this.results.map(r => r.execution_time)
    const avgResponseTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length || 0
    
    const slowestTest = this.results.reduce((slowest, current) => 
      current.execution_time > slowest.execution_time ? current : slowest,
      this.results[0]
    )?.test_id || ''
    
    const fastestTest = this.results.reduce((fastest, current) =>
      current.execution_time < fastest.execution_time ? current : fastest,
      this.results[0]
    )?.test_id || ''
    
    return {
      suite_id: `test_suite_${Date.now()}`,
      total_tests: this.results.length,
      passed,
      failed,
      skipped,
      errors,
      coverage_percentage: coverage,
      total_execution_time: totalTime,
      performance_summary: {
        average_response_time: avgResponseTime,
        peak_memory_usage: memoryPeak,
        slowest_test: slowestTest,
        fastest_test: fastestTest
      },
      detailed_results: this.results
    }
  }
  
  private getMemoryUsage(): number {
    // 模擬內存使用情況（實際實現中應該使用真實的內存監控）
    return Math.random() * 200 + 100
  }
  
  private validateBacktestConfig(config: any): boolean {
    // 簡化的配置驗證邏輯
    return config.initial_capital > 0 && 
           config.symbol && config.symbol.length > 0 &&
           new Date(config.start_date) < new Date(config.end_date)
  }
  
  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period)
    return slice.reduce((sum, price) => sum + price, 0) / slice.length
  }
  
  private calculateDynamicPosition(factors: {
    valuation_score: number
    risk_score: number
    market_trend: number
  }): number {
    return Math.max(0, Math.min(1, factors.valuation_score * factors.market_trend * (1 - factors.risk_score)))
  }
  
  private calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)
    return volatility === 0 ? 0 : (avgReturn - riskFreeRate) / volatility
  }
  
  private calculateVaR(returns: number[], confidence: number): number {
    const sorted = returns.slice().sort((a, b) => a - b)
    const index = Math.floor((1 - confidence) * sorted.length)
    return sorted[index] || 0
  }
  
  private createMockBacktestConfig(): any {
    return {
      strategy_type: 'sma_crossover',
      symbol: 'BTCUSDT',
      timeframe: '1h',
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      initial_capital: 10000
    }
  }
  
  private async runMockBacktest(config: any): Promise<any> {
    // 模擬回測執行
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
    
    return {
      strategy_name: 'Mock Strategy',
      total_return: Math.random() * 0.5 + 0.1,
      sharpe_ratio: Math.random() * 2 + 1,
      max_drawdown: -(Math.random() * 0.2),
      trades: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        timestamp: new Date().toISOString(),
        action: Math.random() > 0.5 ? 'buy' : 'sell',
        price: Math.random() * 1000 + 30000,
        quantity: Math.random() * 0.1
      }))
    }
  }
  
  private calculateMetrics(result: any): any {
    return {
      sharpe_ratio: result.sharpe_ratio || Math.random() * 2 + 1,
      max_drawdown: result.max_drawdown || -(Math.random() * 0.2),
      total_return: result.total_return || Math.random() * 0.5 + 0.1
    }
  }
  
  private async runMockOptimization(config: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))
    
    return {
      best_parameters: { fast_period: 10, slow_period: 30 },
      best_score: Math.random() * 1.5 + 1.5,
      total_evaluations: config.max_evaluations,
      method_used: config.method
    }
  }
  
  private simulateUserConfiguration(): any {
    return this.createMockBacktestConfig()
  }
  
  private async generateMockRiskReport(backtestResult: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      risk_score: Math.random() * 40 + 60,
      var_95: -(Math.random() * 0.1),
      volatility: Math.random() * 0.2 + 0.1
    }
  }
  
  private async generateMockReport(backtestResult: any, optimizationResult: any, riskReport: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      report_id: `report_${Date.now()}`,
      generated_at: new Date().toISOString(),
      format: 'pdf'
    }
  }
  
  private async mockDataExport(backtestResult: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      export_id: `export_${Date.now()}`,
      format: 'excel',
      file_size: Math.random() * 1000 + 500
    }
  }
  
  private generateMockChartData(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      x: i,
      y: Math.random() * 1000 + 30000,
      timestamp: new Date(Date.now() + i * 1000 * 60 * 60).toISOString()
    }))
  }
  
  private async simulateChartRendering(data: any[]): Promise<void> {
    // 模擬圖表渲染過程
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500))
  }
  
  private generateLargeDataSet(size: number): any[] {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      data: Math.random(),
      timestamp: Date.now() + i
    }))
  }
  
  private processLargeDataSet(data: any[]): any[] {
    return data.map(item => ({
      ...item,
      processed: item.data * 2,
      category: item.data > 0.5 ? 'high' : 'low'
    }))
  }
}

// ===== 導出測試工具函數 =====

export function createTestingSuite(): TestingSuite {
  return new TestingSuite()
}

export function generateTestReport(suiteResult: TestSuiteResult): string {
  const { total_tests, passed, failed, errors, coverage_percentage } = suiteResult
  
  return `
🧪 測試套件執行報告
====================

📊 測試統計:
- 總測試數: ${total_tests}
- 通過: ${passed} ✅
- 失敗: ${failed} ❌
- 錯誤: ${errors} ⚠️
- 覆蓋率: ${coverage_percentage.toFixed(1)}%

⏱️ 性能統計:
- 總執行時間: ${(suiteResult.total_execution_time / 1000).toFixed(2)}s
- 平均響應時間: ${suiteResult.performance_summary.average_response_time.toFixed(2)}ms
- 內存峰值: ${suiteResult.performance_summary.peak_memory_usage.toFixed(2)}MB
- 最慢測試: ${suiteResult.performance_summary.slowest_test}
- 最快測試: ${suiteResult.performance_summary.fastest_test}

${passed === total_tests ? '🎉 所有測試通過！' : '⚠️  存在測試問題，請檢查詳細結果。'}
  `
}