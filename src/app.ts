import { SEED } from './const'
import { renderNews, renderPost, renderSubmit } from './render'
import { IndexedSnapshot, indexSnapshot, newsPagePosts, getNextIndex, getPostById } from './snapshot'
import { makeSwarmStorage } from './storage'
import { addPost, users, addComment } from './test'

declare var snapshot: IndexedSnapshot

const beeUrl = 'http://localhost:1633'

const routes = {
    '/': rerender,
    '/posts/': rerenderPost,
    '/submit': rerenderSubmit,
}

function matchRoute() {
    const path = window.location.hash !== '' ? window.location.hash.slice(1) : window.location.pathname
    const sortedRoutes = Object.keys(routes).sort((a, b) => b.length - a.length)
    const match = sortedRoutes.find(r => path.startsWith(r))
    if (match) {
        const fn = routes[match]
        const rest = path.slice(match.length)
        fn(rest)
    }
}

export function router(event) {
    event.preventDefault()
    history.pushState({}, '', event.target.href)
    matchRoute()
}

function replaceHTML(html: string) {
    document.querySelector('html')!.innerHTML = html
}

export function rerender() {
    const indexedSnapshot = indexSnapshot(snapshot)
    const sortedPosts = newsPagePosts(indexedSnapshot, 30)

    const newsPage = renderNews(indexedSnapshot, sortedPosts)
    replaceHTML(newsPage)
}

function rerenderSubmit() {
    const submitPage = renderSubmit(snapshot)
    replaceHTML(submitPage)
}

async function postText(text) {
    const storage = makeSwarmStorage(beeUrl, SEED)
    const user = users[0]
    const nextIndex = getNextIndex(snapshot, user.address)
    const parent = undefined
    await addComment(storage, user, text, parent, nextIndex)
}

async function postUrl(title, url) {
    const storage = makeSwarmStorage(beeUrl, SEED)
    const user = users[0]
    const nextIndex = getNextIndex(snapshot, user.address)
    await addPost(storage, user, title, url, nextIndex)
}

export async function submit() {
    const title = document.getElementsByName('title')
    const url = document.getElementsByName('url')
    const text = document.getElementsByName('text')
    if (text) {
        await postText(text)
    } else {
        await postUrl(title, url)
    }
    return false
}

function stripHtmlExtension(id: string) {
    const htmlExt = '.html'
    if (id.endsWith(htmlExt)) {
        return id.slice(0, id.length - htmlExt.length)
    }
    return id
}

export function rerenderPost(id: string) {
    id = stripHtmlExtension(id)
    const indexedSnapshot = indexSnapshot(snapshot)
    const post = getPostById(indexedSnapshot, id)
    const postPage = renderPost(indexedSnapshot, post, post.comments, post.votes)
    replaceHTML(postPage)
}

window.addEventListener('popstate', matchRoute)
window.addEventListener('DOMContentLoaded', matchRoute)
