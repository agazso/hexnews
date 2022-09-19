import { generateTestSnapshot } from './test'
import { writeFileSync, mkdirSync } from 'fs'
import { IndexedSnapshot, indexSnapshot, lastNPosts, Post } from './model'
import { findChildPosts, renderNews, renderPost } from './render'

interface CombinedPost extends Post {
    comments: Post[]
    votes: number
}

const distDir = 'dist'

const combinePost = (post: Post, comments: Post[], votes: number): CombinedPost => ({ ...post, comments, votes})

const numVotes = (indexedSnapshot: IndexedSnapshot, post: Post) =>
    indexedSnapshot.postVotes[post.id]
    ? indexedSnapshot.postVotes[post.id].size + 1
    : 1

async function build() {
    try { mkdirSync(`${distDir}/posts`, { recursive: true}) } catch (e) {}

    const snapshot = await generateTestSnapshot()

    const indexedSnapshot = indexSnapshot(snapshot)
    const posts = lastNPosts(snapshot, 30, true)
    const postComments = posts.map(post => findChildPosts(indexedSnapshot, post))
    const postVotes = posts.map(post => numVotes(indexedSnapshot, post))
    const combinedPosts = posts.map((post, index) => combinePost(post, postComments[index], postVotes[index]))
    const sortedPosts = combinedPosts.sort((a, b) => b.votes - a.votes !== 0 ? b.votes - a.votes : b.comments.length - a.comments.length)

    const newsPage = renderNews(indexedSnapshot)
    writeFileSync(`${distDir}/index.html`, newsPage)

    for (const post of posts) {
        const postPage = renderPost(indexedSnapshot, post)
        writeFileSync(`${distDir}/posts/${post.id}.html`, postPage)

    }
}

build().catch(console.error)

