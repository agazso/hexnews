import { Post, Comment, CombinedPost  } from "./model"
import { IndexedSnapshot } from "./snapshot"

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
        <td class="post-title">${postTitle(post)}${hspace(halfPadding)}${postSite(post)}</td>
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
            <a href="/#/posts/${post.id}" onclick="hexnews.router(event)">${comments.length} ${pluralize('comment', comments.length)}</a>
        </td>
    </tr>
`
}

export const padding = 10
export const halfPadding = padding / 2
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
    cursor: pointer;
}

a:hover {
    text-decoration: none;
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
    height: 2px;
    margin-top: ${2 * padding}px;
    margin-bottom: ${2 * padding}px;
}

input, textarea {
    padding: ${padding / 2}px;
    margin: ${padding / 2}px;
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
    font-size: initial;
    padding: ${padding}px;
}

.menu {
    font-size: medium;
    font-weight: normal;
}

.label {
    color: gray;
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

const hspace = (padding: number) => `<span style="padding-left: ${padding}px"></span>`

const headerHtml = `
    <tr class="header">
        <td class="logo"></td>
        <td class="title">
            <a class="title" href="${url}" onclick="hexnews.router(event)">${title} ß</a>
            ${hspace(30)}
            <a class="menu" href="/#/submit" onclick="hexnews.router(event)">submit</a>
        </td>
        <td class="right">
            <a class="menu" href="/#/login" onclick="hexnews.router(event)">login</a>
        </td>
    </tr>
`
const link = (title: string, url: string) => `<a href="${url}" onclick="hexnews.router(event)">${title}</a>`

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
    <tr><td colspan=3 class="separator"></tr>
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
        <td class="meta" style="padding-left: ${post.level * padding}px">
            <a class="user">${post.user}</a>
            |
            <a>reply</a>
        </td>
    </tr>
    <tr>
        <td colspan=1></td>
        <td>${renderCommentText(post)}</td>
    </tr>
    `
}

export function renderCommentText(post: Comment): string {
    return `<span class="comment" style="padding-left: ${post.level * padding}px">${post.text}</span>`
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

export function renderSubmit(snapshot: IndexedSnapshot): string {
    const html = `
        <!DOCTYPE html>
        <html>
            ${head(snapshot)}
            <body>
                <center>
                <table class="main">
                    ${headerHtml}
                    <form method="post" action="comment">
                        <tr>
                            <td class="label">title</td>
                            <td>
                                <!--<input type="text" name="title" value="" size="50" autofocus="t" oninput="tlen(this)" onfocus="tlen(this)">-->
                                <input type="text" id="title" name="title" value="" size="50" autofocus="t">
                                <span style="margin-left:10px"></span>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">url</td>
                            <td><input type="url" id="url" name="url" value="" size="50"></td>
                        </tr>
                        <tr>
                            <td class="label">text</td>
                            <td><textarea name="text" id="text" rows="4" cols="49"></textarea></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td></td>
                            <td><input class="button" type="submit" value="submit" onclick="hexnews.submit()"></td>
                        </tr>
                        <tr style="height:20px">
                        </tr>
                        <tr>
                            <td></td>
                            <td class="label">Leave url blank to submit a question for discussion. If there
                                is no url, text will appear at the top of the thread. If
                                there is a url, text is optional.<br><br>
                            </td>
                        </tr>
                    </form>
                    ${footerHtml}
                </table>
                </center>
            </body>
        </html>
`
    return html
}

