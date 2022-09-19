import { generateTestSnapshot } from './test'
import { writeFileSync, mkdirSync } from 'fs'
import { IndexedSnapshot, indexSnapshot, lastNPosts, Post, Comment, findChildPosts, newsPagePosts } from './model'
import { renderNews, renderPost } from './render'

const distDir = 'dist'

async function build() {
    try { mkdirSync(`${distDir}/posts`, { recursive: true}) } catch (e) {}

    const snapshot = await generateTestSnapshot()

    const indexedSnapshot = indexSnapshot(snapshot)
    const sortedPosts = newsPagePosts(indexedSnapshot, 30)

    const newsPage = renderNews(indexedSnapshot, sortedPosts)
    writeFileSync(`${distDir}/index.html`, newsPage)

    for (const post of sortedPosts) {
        const postPage = renderPost(indexedSnapshot, post, post.comments, post.votes)
        writeFileSync(`${distDir}/posts/${post.id}.html`, postPage)
    }
}

build().catch(console.error)

