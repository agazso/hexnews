import { Bee, Utils } from "@ethersphere/bee-js"
import { PublicIdentity, Update, PrivateIdentity, PostUpdate } from "./model"

declare var TextDecoder: any
declare var TextEncoder: any

export interface StorageBackend {
    findUpdate: (identity: PublicIdentity, index: number) => Promise<Update | undefined>
    addUpdate: (identity: PrivateIdentity, index: number, update: Update) => Promise<void>
}

export const makeTopic = (address: string, index: number) => `${address}/updates/${index}`

export const makePostId = (post: PostUpdate) => Utils.bytesToHex(Utils.keccak256Hash(JSON.stringify(post)))

export const makeMemoryStorage = (): StorageBackend => {
    const memory: Record<string, Update> = {}
    return {
        findUpdate: async (identity: PublicIdentity, index: number): Promise<Update | undefined> => {
            const topic = makeTopic(identity.address, index)
            return memory[topic]
        },
        addUpdate: async (identity: PrivateIdentity, index: number, update: Update): Promise<void> => {
            const topic = makeTopic(identity.address, index)
            memory[topic] = update
        }
    }
}

export const makeSwarmStorage = (url: string = 'http://localhost:1633', seed: string = '0000000000000000000000000000000000000000000000000000000000000000'): StorageBackend => {
    const bee = new Bee(url)
    const postageBatchId = '0f49cad16a8224ba4cd1b3362c6cc1cdccca8cdfa56688344e3c44eb384d976c'
    return {
        findUpdate: async (identity: PublicIdentity, index: number): Promise<Update | undefined> => {
            const topic = makeTopic(`${seed}/${identity.address}`, index)
            console.debug({ topic })
            const identifier = Utils.keccak256Hash(topic)
            const socReader = bee.makeSOCReader(identity.address)
            try {
                const soc = await socReader.download(identifier)
                const data = soc.payload()
                const text = new TextDecoder().decode(data)
                const update = JSON.parse(text) as Update
                return update
            } catch (e) {
                return undefined
            }
        },
        addUpdate: async (identity, index, update) => {
            const topic = makeTopic(`${seed}/${identity.address}`, index)
            console.debug({ identity, index, update, topic })
            const identifier = Utils.keccak256Hash(topic)
            const socWriter = bee.makeSOCWriter(identity.privateKey)
            const updateJSON = JSON.stringify(update)
            const data = new TextEncoder().encode(updateJSON)
            await socWriter.upload(postageBatchId, identifier, data)
        },
    }
}

// reference implementation for simplicity and correctness
async function findUpdatesOneByOne(storage: StorageBackend, identity: PublicIdentity, lastIndex: number = 0): Promise<Update[]> {
    const updates: Update[] = []
    let index = lastIndex
    while (true) {
        const update = await storage.findUpdate(identity, index)
        if (!update) {
            break
        }

        updates.push(update)
        index++
    }
    return updates
}


export async function findUpdates(storage: StorageBackend, identity: PublicIdentity, lastIndex: number = 0): Promise<Update[]> {
    const updates: Update[] = []
    let index = lastIndex
    const numBatch = 3
    while (true) {
        const findUpdates = new Array(numBatch).fill('').map((_, i) => storage.findUpdate(identity, index + i))
        const batchUpdates = await Promise.all(findUpdates)

        for (const update of batchUpdates) {
            if (!update) {
                return updates
            }
            updates.push(update)
        }

        index += numBatch
    }
    return updates
}
