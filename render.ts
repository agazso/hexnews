import { IndexedSnapshot, Post, Comment, CombinedPost  } from "./model"

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
            <a href="posts/${post.id}.html" onclick="hexnews.router(event)">${comments.length} ${pluralize('comment', comments.length)}</a>
        </td>
    </tr>
`
}

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
    margin-top: ${padding}px;
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
    padding-top: ${padding / 2}px;
    padding-left: ${padding}px;
    color: gray;
}

.title {
    color: ${color};
    font-weight: bold;
    font-size: large;
    padding-top: ${padding}px;
    padding-bottom: ${padding}px;
}

.post-title {
    padding-top: ${padding}px;
    padding-bottom: ${padding / 2}px;
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
    padding-top: ${2 * padding}px;
    padding-bottom: ${2 * padding}px;
}

.footer {
    padding-top: ${padding}px;
    padding-bottom: ${padding}px;
    text-align: center;
}

.comment-meta {
    padding-top: ${padding}px;
}

.comment {
    padding-top: ${padding}px;
    font-size: smaller;
}

.button {
    font-size: normal;
    padding: ${padding}px;
}
`

const head = (indexedSnapshot: IndexedSnapshot) => `
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>${css}
        </style>
        <script src="hexnews.js"></script>
        <script>var snapshot = ${JSON.stringify(indexedSnapshot)}</script>
    </head>
`
const headerHtml = `
    <tr class="header">
        <td class="logo"></td>
        <td class="title"><a class="title" href="${url}">${title} <small>beta</small></a></td>
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

export function renderNews(snapshot: IndexedSnapshot, posts: CombinedPost[]) {
    const html = `
        <!DOCTYPE html>
        <html>
            ${head(snapshot)}
            <body>
                <center>
                <table class="main">
                    ${headerHtml}
                    ${
                        posts.map((post, index) => renderPostTitle(post, index) + renderPostMeta(post, post.comments, post.votes)).join('')
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
    <tr class="comment-meta">
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

export function renderPost(snapshot: IndexedSnapshot, post: Post, comments: Comment[], votes: number): string {
    const html = `
        <!DOCTYPE html>
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

