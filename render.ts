import { IndexedSnapshot, indexSnapshot, lastNPosts, Post, Snapshot, User  } from "./model"

const title = 'Hex News'
const url = '/'

const site = (link: string) => new URL(link).hostname

function postSite(post: Post) {
    if (!post.link) {
        return ''
    }
    return `<span class="site">(${site(post.link)})</span>`
}

function postTitle(post: Post) {
    if (post.link) {
        return `<a href="${post.link}">${post.title}</a>`
    } else {
        return post.title
    }
}

const rank = (index?: number) => typeof index === 'number' ? index + 1 + '.' : ''

interface Comment extends Post {
    level: number
}

export function findChildPosts(snapshot: IndexedSnapshot, post: Post, level: number = 0): Comment[] {
    const childPosts: Comment[] = []

    // const postIndex = snapshot.postIndex[post.id]
    // TODO optimze for a single linear walk by saving child post indexes and comparing them with parent index
    for (let i = 0; i < snapshot.posts.length; i++) {
        const p = snapshot.posts[i]
        if (p.parent === post.id) {
            childPosts.push({
                ...p,
                level,
            })

            const grandChildPosts = findChildPosts(snapshot, p, level + 1)
            childPosts.push(...grandChildPosts)
        }
    }

    return childPosts
}

const pluralize = (word: string, count: number) => count > 1 ? word + 's' : word

export function renderPostTitle(post: Post, index?: number): string {
    return `
    <tr class="post-title">
        <td class="rank">${rank(index)}</td>
        <td class="post-title">${postTitle(post)}${postSite(post)}</td>
    </tr>
`
}

export function renderPostMeta(post: Post, comments: Post[], votes: number): string {
    return `
    <tr>
        <td colspan=1></td>
        <td class="meta">
            <span class="score">${votes} ${pluralize('point', votes)}</span>
            by
            <a class="user">${post.user}</a>
            |
            <a href="posts/${post.id}.html">${comments.length} ${pluralize('comment', comments.length)}</a>
        </td>
    </tr>
    `
}

const numVotes = (indexedSnapshot: IndexedSnapshot, post: Post) =>
    indexedSnapshot.postVotes[post.id]
    ? indexedSnapshot.postVotes[post.id].size + 1
    : 1

export const padding = 10
export const color = 'black'

export const css = `
* {
    margin: 0;
    padding: 0;
    border: none;
}

html {
    font-family: -apple-system, BlinkMacSystemFont, segoe ui, Helvetica, Arial, sans-serif, apple color emoji, segoe ui emoji;
}

a {
    color: inherit;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

textarea {
    margin-top: ${padding};
    padding: 2;
    border-width: 2px;
    border: black;
}

.main {
    width: 80%;
    background-color: aliceblue
}

table {
    border-collapse: collapse;
}

hr {
    background-color: lightblue;
    height: 2;
}

.header {
    background-color: lightblue;
}

.rank {
    padding-left: ${padding};
    color: gray;
}

.title {
    color: ${color};
    font-weight: bold;
    font-size: large;
    padding-top: ${padding};
    padding-bottom: ${padding};
}

.post-title {
    padding-top: ${padding};
    padding-bottom: ${padding};
}

.meta {
    font-size: smaller;
    color: gray;
    padding-left: 1;
}

.site {
    font-size: smaller;
    color: gray;
    padding-left: 10;
}

.user {
}

.separator {
    height: 2;
    padding-top: ${2 * padding};
    padding-bottom: ${2 * padding};
}

.footer {
    padding-top: ${padding};
    padding-bottom: ${padding};
    text-align: center;
}

.comment {
    padding-top: ${padding};
    font-size: smaller;
}

.button {
    font-size: normal;
    padding: ${padding}
}
`

const head = (indexedSnapshot: IndexedSnapshot) => `
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>${css}
        </style>
    </head>
`
const headerHtml = `
    <tr class="header">
        <td class="logo"></td>
        <td class="title"><a class="title" href="${url}">${title}</a></td>
    </tr>
`
const link = (title: string, url: string) => `<a href="${url}">${title}</a>`

const footerHtml = `
    <tr><td colspan=3 class="separator"><hr/></tr>
    <tr>
        <td colspan=3 class="footer">
            <span class="meta">
                ${link('Guidelines', '/guidelines')} |
                ${link('Contact', '/contact')} |
                ${link('Github', 'https://github.com/hexnews.eth')} |
                ${link('Hosted on Swarm', 'https://swarm.bzz.link')} |
                ${link('Status ✅', '/status')}
            </span>
        </td>
    </tr>
`

interface CombinedPost extends Post {
    comments: Post[]
    votes: number
}

const combinePost = (post: Post, comments: Post[], votes: number): CombinedPost => ({ ...post, comments, votes})

export function renderNews(snapshot: IndexedSnapshot): string {
    const posts = lastNPosts(snapshot, 30, true)
    const postComments = posts.map(post => findChildPosts(snapshot, post))
    const postVotes = posts.map(post => numVotes(snapshot, post))
    const combinedPosts = posts.map((post, index) => combinePost(post, postComments[index], postVotes[index]))
    const sortedPosts = combinedPosts.sort((a, b) => b.votes - a.votes !== 0 ? b.votes - a.votes : b.comments.length - a.comments.length)
    const html = `
        <!DOCTYPE html5>
        <html>
            ${head(snapshot)}
            <body>
                <center>
                <table class="main">
                    ${headerHtml}
                    ${
                        sortedPosts.map((post, index) => renderPostTitle(post, index) + renderPostMeta(post, post.comments, post.votes)).join('')
                    }
                    ${footerHtml}
                </table>
                </center>
            </body>
        </html>
`
    return html
}

export function renderComment(post: Comment): string {
    return `
    <tr>
        <td colspan=1></td>
        <td class="meta" style="padding-left: ${post.level * padding}">
            <a class="user">${post.user}</a>
        </td>
    </tr>
    <tr>
        <td colspan=1></td>
        <td>${renderCommentText(post)}</td>
    </tr>
    `
}

export function renderCommentText(post: Comment): string {
    return `<span class="comment" style="padding-left: ${post.level * padding}">${post.text}</span>`
}

export function renderPost(snapshot: IndexedSnapshot, post: Post): string {
    const comments = findChildPosts(snapshot, post)
    const votes = numVotes(snapshot, post)
    const html = `
        <!DOCTYPE html5>
        <html>
            ${head(snapshot)}
            <body>
                <center>
                <table class="main">
                    ${headerHtml}
                    <tr class="post">
                        <td colspan=1>&nbsp;</td>
                        <td class="post-title">${postTitle(post)}${postSite(post)}</td>
                    </tr>
                    ${renderPostMeta(post, comments, votes)}
                    <tr>
                        <td colspan=1>&nbsp;</td>
                        <td>
                            <form method="post" action="comment">
                                <input type="hidden" name="parent" value="32878560">
                                <input type="hidden" name="goto" value="item?id=32878560">
                                <input type="hidden" name="hmac" value="f0d33ef76de95b9498db5ef53941a5b0f11ac0ca">
                                <textarea name="text" rows="8" cols="80"></textarea>
                                <br><br>
                                <input class="button" type="submit" value="add comment">
                            </form>
                        </td>
                    </tr>
                    <tr><td colspan=3 class="separator"></tr>
                    ${
                        comments.map((comment) => renderComment(comment)).join('')
                    }
                    ${footerHtml}
                </table>
                </center>
            </body>
        </html>
`
    return html
}

