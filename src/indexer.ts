import { Bee } from "@ethersphere/bee-js"
import { makeRootUserSnapshot } from "./test"
import { writeFileSync, copyFileSync, readFileSync } from 'fs'
import { spawn } from 'child_process'
import { SEED } from "./const"
import { buildSite } from "./build"
import { indexSnapshot, Snapshot, updateSnapshot } from "./snapshot"
import { makeSwarmStorage } from "./storage"

declare var TextDecoder: any

const INDEXER_FEED_PRIVATE_KEY = process.env.INDEXER_FEED_PRIVATE_KEY || '0x2db11bcf42c8b5047a750ec3dabf1fb196f34b9bf37b30c0ed98868a8b686073'
const INDEXER_POSTAGE_STAMP = process.env.INDEXER_POSTAGE_STAMP || '0f49cad16a8224ba4cd1b3362c6cc1cdccca8cdfa56688344e3c44eb384d976c'
const BEE_URL = 'http://localhost:1633'

function privateKeyToAddress(privateKey: string): string {
    const bee = new Bee(BEE_URL)
    const feedWriter = bee.makeFeedWriter('sequence', new Uint8Array(32), privateKey)
    return '0x' + feedWriter.owner
}

async function spawnCommand(command: string, args: string[]) {
    const child = spawn(command, args)
    let data = '+ '
    for await (const chunk of child.stdout) {
        data += (chunk + '').split('\n').join('\n+ ')
    }
    let error = ''
    for await (const chunk of child.stderr) {
        error += chunk
    }
    const exitCode = await new Promise( (resolve, reject) => {
        child.on('close', resolve)
    })

    if (exitCode) {
        console.error(error)
        throw new Error( `subprocess error exit ${exitCode}, ${error}`)
    }

    return data
}

async function spawnSwarmCLIUploader(buildDir: string) {
    const uploadArgs = [
        'upload',
        buildDir,
    ]

    const output = await spawnCommand('swarm-cli', [
        'feed',
        ...uploadArgs,
        '--stamp', INDEXER_POSTAGE_STAMP,
        '--identity', 'hexnews-beta',
    ])

    const gwOutput = await spawnCommand('swarm-cli', [
        ...uploadArgs,
        '--bee-api-url', 'https://api.gateway.ethswarm.org'
    ])

    return output + gwOutput
}

export const SNAPSHOT_FILE = 'snapshot.json'

export function readSnapshotFromFile(file: string = SNAPSHOT_FILE): Snapshot | undefined {
    try {
        const data = readFileSync(file)
        const json = new TextDecoder().decode(data)
        const snapshot = JSON.parse(json) as Snapshot
        return snapshot
    } catch (e) {
        return undefined
    }
}

async function main() {
    const storage = makeSwarmStorage(BEE_URL, SEED)
    const rootUser = privateKeyToAddress(INDEXER_FEED_PRIVATE_KEY)
    console.log(`root user is ${rootUser}`)
    const rootUserSnapshot = makeRootUserSnapshot(rootUser)
    const fileSnapshot = readSnapshotFromFile()

    console.log(`updating snapshot...`)

    const snapshot = await updateSnapshot(storage, fileSnapshot || rootUserSnapshot)
    const indexedSnapshot = indexSnapshot(snapshot)

    console.log(`writing snapshot file "${SNAPSHOT_FILE}"...`)
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot))

    const buildDir = 'tmp'
    console.log(`building website at "${buildDir}"...`)
    await buildSite(indexedSnapshot, buildDir)

    const bundle = 'hexnews.js'
    console.log(`copying bundle...`)
    copyFileSync(`dist/${bundle}`, `${buildDir}/${bundle}`)

    console.log(`upload to swarm...`)
    const output = await spawnSwarmCLIUploader(buildDir)
    console.log(output)
}

main().catch(console.error)
