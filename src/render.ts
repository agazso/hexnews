import { Post, Comment, CombinedPost  } from "./model"
import { getParentPost, getRootPost, getUserByAddress, IndexedSnapshot } from "./snapshot"

declare var localStorage: any
declare var hexnews: any

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

export function renderPostMeta(post: Post, comments: Post[], votes: number, children: string = ''): string {
    return `
    <tr>
        <td colspan=1></td>
        <td class="meta">
            <span class="score">${votes} ${pluralize('point', votes)}</span>
            by
            <a class="user">${post.user}</a>
            |
            <a href="/#/posts/${post.id}">${comments.length} ${pluralize('comment', comments.length)}</a>
            ${children}
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
    background-color: aliceblue;
    padding: ${padding}px;
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

.right {
    padding-right: ${padding}px;
}
.spacer {
    width: ${padding}px;
    height: ${padding}px;
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

const headerHtml = () => `
    <tr class="header">
        <td class="logo"></td>
        <td class="title">
            <a class="title" href="/#/">${title} ??eta</a>
            ${hspace(30)}
            <a class="menu" href="/#/submit">submit</a>
        </td>
        <td class="right">
            ${
                typeof localStorage === 'object' && localStorage.getItem('currentAccount')
                ? `<a class="menu" href="/#/connect">${localStorage.getItem('currentAccount')}</a>`
                : `<a class="menu" href="/#/connect">connect</a>`
            }
        </td>
    </tr>
`
const link = (title: string, url: string) => `<a href="${url}">${title}</a>`

const footerHtml = `
    <tr><td colspan=3 class="separator"><hr/></tr>
    <tr>
        <td colspan=3 class="footer">
            <span class="meta">
                ${link('Guidelines', '/#/guidelines')} |
                ${link('Contact', '/#/contact')} |
                ${link('Github', 'https://github.com/agazso/hexnews')} |
                ${link('Hosted on Swarm', 'https://swarm.bzz.link')} |
                ${link('Status ???', '/#/status')}
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
                    ${headerHtml()}
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
            <a href="/#/posts/${post.id}">view</a>
            |
            <a onclick="hexnews.openReply('${post.id}')">reply</a>
        </td>
    </tr>
    <tr>
        <td colspan=1></td>
        <td>${renderCommentText(post)}</td>
    </tr>
    <tr id="reply-${post.id}"></tr>
    `
}

export function renderCommentText(post: Comment): string {
    return `<span class="comment" style="padding-left: ${post.level * padding}px">${post.text}</span>`
}

export function renderReply(id: string): string {
    return `
        <td colspan=1>&nbsp;</td>
        <td>
            <textarea name="text" id="text-${id}" rows="8" cols="80"></textarea>
            <br><br>
            <input class="button" type="button" value="add comment" onclick="hexnews.comment('${id}')">
        </td>
`
}

export function renderPost(snapshot: IndexedSnapshot, post: Post, comments: Comment[], votes: number): string {
    const rootPost = getRootPost(snapshot, post.id)
    const parentPost = getParentPost(snapshot, post.id)
    const root = rootPost && rootPost.id !== post.id
        ? ` | <a href="/#/posts/${rootPost.id}">on: ${rootPost.title}</a>`
        : ''
    const parent = parentPost
        ? ` | <a href="/#/posts/${parentPost.id}">parent</a>`
        : ''

    const html = `
        <!DOCTYPE html>
        <html>
            ${head(snapshot)}
            <body>
                <center>
                <table class="main">
                    ${headerHtml()}
                    <tr class="post">
                        <td colspan=1>&nbsp;</td>
                        <td class="post-title">${postTitle(post)}${postSite(post)}</td>
                    </tr>
                    ${renderPostMeta(post, comments, votes, `${parent}${root}`)}
                    <tr>
                        ${renderReply(post.id)}
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
                    ${headerHtml()}
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

export function renderConnect(snapshot: IndexedSnapshot): string {
    const currentAccount = localStorage.getItem('currentAccount')
    const currentUser = getUserByAddress(snapshot, currentAccount)
    const html = `
        <!DOCTYPE html>
        <html>
            ${head(snapshot)}
            <body>
                <center>
                <table class="main">
                    ${headerHtml()}
                    <tr>
                        <td class="spacer"></td>
                    </tr>
                    <tr>
                        <td></td>
                        <td></td>
                    </tr>
                        <td></td>
                        <td class="label">
                        ${ hexnews.signer
                            ? `Connected to metamask, account: ${currentAccount}`
                            : `<input class="button" type="submit" value="connect with metamask" onclick="hexnews.connect()">`
                        }
                        </td>
                    </tr>
                    <tr style="height:20px">
                    </tr>
                    <tr>
                        <td></td>
                        <td class="label">
                            ${ currentUser
                                ? `Invited by ${currentUser.invitedBy}`
                                : `You are not invited. Ask someone you know to invite you!`
                            }
                            <br><br>
                        </td>
                    </tr>
                    ${footerHtml}
                </table>
                </center>
            </body>
        </html>
`
    return html
}

