import { SEED } from './const'
import { addPost, generateTestSnapshot, makeSwarmStorage, users } from './test'


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

async function main() {
    const [cmd, ...rest] = process.argv.slice(2)
    const commands: Record<string, (...args: string[]) => Promise<void>> = {
        'gendata': gendata,
        'post': post,
    }
    await commands[cmd](...rest)
}

main().catch(console.error)
