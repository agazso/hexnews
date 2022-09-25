export function makeAsyncQueue(concurrency = 1) {
    const queue: any[] = []
    const listeners: any[] = []
    let running = 0
    async function runOneTask() {
        if (queue.length > 0 && running < concurrency) {
            running++
            const task = queue.shift()
            try {
                task && (await task())
            } finally {
                if (--running === 0) {
                    while (listeners.length > 0) {
                        listeners.shift()()
                    }
                }
                runOneTask()
            }
        }
    }
    async function drain() {
        if (!running) {
            return Promise.resolve()
        }
        return new Promise(resolve => {
            listeners.push(resolve)
        })
    }
    return {
        enqueue(fn: any) {
            queue.push(fn)
            runOneTask()
        },
        drain
    }
}
