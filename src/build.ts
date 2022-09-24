import { writeFileSync, mkdirSync } from 'fs'
import { IndexedSnapshot, newsPagePosts } from './model'
import { renderNews, renderPost } from './render'

export async function buildSite(indexedSnapshot: IndexedSnapshot, distDir: string = 'dist') {
    try { mkdirSync(`${distDir}/posts`, { recursive: true}) } catch (e) {}

    const sortedPosts = newsPagePosts(indexedSnapshot, 30)

    const newsPage = renderNews(indexedSnapshot, sortedPosts)
    writeFileSync(`${distDir}/index.html`, newsPage)

    return distDir
}
