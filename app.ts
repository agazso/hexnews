import { getPostById, indexSnapshot, newsPagePosts, Snapshot } from "./model";
import { renderNews, renderPost } from "./render";

declare var snapshot: Snapshot

const routes = {
    '/': rerender,
    '/posts/': rerenderPost,
}

function matchRoute(path) {
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
    matchRoute(window.location.pathname)
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

window.addEventListener('popstate', function() {
    matchRoute(window.location.pathname)
})

window.addEventListener('DOMContentLoaded', function() {
    matchRoute(window.location.pathname)
})
