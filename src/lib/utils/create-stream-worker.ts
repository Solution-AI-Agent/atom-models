export function createStreamWorker(): Worker {
  return new Worker(
    new URL('../../workers/stream.worker.ts', import.meta.url),
  )
}
