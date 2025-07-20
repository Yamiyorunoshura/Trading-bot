/**
 * v1.03 第四階段：高級參數優化引擎測試套件
 * 
 * 測試覆蓋：優化算法、參數處理、結果驗證、錯誤處理
 */

import { 
  AdvancedOptimizationEngine, 
  createDefaultAdvancedOptimizationConfig 
} from '../advanced-optimization'
import { createDefaultEnhancedBacktestConfig } from '../enhanced-backtest'

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn()
}))

jest.mock('../tauri', () => ({
  isTauriAvailable: () => false
}))

describe('AdvancedOptimizationEngine', () => {
  
  describe('智能優化策略選擇', () => {
    test('小參數空間應選擇網格搜索', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {
        fast_period: { name: 'fast_period', min_value: 5, max_value: 15, step: 1, dtype: 'int' },
        slow_period: { name: 'slow_period', min_value: 20, max_value: 30, step: 1, dtype: 'int' }
      }
      
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      const result = await AdvancedOptimizationEngine.smartOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('grid_search')
      expect(result.best_score).toBeGreaterThan(0)
      expect(result.total_evaluations).toBeGreaterThan(0)
      expect(result.execution_time).toBeGreaterThan(0)
    })

    test('中等參數空間應選擇遺傳算法', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {
        param1: { name: 'param1', min_value: 1, max_value: 100, step: 1, dtype: 'int' },
        param2: { name: 'param2', min_value: 1, max_value: 100, step: 1, dtype: 'int' },
        param3: { name: 'param3', min_value: 0.1, max_value: 1.0, step: 0.1, dtype: 'float' }
      }
      
      const backtestConfig = createDefaultEnhancedBacktestConfig('dynamic_position')
      
      const result = await AdvancedOptimizationEngine.smartOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('genetic_algorithm')
      expect(result.best_parameters).toBeDefined()
      expect(Object.keys(result.best_parameters)).toHaveLength(3)
    })

    test('大參數空間應選擇貝葉斯優化', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      // 創建大參數空間
      const ranges: any = {}
      for (let i = 1; i <= 10; i++) {
        ranges[`param${i}`] = { 
          name: `param${i}`, 
          min_value: 1, 
          max_value: 100, 
          step: 1, 
          dtype: 'int' 
        }
      }
      config.parameter_ranges = ranges
      
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      const result = await AdvancedOptimizationEngine.smartOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('bayesian_optimization')
    })
  })

  describe('優化算法測試', () => {
    test('網格搜索優化', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      const result = await AdvancedOptimizationEngine.gridSearchOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('grid_search')
      expect(result.best_score).toBe(2.45)
      expect(result.all_results).toHaveLength(50)
      expect(result.parameter_importance).toBeDefined()
      expect(result.stability_metrics).toBeDefined()
      expect(result.overfitting_indicators).toBeDefined()
    })

    test('遺傳算法優化', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('dynamic_position')
      
      const result = await AdvancedOptimizationEngine.geneticAlgorithmOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('genetic_algorithm')
      expect(result.best_score).toBe(2.67)
      expect(result.all_results).toHaveLength(200)
      expect(result.convergence_info.population_diversity).toBeDefined()
    })

    test('貝葉斯優化', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      const result = await AdvancedOptimizationEngine.bayesianOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('bayesian_optimization')
      expect(result.best_score).toBe(2.73)
      expect(result.total_evaluations).toBe(80)
      expect(result.convergence_info.acquisition_function_used).toBeDefined()
    })

    test('隨機搜索優化', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('dynamic_position')
      
      const result = await AdvancedOptimizationEngine.randomSearchOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.method_used).toBe('random_search')
      expect(result.best_score).toBe(2.31)
      expect(result.convergence_info.converged).toBe(false)
    })
  })

  describe('參數範圍驗證', () => {
    test('整數參數範圍生成', () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {
        int_param: { name: 'int_param', min_value: 1, max_value: 10, step: 1, dtype: 'int' }
      }
      
      // 測試參數組合數估算
      const engine = AdvancedOptimizationEngine as any
      const combinations = engine.estimateParameterCombinations(config.parameter_ranges)
      
      expect(combinations).toBe(9) // 1-10 with step 1 = 9 values
    })

    test('浮點數參數範圍生成', () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {
        float_param: { name: 'float_param', min_value: 0.1, max_value: 1.0, step: 0.1, dtype: 'float' }
      }
      
      const engine = AdvancedOptimizationEngine as any
      const combinations = engine.estimateParameterCombinations(config.parameter_ranges)
      
      expect(combinations).toBeGreaterThan(1)
    })

    test('布爾參數範圍生成', () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {
        bool_param: { name: 'bool_param', min_value: 0, max_value: 1, dtype: 'bool' }
      }
      
      const engine = AdvancedOptimizationEngine as any
      const combinations = engine.estimateParameterCombinations(config.parameter_ranges)
      
      expect(combinations).toBe(2) // true/false = 2 values
    })

    test('選擇參數範圍生成', () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {
        choice_param: { 
          name: 'choice_param', 
          min_value: 0, 
          max_value: 0, 
          dtype: 'choice',
          values: ['conservative', 'balanced', 'aggressive']
        }
      }
      
      const engine = AdvancedOptimizationEngine as any
      const combinations = engine.estimateParameterCombinations(config.parameter_ranges)
      
      expect(combinations).toBe(3) // 3 choices
    })
  })

  describe('結果質量驗證', () => {
    test('優化結果應包含所有必需字段', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      const result = await AdvancedOptimizationEngine.smartOptimization(config, backtestConfig)
      
      // 基礎字段
      expect(result.best_parameters).toBeDefined()
      expect(result.best_score).toBeDefined()
      expect(result.best_backtest_result).toBeDefined()
      expect(result.all_results).toBeDefined()
      expect(result.optimization_history).toBeDefined()
      expect(result.total_evaluations).toBeDefined()
      expect(result.execution_time).toBeDefined()
      expect(result.method_used).toBeDefined()
      
      // 高級功能字段
      expect(result.parameter_importance).toBeDefined()
      expect(result.parameter_correlations).toBeDefined()
      expect(result.sensitivity_analysis).toBeDefined()
      expect(result.risk_adjusted_ranking).toBeDefined()
      expect(result.stability_metrics).toBeDefined()
      expect(result.overfitting_indicators).toBeDefined()
      expect(result.optimization_surface).toBeDefined()
      expect(result.convergence_plot).toBeDefined()
    })

    test('過擬合風險評估', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      const result = await AdvancedOptimizationEngine.geneticAlgorithmOptimization(config, backtestConfig)
      
      expect(result.overfitting_indicators).toBeDefined()
      expect(result.overfitting_indicators.overfitting_risk).toMatch(/^(low|medium|high)$/)
      expect(result.overfitting_indicators.in_sample_performance).toBeGreaterThan(0)
      expect(result.overfitting_indicators.out_sample_performance).toBeGreaterThan(0)
      expect(result.overfitting_indicators.performance_degradation).toBeDefined()
    })

    test('穩定性指標評估', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('dynamic_position')
      
      const result = await AdvancedOptimizationEngine.bayesianOptimization(config, backtestConfig)
      
      expect(result.stability_metrics).toBeDefined()
      expect(result.stability_metrics.parameter_stability).toBeGreaterThanOrEqual(0)
      expect(result.stability_metrics.parameter_stability).toBeLessThanOrEqual(1)
      expect(result.stability_metrics.performance_consistency).toBeGreaterThanOrEqual(0)
      expect(result.stability_metrics.performance_consistency).toBeLessThanOrEqual(1)
      expect(result.stability_metrics.robustness_score).toBeGreaterThanOrEqual(0)
      expect(result.stability_metrics.robustness_score).toBeLessThanOrEqual(1)
    })
  })

  describe('進度跟蹤測試', () => {
    test('獲取優化進度', async () => {
      const progress = await AdvancedOptimizationEngine.getOptimizationProgress('test_optimization_123')
      
      expect(progress).toBeDefined()
      expect(progress.progress).toBeGreaterThanOrEqual(0)
      expect(progress.progress).toBeLessThanOrEqual(100)
      expect(progress.current_iteration).toBeGreaterThanOrEqual(0)
      expect(progress.total_iterations).toBeGreaterThan(0)
      expect(progress.best_score_so_far).toBeGreaterThan(0)
      expect(progress.estimated_time_remaining).toBeGreaterThanOrEqual(0)
      expect(progress.status).toBeDefined()
    })

    test('停止優化', async () => {
      const result = await AdvancedOptimizationEngine.stopOptimization('test_optimization_123')
      
      expect(result).toBe(true)
    })
  })

  describe('錯誤處理測試', () => {
    test('無效參數範圍處理', async () => {
      const config = createDefaultAdvancedOptimizationConfig()
      config.parameter_ranges = {} // 空參數範圍
      
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      // 應該能處理空參數範圍而不崩潰
      const result = await AdvancedOptimizationEngine.smartOptimization(config, backtestConfig)
      
      expect(result).toBeDefined()
      expect(result.total_evaluations).toBe(0)
    })

    test('無效配置處理', () => {
      expect(() => {
        createDefaultAdvancedOptimizationConfig()
      }).not.toThrow()
      
      const config = createDefaultAdvancedOptimizationConfig()
      expect(config.method).toBe('genetic_algorithm')
      expect(config.max_evaluations).toBe(100)
      expect(config.parallel_workers).toBe(4)
    })
  })

  describe('性能測試', () => {
    test('優化執行時間應在合理範圍內', async () => {
      const startTime = Date.now()
      
      const config = createDefaultAdvancedOptimizationConfig()
      const backtestConfig = createDefaultEnhancedBacktestConfig('sma_crossover')
      
      await AdvancedOptimizationEngine.randomSearchOptimization(config, backtestConfig)
      
      const executionTime = Date.now() - startTime
      
      // 模擬API應該在5秒內完成
      expect(executionTime).toBeLessThan(5000)
    }, 10000) // 10秒超時
  })
})

// 測試輔助函數
describe('createDefaultAdvancedOptimizationConfig', () => {
  test('應返回有效的默認配置', () => {
    const config = createDefaultAdvancedOptimizationConfig()
    
    expect(config.method).toBe('genetic_algorithm')
    expect(config.objective_function).toBe('sharpe_ratio')
    expect(config.maximize).toBe(true)
    expect(config.max_evaluations).toBe(100)
    expect(config.parallel_workers).toBe(4)
    expect(config.early_stopping).toBe(true)
    expect(config.smart_parameter_selection).toBe(true)
    expect(config.parameter_correlation_analysis).toBe(true)
    expect(config.cross_validation).toBe(true)
    expect(config.genetic_algorithm_params).toBeDefined()
    expect(config.risk_constraints).toBeDefined()
  })

  test('風險約束應有合理默認值', () => {
    const config = createDefaultAdvancedOptimizationConfig()
    
    expect(config.risk_constraints.max_drawdown_threshold).toBe(0.2)
    expect(config.risk_constraints.min_sharpe_ratio).toBe(1.0)
    expect(config.risk_constraints.max_volatility).toBe(0.3)
    expect(config.risk_constraints.min_win_rate).toBe(0.5)
  })

  test('遺傳算法參數應有合理默認值', () => {
    const config = createDefaultAdvancedOptimizationConfig()
    
    expect(config.genetic_algorithm_params).toBeDefined()
    expect(config.genetic_algorithm_params!.population_size).toBe(50)
    expect(config.genetic_algorithm_params!.mutation_rate).toBe(0.1)
    expect(config.genetic_algorithm_params!.crossover_rate).toBe(0.8)
    expect(config.genetic_algorithm_params!.elitism_rate).toBe(0.1)
    expect(config.genetic_algorithm_params!.max_generations).toBe(100)
  })
})