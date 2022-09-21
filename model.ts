import { Utils } from "@ethersphere/bee-js"

export type Update = InviteUpdate | PostUpdate | VoteUpdate

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

export interface Comment extends Post {
    level: number
}

export interface CombinedPost extends Post {
    comments: Comment[]
    votes: number
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

export function indexSnapshot(snapshot: Readonly<Snapshot> = emptySnapshot): IndexedSnapshot {
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

export function findChildPosts(snapshot: IndexedSnapshot, post: Post): Comment[] {
    const childPosts: Record<string, Comment> = {}

    const postIndex = snapshot.postIndex[post.id]
    for (let i = postIndex + 1; i < snapshot.posts.length; i++) {
        const p = snapshot.posts[i]
        if (p.parent === post.id) {
            childPosts[p.id] = {
                ...p,
                level: 0,
            }
        } else if (p.parent && childPosts[p.parent]) {
            const parent = childPosts[p.parent]
            childPosts[p.id] = {
                ...p,
                level: parent.level + 1,
            }
        }
    }

    return Object.values(childPosts)
}

const combinePost = (post: Post, comments: Comment[], votes: number): CombinedPost => ({ ...post, comments, votes})

const numVotes = (indexedSnapshot: IndexedSnapshot, post: Post) =>
    indexedSnapshot.postVotes[post.id]
    ? indexedSnapshot.postVotes[post.id].size + 1
    : 1

export function getPostById(indexedSnapshot: IndexedSnapshot, id: string): CombinedPost {
    const postIndex = indexedSnapshot.postIndex[id]
    const post = indexedSnapshot.posts[postIndex]
    const comments = findChildPosts(indexedSnapshot, post)
    const votes = numVotes(indexedSnapshot, post)
    return combinePost(post, comments, votes)
}

export function newsPagePosts(snapshot: IndexedSnapshot, numPosts: number): CombinedPost[] {
    const posts = lastNPosts(snapshot, numPosts, true)
    const postComments = posts.map(post => findChildPosts(snapshot, post))
    const postVotes = posts.map(post => numVotes(snapshot, post))
    const combinedPosts = posts.map((post, index) => combinePost(post, postComments[index], postVotes[index]))
    const sortedPosts = combinedPosts.sort((a, b) => b.votes - a.votes !== 0 ? b.votes - a.votes : b.comments.length - a.comments.length)
    return sortedPosts
}
