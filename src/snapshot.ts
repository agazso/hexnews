import { readFileSync } from 'fs'
import { CombinedPost, isInvite, isPost, isVote, Post, Comment, User, Vote } from './model'
import { StorageBackend, findUpdates, makePostId } from './storage'

// declare var TextDecoder: any

export const SNAPSHOT_FILE = 'snapshot.json'

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

export function getNextIndex(snapshot: IndexedSnapshot, address: string): number {
    const userIndex = snapshot.userIndex[address]
    if (!userIndex) {
        return 0
    }

    const user = snapshot.users[userIndex]
    return user.lastIndex // TODO rename to nextIndex
}


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

