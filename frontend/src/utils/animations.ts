/**
 * 霓虹未來動畫工具庫
 * 第三階段：動畫優化與微交互體驗完善
 */

// 動畫類名常量
export const ANIMATION_CLASSES = {
  // 入場動畫
  FADE_IN_UP: 'fadeInUp',
  SLIDE_IN_LEFT: 'slide-in-left',
  SLIDE_IN_RIGHT: 'slide-in-right',
  POP_IN: 'pop-in',
  
  // 狀態動畫
  PULSE: 'pulse',
  HEARTBEAT: 'heartbeat',
  FLASH_GREEN: 'flash-green',
  FLASH_RED: 'flash-red',
  
  // 加載動畫
  SPIN: 'spin',
  SPIN_SLOW: 'spin-slow',
  SKELETON: 'skeleton',
  
  // 數據動畫
  COUNTING: 'counting',
  UPDATING: 'updating',
  VALUE_FLASH: 'flash',
  
  // 按鈕狀態
  LOADING: 'loading',
  SUCCESS: 'success'
} as const

// 動畫時間常量
export const ANIMATION_DURATIONS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 800
} as const

// 緩動函數常量
export const EASING_FUNCTIONS = {
  EASE_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.6, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  ELASTIC: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
} as const

/**
 * 動畫控制類
 */
export class AnimationController {
  private static instance: AnimationController
  private animationQueue: Map<Element, Animation[]> = new Map()
  private performanceMode: 'high' | 'balanced' | 'low' = 'balanced'

  static getInstance(): AnimationController {
    if (!AnimationController.instance) {
      AnimationController.instance = new AnimationController()
    }
    return AnimationController.instance
  }

  /**
   * 設置性能模式
   */
  setPerformanceMode(mode: 'high' | 'balanced' | 'low'): void {
    this.performanceMode = mode
    
    // 根據性能模式調整動畫
    const root = document.documentElement
    switch (mode) {
      case 'low':
        root.style.setProperty('--animation-fast', '0.1s')
        root.style.setProperty('--animation-normal', '0.15s')
        root.style.setProperty('--animation-slow', '0.2s')
        break
      case 'balanced':
        root.style.setProperty('--animation-fast', '0.2s')
        root.style.setProperty('--animation-normal', '0.3s')
        root.style.setProperty('--animation-slow', '0.5s')
        break
      case 'high':
        root.style.setProperty('--animation-fast', '0.2s')
        root.style.setProperty('--animation-normal', '0.3s')
        root.style.setProperty('--animation-slow', '0.5s')
        break
    }
  }

  /**
   * 檢測用戶是否偏好減少動畫
   */
  prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * 添加動畫類名
   */
  addClass(element: Element, className: string, duration?: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.prefersReducedMotion()) {
        resolve()
        return
      }

      element.classList.add(className)
      
      const animationDuration = duration || ANIMATION_DURATIONS.NORMAL
      setTimeout(() => {
        element.classList.remove(className)
        resolve()
      }, animationDuration)
    })
  }

  /**
   * 序列動畫
   */
  async sequence(animations: Array<{
    element: Element
    className: string
    delay?: number
    duration?: number
  }>): Promise<void> {
    for (const animation of animations) {
      if (animation.delay) {
        await this.delay(animation.delay)
      }
      await this.addClass(animation.element, animation.className, animation.duration)
    }
  }

  /**
   * 並行動畫
   */
  async parallel(animations: Array<{
    element: Element
    className: string
    duration?: number
  }>): Promise<void> {
    const promises = animations.map(animation => 
      this.addClass(animation.element, animation.className, animation.duration)
    )
    await Promise.all(promises)
  }

  /**
   * 延迟函数
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 淡入動畫組
   */
  async fadeInSequence(elements: Element[], baseDelay: number = 100): Promise<void> {
    const animations = elements.map((element, index) => ({
      element,
      className: ANIMATION_CLASSES.FADE_IN_UP,
      delay: index * baseDelay,
      duration: ANIMATION_DURATIONS.SLOW
    }))
    
    await this.sequence(animations)
  }

  /**
   * 數值更新動畫
   */
  animateValueUpdate(
    element: Element,
    from: number,
    to: number,
    duration: number = 1000,
    formatter?: (value: number) => string
  ): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now()
      const diff = to - from

      // 添加更新動畫類名
      element.classList.add(ANIMATION_CLASSES.UPDATING)

      const animate = () => {
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / duration, 1)
        
        // 使用緩動函數
        const easeProgress = this.easeOutCubic(progress)
        const currentValue = from + (diff * easeProgress)
        
        // 更新顯示值
        const displayValue = formatter ? formatter(currentValue) : currentValue.toFixed(2)
        if (element.textContent !== null) {
          element.textContent = displayValue
        }

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          element.classList.remove(ANIMATION_CLASSES.UPDATING)
          element.classList.add(ANIMATION_CLASSES.COUNTING)
          setTimeout(() => {
            element.classList.remove(ANIMATION_CLASSES.COUNTING)
            resolve()
          }, 500)
        }
      }

      requestAnimationFrame(animate)
    })
  }

  /**
   * 緩動函數：三次方緩出
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  /**
   * 觀察元素進入視窗
   */
  observeIntersection(
    elements: Element[],
    callback: (element: Element, isIntersecting: boolean) => void,
    options: IntersectionObserverInit = { threshold: 0.1 }
  ): IntersectionObserver {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry.target, entry.isIntersecting)
      })
    }, options)

    elements.forEach(element => observer.observe(element))
    return observer
  }

  /**
   * 自動入場動畫
   */
  autoRevealOnScroll(selector: string = '.neon-panel'): IntersectionObserver {
    const elements = Array.from(document.querySelectorAll(selector))
    
    return this.observeIntersection(elements, (element, isIntersecting) => {
      if (isIntersecting && !element.classList.contains('revealed')) {
        element.classList.add('revealed')
        this.addClass(element, ANIMATION_CLASSES.FADE_IN_UP, ANIMATION_DURATIONS.SLOW)
      }
    })
  }

  /**
   * 清理所有動畫
   */
  cleanup(): void {
    this.animationQueue.clear()
    
    // 移除所有動畫類名
    const allAnimatedElements = document.querySelectorAll('[class*="fadeInUp"], [class*="pulse"], [class*="flash"]')
    allAnimatedElements.forEach(element => {
      Object.values(ANIMATION_CLASSES).forEach(className => {
        element.classList.remove(className)
      })
    })
  }
}

/**
 * 工具函數
 */

/**
 * 獲取動畫控制器實例
 */
export const getAnimationController = (): AnimationController => {
  return AnimationController.getInstance()
}

/**
 * 簡化的動畫函數
 */
export const animate = {
  fadeInUp: (element: Element, delay?: number) => {
    const controller = getAnimationController()
    return controller.addClass(element, ANIMATION_CLASSES.FADE_IN_UP)
  },
  
  pulse: (element: Element, duration?: number) => {
    const controller = getAnimationController()
    return controller.addClass(element, ANIMATION_CLASSES.PULSE, duration)
  },
  
  flash: (element: Element, type: 'green' | 'red' = 'green') => {
    const controller = getAnimationController()
    const className = type === 'green' ? ANIMATION_CLASSES.FLASH_GREEN : ANIMATION_CLASSES.FLASH_RED
    return controller.addClass(element, className)
  },
  
  updateValue: (element: Element, from: number, to: number, formatter?: (value: number) => string) => {
    const controller = getAnimationController()
    return controller.animateValueUpdate(element, from, to, 1000, formatter)
  }
}

/**
 * 性能監控
 */
export class AnimationPerformanceMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 60

  startMonitoring(): void {
    const monitor = (currentTime: number) => {
      this.frameCount++
      
      if (currentTime >= this.lastTime + 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
        this.frameCount = 0
        this.lastTime = currentTime
        
        // 根據FPS自動調整性能模式
        const controller = getAnimationController()
        if (this.fps < 30) {
          controller.setPerformanceMode('low')
        } else if (this.fps < 50) {
          controller.setPerformanceMode('balanced')
        } else {
          controller.setPerformanceMode('high')
        }
      }
      
      requestAnimationFrame(monitor)
    }
    
    requestAnimationFrame(monitor)
  }

  getFPS(): number {
    return this.fps
  }
}

/**
 * 初始化動畫系統
 */
export const initializeAnimationSystem = (): void => {
  const controller = getAnimationController()
  const monitor = new AnimationPerformanceMonitor()
  
  // 檢測用戶偏好
  if (controller.prefersReducedMotion()) {
    controller.setPerformanceMode('low')
  }
  
  // 啟動性能監控
  monitor.startMonitoring()
  
  // 自動設置入場動畫觀察器
  controller.autoRevealOnScroll()
  
  console.log('🚀 動畫系統已初始化 - 霓虹未來第三階段')
} 