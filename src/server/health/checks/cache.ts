import net from 'net'
import type { CheckResult } from '../types'

function tcpProbe(host: string, port: number, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`Connection to ${host}:${port} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve()
    })
    socket.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export async function checkCache(): Promise<CheckResult> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    return {
      status: 'skip',
      message: 'Cache not configured (REDIS_URL not set)',
    }
  }

  let parsed: URL
  try {
    parsed = new URL(redisUrl)
  } catch {
    return {
      status: 'error',
      message: 'REDIS_URL is not a valid URL',
      hint: 'Set REDIS_URL to a valid Redis connection string, e.g. redis://localhost:6379',
    }
  }

  const host = parsed.hostname
  const port = parseInt(parsed.port || '6379', 10)
  const start = performance.now()

  try {
    await tcpProbe(host, port)
    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'ok',
      message: `Cache reachable (${host}:${port})`,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown cache error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check REDIS_URL and ensure the Redis server is running and reachable',
    }
  }
}
