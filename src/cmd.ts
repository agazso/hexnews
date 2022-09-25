import { buildSite } from './build'
import { SEED } from './const'
import { indexSnapshot, updateSnapshotSerial, updateSnapshotConcurrent } from './snapshot'
import { makeMemoryStorage, makeSwarmStorage } from './storage'
import { addPost, generateTestSnapshot, users } from './test'


async function gendata(...args: string[]) {
    const storage = makeSwarmStorage('http://localhost:1633', SEED)
    const snapshot = await generateTestSnapshot(storage)
}

async function post(...args: string[]) {
    const storage = makeSwarmStorage('http://localhost:1633', SEED)
    const title = args[0]
    const url = args[1]
    if (!title || !url) {
        console.error('usage: post <title> <url>')
        process.exit(1)
    }
    await addPost(storage, users[0], title, url)
}

async function build(...args: string[]) {
    const snapshot = await generateTestSnapshot()
    const indexedSnapshot = indexSnapshot(snapshot)
    console.debug({ snapshot: JSON.stringify(snapshot), indexedSnapshot })
    buildSite(indexedSnapshot)
}

function assertEquals(a: any, b: any) {
    const aJson = JSON.stringify(a, undefined, 2)
    const bJson = JSON.stringify(b, undefined, 2)
    if (aJson !== bJson) {
        console.error(`a !== b`, { a, b })
    }
}

async function test() {
    const serialSnapshot = await generateTestSnapshot(makeMemoryStorage(), updateSnapshotSerial)

    const parallelSnapshot = await generateTestSnapshot(makeMemoryStorage(), updateSnapshotConcurrent)

    assertEquals(serialSnapshot, parallelSnapshot)
}

async function main() {
    const [cmd, ...rest] = process.argv.slice(2)
    const commands: Record<string, (...args: string[]) => Promise<void>> = {
        'build': build,
        'gendata': gendata,
        'post': post,
        'test': test,
    }
    await commands[cmd](...rest)
}

main().catch(console.error)
