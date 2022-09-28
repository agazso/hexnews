import { SEED } from './const'
import { renderConnect, renderNews, renderPost, renderSubmit } from './render'
import { IndexedSnapshot, indexSnapshot, newsPagePosts, getNextIndex, getPostById } from './snapshot'
import { makeSwarmStorage } from './storage'
import { addPost, addComment } from './test'
import { Signer, Utils } from '@ethersphere/bee-js'

declare var snapshot: IndexedSnapshot
declare var ethereum: any
export let currentAccount
export let signer: Signer | undefined

const beeUrl = 'http://localhost:1633'

const routes = {
    '/': rerender,
    '/posts/': rerenderPost,
    '/submit': rerenderSubmit,
    '/connect': rerenderConnect,
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
    // event.preventDefault()
    // history.pushState({}, '', event.target.href)
    // matchRoute()
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
    if (!signer) {
        return
    }
    const storage = makeSwarmStorage(beeUrl, SEED, signer)
    // const user = users[0]
    const address = '0x' + Utils.bytesToHex(signer.address)
    const nextIndex = getNextIndex(snapshot, address)
    const parent = undefined
    const identity = {
        address
    }
    await addComment(storage, identity, text, parent, nextIndex)
}

async function postUrl(title, url) {
    if (!signer) {
        return
    }
    const storage = makeSwarmStorage(beeUrl, SEED, signer)
    // const user = users[0]
    const address = '0x' + Utils.bytesToHex(signer.address)
    const nextIndex = getNextIndex(snapshot, address)
    const identity = {
        address
    }
    await addPost(storage, identity, title, url, nextIndex)
}

export async function comment() {
    if (!signer) {
        return
    }
    const text = (document.getElementById('text') as HTMLInputElement).value
    const parentId = (document.getElementById('parent') as HTMLInputElement).value
    const storage = makeSwarmStorage(beeUrl, SEED, signer)
    const address = '0x' + Utils.bytesToHex(signer.address)
    const nextIndex = getNextIndex(snapshot, address)
    const identity = {
        address
    }
    await addComment(storage, identity, text, parentId, nextIndex)
    return false
}

export async function submit() {
    const title = (document.getElementById('title') as HTMLInputElement).value
    const url = (document.getElementById('url') as HTMLInputElement).value
    const text = (document.getElementById('text') as HTMLInputElement).value
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

export function rerenderConnect() {
    const html = renderConnect(snapshot)
    replaceHTML(html)
}

export async function connect() {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" })
    console.debug({ accounts })

    if (accounts.length > 0) {
        currentAccount = accounts[0]
        localStorage.setItem('currentAccount', currentAccount)
        signer = await Utils.makeEthereumWalletSigner(ethereum)
        rerenderConnect()
    }
}

window.addEventListener('popstate', matchRoute)
window.addEventListener('DOMContentLoaded', matchRoute)
window.onhashchange = (e: HashChangeEvent) => {
    e.preventDefault()
    matchRoute()
}
window.onload = async (e: Event) => {
    ethereum.on('disconnect', (error: any) => {
        console.debug(`metamask disconnect`)
        localStorage.clear()
        signer = undefined
    })
    let accounts = await ethereum.request({ method: "eth_accounts" })
    if (accounts.length === 0) {
        accounts = await ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
            currentAccount = accounts[0]
            localStorage.setItem('currentAccount', currentAccount)
            signer = await Utils.makeEthereumWalletSigner(ethereum)
        }
    }
}
