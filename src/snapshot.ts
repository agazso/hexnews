import { makeAsyncQueue } from './async-queue'
import { CombinedPost, isInvite, isPost, isVote, Post, Comment, User, Vote, Update } from './model'
import { StorageBackend, findUpdates, makePostId } from './storage'

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

interface UpdateResult {
    userIndex: number
    user: Readonly<User>
    updates: ReadonlyArray<Update>
}

function isUpdateResult(result: UpdateResult | undefined): result is UpdateResult {
    if (result) {
        return true
    }
    return false
}

async function fetchUpdateResults(storage: StorageBackend, users: User[]): Promise<UpdateResult[]> {
    const concurrency = 1
    const asyncQueue = makeAsyncQueue(concurrency)

    const results: (UpdateResult | undefined)[] = new Array(users.length)
    for (let i = 0; i < users.length; i++) {
        const user = users[i]
        asyncQueue.enqueue(async () => {
            const updates = await findUpdates(storage, user, user.lastIndex)
            if (updates.length > 0) {
                results[i]! = {
                    updates,
                    user,
                    userIndex: i,
                }
            }
        })
    }

    await asyncQueue.drain()

    console.debug({ results })

    return results.filter(isUpdateResult)
}

export async function updateSnapshotConcurrent(storage: StorageBackend, snapshot: Readonly<Snapshot> = emptySnapshot): Promise<Snapshot> {
    const output: Snapshot = emptySnapshot

    const results = await fetchUpdateResults(storage, snapshot.users)
    const sortedResults = results.sort((resA, resB) => resA.userIndex - resB.userIndex)

    const updatedUsers = [...snapshot.users]
    const newUsers: User[] = []
    for (const result of sortedResults) {
        const user = result.user
        const updates = result.updates

        console.debug({ updates })

        const lastIndex = user.lastIndex + updates.length
        updatedUsers[result.userIndex] = {
            ...snapshot.users[result.userIndex],
            lastIndex,
        }

        const posts = updates.filter(isPost).map(update => ({ ...update, id: makePostId(update), user: user.address }))
        output.posts.push(...posts)

        const invitedUsers = updates.filter(isInvite).map(invite => ({ address: invite.user, lastIndex: 0, invitedBy: user.address }))
        for (const invitedUser of invitedUsers) {
            if (!updatedUsers.includes(invitedUser)) {
                newUsers.push(invitedUser)
            }
        }

        const votes = updates.filter(isVote).map(update => ({ ...update, user: user.address }))
        output.votes.push(...votes)
    }

    const invitedSnapshot = await updateSnapshotSerial(storage, { ...emptySnapshot, users: newUsers})

    return {
        users: [...updatedUsers, ...invitedSnapshot.users],
        posts: [...snapshot.posts, ...output.posts, ...invitedSnapshot.posts],
        votes: [...snapshot.votes, ...output.votes, ...invitedSnapshot.votes],
    }
}

export const updateSnapshot = updateSnapshotSerial

export async function updateSnapshotSerial(storage: StorageBackend, snapshot: Snapshot = emptySnapshot): Promise<Snapshot> {
    const output: Snapshot = {
        ...snapshot
    }

    for (let i = 0; i < output.users.length; i++) {
        const user = output.users[i]
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

export function getNextIndex(snapshot: IndexedSnapshot, address: string): number {
    const userIndex = snapshot.userIndex[address]
    if (!userIndex) {
        return 0
    }

    const user = snapshot.users[userIndex]
    return user.lastIndex // TODO rename to nextIndex
}
