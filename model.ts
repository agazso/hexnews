import { Bee, Utils } from "@ethersphere/bee-js"

declare var TextDecoder: any
declare var TextEncoder: any

type Update = InviteUpdate | PostUpdate | VoteUpdate

export interface InviteUpdate {
    type: 'invite'
    user: string
}

export interface PostUpdate {
    type: 'post'
    title: string
    text: string
    link?: string
    parent?: string | undefined
}

export interface VoteUpdate {
    type: 'vote'
    post: string
}

export interface Post extends PostUpdate {
    id: string
    user: string
}

export interface Vote extends VoteUpdate {
    user: string
}

export interface User extends PublicIdentity {
    lastIndex: number
    invitedBy: string
    nick?: string
}

export interface PublicIdentity {
    address: string
}

export interface PrivateIdentity extends PublicIdentity {
    privateKey: string
}

export interface StorageBackend {
    findUpdate: (identity: PublicIdentity, index: number) => Promise<Update | undefined>
    addUpdate: (identity: PrivateIdentity, index: number, update: Update) => Promise<void>
}

const makeTopic = (address: string, index: number) => `${address}/updates/${index}`

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
            console.debug({ topic })
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
    const numBatch = 5
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

function isPost(update: Update): update is PostUpdate {
    return update.type === 'post'
}

function isInvite(update: Update): update is InviteUpdate {
    return update.type === 'invite'
}

function isVote(update: Update): update is VoteUpdate {
    return update.type === 'vote'
}

export interface Snapshot {
    users: User[]
    posts: Post[]
    votes: Vote[]
}

export interface IndexedSnapshot extends Snapshot {
    userIndex: Record<string, number>
    postIndex: Record<string, number>
    postVotes: Record<string, Set<number>>
}

export const emptySnapshot: Snapshot = {
    users: [],
    posts: [],
    votes: [],
}

export async function updateSnapshot(storage: StorageBackend, snapshot: Snapshot = emptySnapshot): Promise<Snapshot> {
    const output: Snapshot = {
        ...snapshot
    }

    for (const user of output.users) {
        const updates = await findUpdates(storage, user, user.lastIndex)

        user.lastIndex += updates.length

        const posts = updates.filter(isPost).map(update => ({ ...update, id: makePostId(update), user: user.address }))
        output.posts.push(...posts)

        const invitedUsers = updates.filter(isInvite).map(invite => ({ address: invite.user, lastIndex: 0, invitedBy: user.address }))
        for (const invitedUser of invitedUsers) {
            if (!output.users.includes(invitedUser)) {
                output.users.push(invitedUser)
            }
        }

        const votes = updates.filter(isVote).map(update => ({ ...update, user: user.address }))
        output.votes.push(...votes)
    }

    return output
}

export function indexSnapshot(snapshot: Snapshot = emptySnapshot): IndexedSnapshot {
    const output: IndexedSnapshot = {
        ...snapshot,
        userIndex: {},
        postIndex: {},
        postVotes: {},
    }

    for (let i = 0; i < output.users.length; i++) {
        output.userIndex[output.users[i].address] = i
    }

    for (let i = 0; i< output.posts.length; i++) {
        output.postIndex[output.posts[i].id] = i
    }

    for (let i = 0; i< output.votes.length; i++) {
        const vote = output.votes[i]
        if (output.postVotes[vote.post]) {
            output.postVotes[vote.post].add(output.userIndex[vote.user])
        } else {
            output.postVotes[vote.post] = new Set([output.userIndex[vote.user]])
        }
    }

    return output
}

export function lastNPosts(snapshot: Snapshot, numPosts: number, isTopLevel: boolean = false): Post[] {
    if (snapshot.posts.length === 0) {
        return []
    }
    const posts: Post[] = []
    for (let i = snapshot.posts.length - 1; i >= 0; i--) {
        if (posts.length === numPosts) {
            break
        }
        const post = snapshot.posts[i]
        if (isTopLevel) {
            if (!post.parent) {
                posts.push(post)
            }
        } else {
            posts.push(post)
        }
    }

    return posts
}

