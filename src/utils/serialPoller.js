/**
 * 串行异步轮询器。
 *
 * 下一次轮询只会在本次 Promise 完成后安排，因此不会出现 setInterval 导致的请求重叠。
 * 页面隐藏时暂停；恢复可见后立即执行。任务返回 false 或 { stop: true } 时自动停止。
 * interval 可传数字或函数；任务也可以返回 { nextInterval } 动态调整下一次间隔。
 */
export function createSerialPoller(task, options = {}) {
  if (typeof task !== 'function') {
    throw new TypeError('createSerialPoller task must be a function')
  }

  const intervalOption = options.interval ?? 2500
  const initialInterval = resolveInterval(intervalOption, { runCount: 0, elapsedMs: 0, failureCount: 0 }, 2500)
  const maxBackoff = Math.max(initialInterval, Number(options.maxBackoff || initialInterval * 6))
  const pauseWhenHidden = options.pauseWhenHidden !== false
  const onError = typeof options.onError === 'function' ? options.onError : null

  let timer = null
  let active = false
  let executing = false
  let failureCount = 0
  let generation = 0
  let runCount = 0
  let startedAt = 0
  let nextIntervalOverride = null

  const clearTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  const shouldPause = () => pauseWhenHidden && typeof document !== 'undefined' && document.hidden

  const baseInterval = () => {
    if (Number.isFinite(Number(nextIntervalOverride)) && Number(nextIntervalOverride) >= 100) {
      const value = Number(nextIntervalOverride)
      nextIntervalOverride = null
      return value
    }
    return resolveInterval(intervalOption, {
      runCount,
      elapsedMs: startedAt ? Date.now() - startedAt : 0,
      failureCount
    }, initialInterval)
  }

  const nextDelay = () => {
    const interval = baseInterval()
    if (failureCount <= 0) return interval
    return Math.min(maxBackoff, interval * (2 ** Math.min(failureCount, 4)))
  }

  const schedule = (delay = nextDelay(), currentGeneration = generation) => {
    clearTimer()
    if (!active || currentGeneration !== generation || shouldPause()) return
    timer = window.setTimeout(() => run(currentGeneration), Math.max(0, delay))
  }

  const run = async (currentGeneration = generation) => {
    if (!active || currentGeneration !== generation || executing || shouldPause()) return
    clearTimer()
    executing = true
    try {
      const result = await task()
      runCount += 1
      failureCount = 0
      if (result === false || result?.stop === true) {
        stop()
        return
      }
      if (result && Number.isFinite(Number(result.nextInterval))) {
        nextIntervalOverride = Math.max(100, Number(result.nextInterval))
      }
    } catch (error) {
      failureCount += 1
      onError?.(error, failureCount)
    } finally {
      executing = false
      if (active && currentGeneration === generation) schedule(nextDelay(), currentGeneration)
    }
  }

  const handleVisibilityChange = () => {
    if (!active || shouldPause()) {
      clearTimer()
      return
    }
    schedule(0)
  }

  const start = ({ immediate = options.immediate !== false } = {}) => {
    if (active) return controller
    active = true
    generation += 1
    failureCount = 0
    runCount = 0
    startedAt = Date.now()
    nextIntervalOverride = null
    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    schedule(immediate ? 0 : initialInterval)
    return controller
  }

  const stop = () => {
    if (!active && timer === null) return
    active = false
    generation += 1
    failureCount = 0
    clearTimer()
    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  const trigger = () => {
    if (!active) return controller
    schedule(0)
    return controller
  }

  const controller = {
    start,
    stop,
    trigger,
    get active() { return active },
    get executing() { return executing }
  }

  return controller
}

function resolveInterval(value, context, fallback) {
  const resolved = typeof value === 'function' ? value(context) : value
  const numeric = Number(resolved)
  return Number.isFinite(numeric) ? Math.max(100, numeric) : Math.max(100, Number(fallback || 2500))
}
