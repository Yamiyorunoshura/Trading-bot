"""
v1.03 策略參數優化器

支持網格搜索、遺傳算法、貝葉斯優化等多種優化方法
"""

import logging
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Tuple, Callable
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import itertools
import json
import random
from abc import ABC, abstractmethod

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from .enhanced_engine import EnhancedBacktestConfig, EnhancedBacktestResult, run_enhanced_backtest

logger = logging.getLogger(__name__)


class OptimizationMethod(Enum):
    """優化方法"""
    GRID_SEARCH = "grid_search"
    GENETIC_ALGORITHM = "genetic_algorithm"
    BAYESIAN_OPTIMIZATION = "bayesian_optimization"
    RANDOM_SEARCH = "random_search"


@dataclass
class ParameterRange:
    """參數範圍定義"""
    name: str
    min_value: float
    max_value: float
    step: Optional[float] = None
    values: Optional[List[Any]] = None  # 離散值列表
    dtype: str = 'float'  # 'float', 'int', 'bool', 'choice'
    
    def generate_values(self, num_samples: int = None) -> List[Any]:
        """生成參數值"""
        if self.values is not None:
            return self.values
        
        if self.dtype == 'bool':
            return [True, False]
        elif self.dtype == 'choice':
            return self.values if self.values else []
        elif self.dtype == 'int':
            if self.step:
                return list(range(int(self.min_value), int(self.max_value) + 1, int(self.step)))
            else:
                step = max(1, int((self.max_value - self.min_value) / (num_samples or 10)))
                return list(range(int(self.min_value), int(self.max_value) + 1, step))
        else:  # float
            if self.step:
                values = []
                current = self.min_value
                while current <= self.max_value:
                    values.append(current)
                    current += self.step
                return values
            else:
                num_samples = num_samples or 10
                return np.linspace(self.min_value, self.max_value, num_samples).tolist()


@dataclass
class OptimizationConfig:
    """優化配置"""
    method: OptimizationMethod
    parameter_ranges: Dict[str, ParameterRange]
    objective_function: str = 'sharpe_ratio'  # 'total_return', 'sharpe_ratio', 'calmar_ratio', 'profit_factor'
    maximize: bool = True
    max_evaluations: int = 100
    parallel_workers: int = 4
    timeout_seconds: int = 3600  # 1小時超時
    early_stopping: bool = True
    early_stopping_patience: int = 20
    
    # 方法特定參數
    genetic_algorithm_params: Dict[str, Any] = field(default_factory=lambda: {
        'population_size': 50,
        'mutation_rate': 0.1,
        'crossover_rate': 0.8,
        'elitism_rate': 0.1,
        'max_generations': 100
    })
    
    bayesian_params: Dict[str, Any] = field(default_factory=lambda: {
        'acquisition_function': 'expected_improvement',
        'n_initial_points': 10,
        'alpha': 1e-6
    })


@dataclass
class OptimizationResult:
    """優化結果"""
    best_parameters: Dict[str, Any]
    best_score: float
    best_backtest_result: EnhancedBacktestResult
    all_results: List[Tuple[Dict[str, Any], float, EnhancedBacktestResult]]
    optimization_history: List[float]
    convergence_info: Dict[str, Any]
    total_evaluations: int
    execution_time: float
    method_used: OptimizationMethod


class BaseOptimizer(ABC):
    """優化器基類"""
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.evaluation_count = 0
        self.best_score = float('-inf') if config.maximize else float('inf')
        self.best_parameters = {}
        self.best_result = None
        self.optimization_history = []
        self.all_results = []
        self.start_time = None
        
    @abstractmethod
    async def optimize(self, base_config: EnhancedBacktestConfig, data: pd.DataFrame) -> OptimizationResult:
        """執行優化"""
        pass
    
    async def evaluate_parameters(
        self, 
        parameters: Dict[str, Any], 
        base_config: EnhancedBacktestConfig, 
        data: pd.DataFrame
    ) -> Tuple[float, EnhancedBacktestResult]:
        """評估參數組合"""
        try:
            # 創建新的配置
            test_config = self._create_test_config(base_config, parameters)
            
            # 運行回測
            result = await run_enhanced_backtest(test_config, data)
            
            # 計算目標函數值
            score = self._calculate_objective_score(result)
            
            # 更新計數器和歷史
            self.evaluation_count += 1
            self.optimization_history.append(score)
            self.all_results.append((parameters.copy(), score, result))
            
            # 更新最佳結果
            is_better = (self.config.maximize and score > self.best_score) or \
                       (not self.config.maximize and score < self.best_score)
            
            if is_better:
                self.best_score = score
                self.best_parameters = parameters.copy()
                self.best_result = result
                logger.info(f"發現更好的參數組合 (評估 {self.evaluation_count}): {self.config.objective_function}={score:.4f}")
                logger.debug(f"最佳參數: {parameters}")
            
            return score, result
            
        except Exception as e:
            logger.error(f"參數評估失敗: {parameters}, 錯誤: {e}")
            # 返回最差分數
            worst_score = float('-inf') if self.config.maximize else float('inf')
            return worst_score, None
    
    def _create_test_config(self, base_config: EnhancedBacktestConfig, parameters: Dict[str, Any]) -> EnhancedBacktestConfig:
        """創建測試配置"""
        # 深度復制基礎配置
        test_config = EnhancedBacktestConfig(
            strategy_type=base_config.strategy_type,
            symbol=base_config.symbol,
            timeframe=base_config.timeframe,
            start_date=base_config.start_date,
            end_date=base_config.end_date,
            initial_capital=base_config.initial_capital,
            commission=base_config.commission,
            slippage=base_config.slippage,
            strategy_params=base_config.strategy_params.copy(),
            risk_params=base_config.risk_params.copy(),
            leverage_enabled=base_config.leverage_enabled,
            max_leverage=base_config.max_leverage,
            leverage_config=base_config.leverage_config.copy()
        )
        
        # 應用參數
        for param_name, param_value in parameters.items():
            self._apply_parameter(test_config, param_name, param_value)
        
        return test_config
    
    def _apply_parameter(self, config: EnhancedBacktestConfig, param_name: str, param_value: Any):
        """應用參數到配置"""
        # 處理嵌套參數路徑，如 "strategy_params.risk_mode" 或 "leverage_config.max_leverage"
        path_parts = param_name.split('.')
        
        if len(path_parts) == 1:
            # 頂級參數
            if hasattr(config, param_name):
                setattr(config, param_name, param_value)
        elif len(path_parts) == 2:
            # 嵌套參數
            parent_attr, child_attr = path_parts
            if hasattr(config, parent_attr):
                parent_dict = getattr(config, parent_attr)
                if isinstance(parent_dict, dict):
                    parent_dict[child_attr] = param_value
        elif len(path_parts) == 3:
            # 深層嵌套參數，如 "strategy_params.leverage_config.max_leverage"
            level1, level2, level3 = path_parts
            if hasattr(config, level1):
                level1_dict = getattr(config, level1)
                if isinstance(level1_dict, dict) and level2 in level1_dict:
                    if isinstance(level1_dict[level2], dict):
                        level1_dict[level2][level3] = param_value
    
    def _calculate_objective_score(self, result: EnhancedBacktestResult) -> float:
        """計算目標函數分數"""
        if result is None:
            return float('-inf') if self.config.maximize else float('inf')
        
        objective = self.config.objective_function
        
        if objective == 'total_return':
            return result.total_return
        elif objective == 'sharpe_ratio':
            return result.sharpe_ratio
        elif objective == 'calmar_ratio':
            return result.calmar_ratio
        elif objective == 'profit_factor':
            return result.profit_factor
        elif objective == 'sortino_ratio':
            return result.sortino_ratio
        elif objective == 'omega_ratio':
            return result.omega_ratio
        elif objective == 'win_rate':
            return result.win_rate
        elif objective == 'max_drawdown':
            # 對於最大回撤，我們希望最小化
            return -result.max_drawdown
        else:
            logger.warning(f"未知的目標函數: {objective}，使用夏普比率")
            return result.sharpe_ratio
    
    def _should_stop_early(self) -> bool:
        """檢查是否應該提前停止"""
        if not self.config.early_stopping:
            return False
        
        if len(self.optimization_history) < self.config.early_stopping_patience:
            return False
        
        # 檢查最近的改進
        recent_history = self.optimization_history[-self.config.early_stopping_patience:]
        
        if self.config.maximize:
            best_recent = max(recent_history)
            return best_recent <= self.best_score
        else:
            best_recent = min(recent_history)
            return best_recent >= self.best_score


class GridSearchOptimizer(BaseOptimizer):
    """網格搜索優化器"""
    
    async def optimize(self, base_config: EnhancedBacktestConfig, data: pd.DataFrame) -> OptimizationResult:
        """執行網格搜索優化"""
        self.start_time = datetime.now()
        logger.info("開始網格搜索優化...")
        
        # 生成參數網格
        parameter_grid = self._generate_parameter_grid()
        logger.info(f"生成了 {len(parameter_grid)} 個參數組合")
        
        # 限制評估數量
        if len(parameter_grid) > self.config.max_evaluations:
            logger.warning(f"參數組合數量 ({len(parameter_grid)}) 超過最大評估數 ({self.config.max_evaluations})，將隨機採樣")
            parameter_grid = random.sample(parameter_grid, self.config.max_evaluations)
        
        # 並行評估
        await self._evaluate_parameters_parallel(parameter_grid, base_config, data)
        
        execution_time = (datetime.now() - self.start_time).total_seconds()
        
        return OptimizationResult(
            best_parameters=self.best_parameters,
            best_score=self.best_score,
            best_backtest_result=self.best_result,
            all_results=self.all_results,
            optimization_history=self.optimization_history,
            convergence_info={'method': 'grid_search', 'total_combinations': len(parameter_grid)},
            total_evaluations=self.evaluation_count,
            execution_time=execution_time,
            method_used=OptimizationMethod.GRID_SEARCH
        )
    
    def _generate_parameter_grid(self) -> List[Dict[str, Any]]:
        """生成參數網格"""
        param_values = {}
        
        for param_name, param_range in self.config.parameter_ranges.items():
            param_values[param_name] = param_range.generate_values()
        
        # 生成所有組合
        parameter_names = list(param_values.keys())
        parameter_combinations = list(itertools.product(*[param_values[name] for name in parameter_names]))
        
        parameter_grid = []
        for combination in parameter_combinations:
            param_dict = dict(zip(parameter_names, combination))
            parameter_grid.append(param_dict)
        
        return parameter_grid
    
    async def _evaluate_parameters_parallel(
        self, 
        parameter_grid: List[Dict[str, Any]], 
        base_config: EnhancedBacktestConfig, 
        data: pd.DataFrame
    ):
        """並行評估參數"""
        semaphore = asyncio.Semaphore(self.config.parallel_workers)
        
        async def evaluate_with_semaphore(params):
            async with semaphore:
                return await self.evaluate_parameters(params, base_config, data)
        
        tasks = [evaluate_with_semaphore(params) for params in parameter_grid]
        
        # 批量執行任務
        batch_size = self.config.parallel_workers
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            try:
                await asyncio.wait_for(
                    asyncio.gather(*batch, return_exceptions=True),
                    timeout=self.config.timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.warning(f"批次 {i//batch_size + 1} 評估超時")
            
            # 檢查是否提前停止
            if self._should_stop_early():
                logger.info(f"提前停止優化 (評估了 {self.evaluation_count} 個組合)")
                break


class GeneticAlgorithmOptimizer(BaseOptimizer):
    """遺傳算法優化器"""
    
    def __init__(self, config: OptimizationConfig):
        super().__init__(config)
        self.ga_params = config.genetic_algorithm_params
        self.population = []
        self.fitness_scores = []
    
    async def optimize(self, base_config: EnhancedBacktestConfig, data: pd.DataFrame) -> OptimizationResult:
        """執行遺傳算法優化"""
        self.start_time = datetime.now()
        logger.info("開始遺傳算法優化...")
        
        population_size = self.ga_params['population_size']
        max_generations = self.ga_params['max_generations']
        
        # 初始化種群
        await self._initialize_population(population_size, base_config, data)
        
        generation = 0
        no_improvement_count = 0
        
        while generation < max_generations and self.evaluation_count < self.config.max_evaluations:
            logger.info(f"遺傳算法第 {generation + 1} 代")
            
            # 選擇
            parents = self._selection()
            
            # 交叉
            offspring = self._crossover(parents)
            
            # 變異
            offspring = self._mutation(offspring)
            
            # 評估後代
            await self._evaluate_population(offspring, base_config, data)
            
            # 替換策略（精英保留）
            self._replacement(offspring)
            
            generation += 1
            
            # 檢查提前停止
            if self._should_stop_early():
                no_improvement_count += 1
                if no_improvement_count >= self.config.early_stopping_patience:
                    logger.info(f"提前停止遺傳算法 (第 {generation} 代)")
                    break
            else:
                no_improvement_count = 0
        
        execution_time = (datetime.now() - self.start_time).total_seconds()
        
        return OptimizationResult(
            best_parameters=self.best_parameters,
            best_score=self.best_score,
            best_backtest_result=self.best_result,
            all_results=self.all_results,
            optimization_history=self.optimization_history,
            convergence_info={
                'method': 'genetic_algorithm',
                'final_generation': generation,
                'population_size': population_size
            },
            total_evaluations=self.evaluation_count,
            execution_time=execution_time,
            method_used=OptimizationMethod.GENETIC_ALGORITHM
        )
    
    async def _initialize_population(self, population_size: int, base_config: EnhancedBacktestConfig, data: pd.DataFrame):
        """初始化種群"""
        self.population = []
        for _ in range(population_size):
            individual = self._generate_random_individual()
            self.population.append(individual)
        
        # 評估初始種群
        await self._evaluate_population(self.population, base_config, data)
    
    def _generate_random_individual(self) -> Dict[str, Any]:
        """生成隨機個體"""
        individual = {}
        for param_name, param_range in self.config.parameter_ranges.items():
            if param_range.dtype == 'bool':
                individual[param_name] = random.choice([True, False])
            elif param_range.dtype == 'choice':
                individual[param_name] = random.choice(param_range.values)
            elif param_range.dtype == 'int':
                individual[param_name] = random.randint(int(param_range.min_value), int(param_range.max_value))
            else:  # float
                individual[param_name] = random.uniform(param_range.min_value, param_range.max_value)
        return individual
    
    async def _evaluate_population(self, population: List[Dict[str, Any]], base_config: EnhancedBacktestConfig, data: pd.DataFrame):
        """評估種群"""
        tasks = [self.evaluate_parameters(individual, base_config, data) for individual in population]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 處理結果
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"個體評估失敗: {result}")
                self.fitness_scores.append(float('-inf') if self.config.maximize else float('inf'))
            else:
                score, _ = result
                self.fitness_scores.append(score)
    
    def _selection(self) -> List[Dict[str, Any]]:
        """選擇操作（錦標賽選擇）"""
        parents = []
        tournament_size = max(2, len(self.population) // 10)
        
        for _ in range(len(self.population)):
            # 錦標賽選擇
            tournament_indices = random.sample(range(len(self.population)), tournament_size)
            tournament_fitness = [self.fitness_scores[i] for i in tournament_indices]
            
            if self.config.maximize:
                winner_idx = tournament_indices[np.argmax(tournament_fitness)]
            else:
                winner_idx = tournament_indices[np.argmin(tournament_fitness)]
            
            parents.append(self.population[winner_idx].copy())
        
        return parents
    
    def _crossover(self, parents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """交叉操作"""
        offspring = []
        crossover_rate = self.ga_params['crossover_rate']
        
        for i in range(0, len(parents) - 1, 2):
            parent1, parent2 = parents[i], parents[i + 1]
            
            if random.random() < crossover_rate:
                child1, child2 = self._uniform_crossover(parent1, parent2)
                offspring.extend([child1, child2])
            else:
                offspring.extend([parent1.copy(), parent2.copy()])
        
        # 處理奇數情況
        if len(parents) % 2 == 1:
            offspring.append(parents[-1].copy())
        
        return offspring
    
    def _uniform_crossover(self, parent1: Dict[str, Any], parent2: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """均勻交叉"""
        child1, child2 = parent1.copy(), parent2.copy()
        
        for param_name in parent1.keys():
            if random.random() < 0.5:
                child1[param_name], child2[param_name] = child2[param_name], child1[param_name]
        
        return child1, child2
    
    def _mutation(self, population: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """變異操作"""
        mutation_rate = self.ga_params['mutation_rate']
        mutated_population = []
        
        for individual in population:
            mutated_individual = individual.copy()
            
            for param_name, param_value in individual.items():
                if random.random() < mutation_rate:
                    mutated_individual[param_name] = self._mutate_parameter(param_name, param_value)
            
            mutated_population.append(mutated_individual)
        
        return mutated_population
    
    def _mutate_parameter(self, param_name: str, current_value: Any) -> Any:
        """變異單個參數"""
        param_range = self.config.parameter_ranges[param_name]
        
        if param_range.dtype == 'bool':
            return not current_value
        elif param_range.dtype == 'choice':
            return random.choice(param_range.values)
        elif param_range.dtype == 'int':
            # 高斯變異
            sigma = (param_range.max_value - param_range.min_value) * 0.1
            new_value = int(current_value + random.gauss(0, sigma))
            return max(param_range.min_value, min(param_range.max_value, new_value))
        else:  # float
            # 高斯變異
            sigma = (param_range.max_value - param_range.min_value) * 0.1
            new_value = current_value + random.gauss(0, sigma)
            return max(param_range.min_value, min(param_range.max_value, new_value))
    
    def _replacement(self, offspring: List[Dict[str, Any]]):
        """替換策略（精英保留）"""
        elitism_rate = self.ga_params['elitism_rate']
        elite_size = int(len(self.population) * elitism_rate)
        
        # 選擇精英
        sorted_indices = sorted(range(len(self.fitness_scores)), 
                              key=lambda x: self.fitness_scores[x], 
                              reverse=self.config.maximize)
        elite_indices = sorted_indices[:elite_size]
        
        # 保留精英
        new_population = [self.population[i].copy() for i in elite_indices]
        new_fitness = [self.fitness_scores[i] for i in elite_indices]
        
        # 添加後代
        remaining_size = len(self.population) - elite_size
        new_population.extend(offspring[:remaining_size])
        
        self.population = new_population
        self.fitness_scores = new_fitness[:elite_size]  # 後代的適應度將在下次評估時計算


class RandomSearchOptimizer(BaseOptimizer):
    """隨機搜索優化器"""
    
    async def optimize(self, base_config: EnhancedBacktestConfig, data: pd.DataFrame) -> OptimizationResult:
        """執行隨機搜索優化"""
        self.start_time = datetime.now()
        logger.info("開始隨機搜索優化...")
        
        # 生成隨機參數組合
        random_combinations = []
        for _ in range(self.config.max_evaluations):
            params = self._generate_random_parameters()
            random_combinations.append(params)
        
        # 並行評估
        await self._evaluate_parameters_parallel(random_combinations, base_config, data)
        
        execution_time = (datetime.now() - self.start_time).total_seconds()
        
        return OptimizationResult(
            best_parameters=self.best_parameters,
            best_score=self.best_score,
            best_backtest_result=self.best_result,
            all_results=self.all_results,
            optimization_history=self.optimization_history,
            convergence_info={'method': 'random_search', 'total_evaluations': self.config.max_evaluations},
            total_evaluations=self.evaluation_count,
            execution_time=execution_time,
            method_used=OptimizationMethod.RANDOM_SEARCH
        )
    
    def _generate_random_parameters(self) -> Dict[str, Any]:
        """生成隨機參數"""
        params = {}
        for param_name, param_range in self.config.parameter_ranges.items():
            if param_range.dtype == 'bool':
                params[param_name] = random.choice([True, False])
            elif param_range.dtype == 'choice':
                params[param_name] = random.choice(param_range.values)
            elif param_range.dtype == 'int':
                params[param_name] = random.randint(int(param_range.min_value), int(param_range.max_value))
            else:  # float
                params[param_name] = random.uniform(param_range.min_value, param_range.max_value)
        return params
    
    async def _evaluate_parameters_parallel(
        self, 
        parameter_list: List[Dict[str, Any]], 
        base_config: EnhancedBacktestConfig, 
        data: pd.DataFrame
    ):
        """並行評估參數"""
        semaphore = asyncio.Semaphore(self.config.parallel_workers)
        
        async def evaluate_with_semaphore(params):
            async with semaphore:
                return await self.evaluate_parameters(params, base_config, data)
        
        # 批量執行
        batch_size = self.config.parallel_workers
        for i in range(0, len(parameter_list), batch_size):
            batch_params = parameter_list[i:i + batch_size]
            tasks = [evaluate_with_semaphore(params) for params in batch_params]
            
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=self.config.timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.warning(f"隨機搜索批次 {i//batch_size + 1} 評估超時")
            
            # 檢查提前停止
            if self._should_stop_early():
                logger.info(f"隨機搜索提前停止 (評估了 {self.evaluation_count} 個組合)")
                break


class ParameterOptimizer:
    """參數優化器主類"""
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.optimizer = self._create_optimizer()
    
    def _create_optimizer(self) -> BaseOptimizer:
        """創建具體的優化器"""
        if self.config.method == OptimizationMethod.GRID_SEARCH:
            return GridSearchOptimizer(self.config)
        elif self.config.method == OptimizationMethod.GENETIC_ALGORITHM:
            return GeneticAlgorithmOptimizer(self.config)
        elif self.config.method == OptimizationMethod.RANDOM_SEARCH:
            return RandomSearchOptimizer(self.config)
        elif self.config.method == OptimizationMethod.BAYESIAN_OPTIMIZATION:
            logger.warning("貝葉斯優化尚未實現，使用隨機搜索替代")
            return RandomSearchOptimizer(self.config)
        else:
            raise ValueError(f"不支持的優化方法: {self.config.method}")
    
    async def optimize(self, base_config: EnhancedBacktestConfig, data: pd.DataFrame) -> OptimizationResult:
        """執行參數優化"""
        logger.info(f"開始使用 {self.config.method.value} 進行參數優化")
        logger.info(f"目標函數: {self.config.objective_function} ({'最大化' if self.config.maximize else '最小化'})")
        logger.info(f"最大評估次數: {self.config.max_evaluations}")
        logger.info(f"並行工作進程數: {self.config.parallel_workers}")
        
        result = await self.optimizer.optimize(base_config, data)
        
        logger.info(f"參數優化完成!")
        logger.info(f"總評估次數: {result.total_evaluations}")
        logger.info(f"執行時間: {result.execution_time:.2f} 秒")
        logger.info(f"最佳 {self.config.objective_function}: {result.best_score:.4f}")
        logger.info(f"最佳參數: {result.best_parameters}")
        
        return result


def create_optimization_config_for_dynamic_position() -> OptimizationConfig:
    """為動態倉位策略創建默認優化配置"""
    parameter_ranges = {
        'max_leverage': ParameterRange(
            name='max_leverage',
            min_value=1.0,
            max_value=5.0,
            step=0.5,
            dtype='float'
        ),
        'strategy_params.risk_mode': ParameterRange(
            name='strategy_params.risk_mode',
            values=['conservative', 'balanced', 'aggressive'],
            dtype='choice'
        ),
        'strategy_params.leverage_config.leverage_usage_rate': ParameterRange(
            name='strategy_params.leverage_config.leverage_usage_rate',
            min_value=0.5,
            max_value=0.95,
            step=0.05,
            dtype='float'
        ),
        'risk_params.stop_loss': ParameterRange(
            name='risk_params.stop_loss',
            min_value=0.02,
            max_value=0.10,
            step=0.01,
            dtype='float'
        ),
        'risk_params.take_profit': ParameterRange(
            name='risk_params.take_profit',
            min_value=0.05,
            max_value=0.20,
            step=0.01,
            dtype='float'
        )
    }
    
    return OptimizationConfig(
        method=OptimizationMethod.GRID_SEARCH,
        parameter_ranges=parameter_ranges,
        objective_function='sharpe_ratio',
        maximize=True,
        max_evaluations=500,
        parallel_workers=4,
        early_stopping=True,
        early_stopping_patience=20
    )


def create_optimization_config_for_sma_crossover() -> OptimizationConfig:
    """為SMA交叉策略創建默認優化配置"""
    parameter_ranges = {
        'strategy_params.fast_period': ParameterRange(
            name='strategy_params.fast_period',
            min_value=5,
            max_value=25,
            step=1,
            dtype='int'
        ),
        'strategy_params.slow_period': ParameterRange(
            name='strategy_params.slow_period',
            min_value=20,
            max_value=100,
            step=5,
            dtype='int'
        ),
        'strategy_params.signal_threshold': ParameterRange(
            name='strategy_params.signal_threshold',
            min_value=0.0001,
            max_value=0.01,
            step=0.0005,
            dtype='float'
        ),
        'risk_params.stop_loss': ParameterRange(
            name='risk_params.stop_loss',
            min_value=0.01,
            max_value=0.10,
            step=0.01,
            dtype='float'
        ),
        'risk_params.take_profit': ParameterRange(
            name='risk_params.take_profit',
            min_value=0.02,
            max_value=0.20,
            step=0.01,
            dtype='float'
        )
    }
    
    return OptimizationConfig(
        method=OptimizationMethod.GRID_SEARCH,
        parameter_ranges=parameter_ranges,
        objective_function='sharpe_ratio',
        maximize=True,
        max_evaluations=1000,
        parallel_workers=4,
        early_stopping=True,
        early_stopping_patience=30
    )


if __name__ == "__main__":
    # 測試參數優化
    import asyncio
    from datetime import datetime, timedelta
    
    async def test_parameter_optimization():
        """測試參數優化"""
        
        # 生成模擬數據
        dates = pd.date_range(start=datetime.now() - timedelta(days=180), periods=180*24, freq='1H')
        np.random.seed(42)
        
        prices = 50000 * np.exp(np.cumsum(np.random.normal(0, 0.02, len(dates))))
        data = pd.DataFrame({
            'open': prices,
            'high': prices * (1 + np.random.uniform(0.001, 0.02, len(dates))),
            'low': prices * (1 - np.random.uniform(0.001, 0.02, len(dates))),
            'close': prices,
            'volume': np.random.uniform(1000, 10000, len(dates))
        }, index=dates)
        
        data['high'] = np.maximum(data['high'], data['close'])
        data['low'] = np.minimum(data['low'], data['close'])
        
        # 創建基礎回測配置
        base_config = EnhancedBacktestConfig(
            strategy_type='dynamic_position',
            symbol='BTCUSDT',
            timeframe='1h',
            initial_capital=10000.0,
            leverage_enabled=True,
            max_leverage=3.0,
        )
        
        # 創建優化配置
        opt_config = create_optimization_config_for_dynamic_position()
        opt_config.max_evaluations = 20  # 減少評估次數以便測試
        opt_config.parallel_workers = 2
        
        # 執行優化
        optimizer = ParameterOptimizer(opt_config)
        result = await optimizer.optimize(base_config, data)
        
        print(f"\n=== 參數優化結果 ===")
        print(f"優化方法: {result.method_used.value}")
        print(f"總評估次數: {result.total_evaluations}")
        print(f"執行時間: {result.execution_time:.2f} 秒")
        print(f"最佳 {opt_config.objective_function}: {result.best_score:.4f}")
        print(f"最佳參數: {result.best_parameters}")
        
        if result.best_backtest_result:
            print(f"\n=== 最佳回測結果 ===")
            br = result.best_backtest_result
            print(f"總收益率: {br.total_return:.2%}")
            print(f"夏普比率: {br.sharpe_ratio:.3f}")
            print(f"最大回撤: {br.max_drawdown:.2%}")
            print(f"勝率: {br.win_rate:.2%}")
        
        print(f"\n參數優化測試完成!")
        
        return result
    
    # 設置日誌
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # 運行測試
    asyncio.run(test_parameter_optimization())