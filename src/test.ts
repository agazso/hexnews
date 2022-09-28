import { PostUpdate, PublicIdentity, Post, PrivateIdentity, InviteUpdate, VoteUpdate } from "./model"
import { Snapshot, emptySnapshot, updateSnapshotSerial, updateSnapshotConcurrent } from "./snapshot"
import { StorageBackend, findUpdates, makePostId, makeMemoryStorage } from "./storage"

export const users = [
    {
        privateKey: '0x2db11bcf42c8b5047a750ec3dabf1fb196f34b9bf37b30c0ed98868a8b686073',
        address: '0xd7fb8944204c56fe4887d1feba85cc45490a777b',
        nick: 'hexnews',
    },
    {
        privateKey: '0xd4e8975c704bf4df9c43830bb4932d983e03f5aeb147ff8e028b2edbb96e20cc',
        address: '0xc4b44921591102b71c61bbcc8baa86742ba845c6',
        nick: 'plurry',
    },
    {
        privateKey: '0xefe5a9132388bfe473e682aaa83fe5f1b9e736eda36b62d91bddfbb0ce0b8ec5',
        address: '0xb55d12745e73da94258291dd0d5432b4a45fa230',
        nick: '0xSNARK'
    },
    {
        privateKey: '0xecfab85bbcc1bfec8a546cd2aaff6d12dc6835fa3854ad2502a2b13f7ecf65e3',
        address: '0xaad894575a56f1c9614f0655396f6e168218fd99',
        nick: 'drivah.eth',
    },
    {
        privateKey: '0x59cc6a90d443b5dadd17fdeada2b4fcc9b2b01d522cc808593d16df1f869da69',
        address: '0xf3ec07ea08074f2842b2580232a27c350378d2dc',
        nick: 'pinacolada'
    },
    {
        privateKey: '0x9fe568f743582267d2eeaf18564a353a6db760be2f5e69e581453c2a5434dc2f',
        address: '0x60b94dcd9d95560e12178a07ab09136ba81db06e',
        nick: 'ceracotta',
    },
    {
        privateKey: '0x2d77c9a1305572bb000129996db773964eb1972848ee07ca2a436fc068ebaccf',
        address: '0x51e2c6e515638edfde5d5c863b27f77d9142590b',
        nick: 'mousecatcher',
    },
    {
        privateKey: '0x64d999973340416c017723397d8fb3340d3ce0f0360add88100a1c01a184f863',
        address: '0x2638df8cf78d3193dff2f350160bfc64a07aa0ad',
        nick: 'Nosys',
    },
    {
        privateKey: '0xfe513368f21694d784ec437aaeac419110b208c589d55202f8189d47a086f6b1',
        address: '0x4089c6d22cdf6f67967c2352f1976725ccedc0a3',
        nick: 'fidofan',
    },
    {
        privateKey: '0x285911ec8e42fd9981956cfe5b77f0059902404b1c550c819598934cbfbc6068',
        address: '0x98b21c5e8422a4a6b09471706c3f8ad5f216a5ba',
        nick: 'mevboost',
    },
    {
        privateKey: '0x351afcbdfbcae41ae838d54e8109dee9ab45944ab756fe80de0b6ab14ed73e94',
        address: '0x4897ce45f196a852115d752da54bc54f38187965',
        nick: 'pintail',
    },
    {
        privateKey: '0x70624c5c79d8dc8712ceb1c88561bce8b5df1c4b827b829f0e61310386d3500b',
        address: '0xb337e4f337a18d3280e2dcef34f1c414a68cb7a0',
        nick: 'fverse',
    },
]

function identity(nick: string): PrivateIdentity {
    const index = users.findIndex(user => user.nick === nick)
    if (index === -1) {
        throw `can not found user by name ${nick}`
    }
    return users[index]
}

function address(nick: string): string {
    const index = users.findIndex(user => user.nick === nick)
    if (index === -1) {
        throw `can not found user by name ${nick}`
    }
    return users[index].address
}

export async function addPost(storage: StorageBackend, identity: PublicIdentity, title: string, link: string, nextIndex?: number): Promise<Post> {
    const post: PostUpdate = {
        type: 'post',
        title,
        text: '',
        link,
    }
    if (!nextIndex) {
        const updates = await findUpdates(storage, identity)
        nextIndex = updates.length
    }
    await storage.addUpdate(identity, nextIndex, post)
    return {
        ...post,
        id: makePostId(post),
        user: identity.address,
    }
}

export async function addComment(storage: StorageBackend, identity: PublicIdentity, text: string, parent?: string, nextIndex?: number): Promise<Post> {
    const post: PostUpdate = {
        type: 'post',
        title: '',
        text,
        parent,
    }
    if (!nextIndex) {
        const updates = await findUpdates(storage, identity)
        nextIndex = updates.length
    }
    await storage.addUpdate(identity, nextIndex, post)
    return {
        ...post,
        id: makePostId(post),
        user: identity.address,
    }
}

async function addInvite(storage: StorageBackend, identity: PrivateIdentity, otherIdentity: PublicIdentity, nextIndex?: number){
    const invite: InviteUpdate = {
        type: 'invite',
        user: otherIdentity.address,
    }
    if (!nextIndex) {
        const updates = await findUpdates(storage, identity)
        nextIndex = updates.length
    }
    await storage.addUpdate(identity, nextIndex, invite)
}

async function addVote(storage: StorageBackend, identity: PrivateIdentity, post: string, nextIndex?: number) {
    const invite: VoteUpdate = {
        type: 'vote',
        post,
    }
    if (!nextIndex) {
        const updates = await findUpdates(storage, identity)
        nextIndex = updates.length
    }
    await storage.addUpdate(identity, nextIndex, invite)
}

export const makeRootUserSnapshot = (address: string): Snapshot => ({
    ...emptySnapshot,
    users: [{
        address,
        lastIndex: 0,
        invitedBy: address,
    }],
})

export async function generateTestSnapshot(storage: StorageBackend = makeMemoryStorage(), updateSnapshot = updateSnapshotSerial) {
    const firstPost = await addPost(storage, users[0], `Hex News launched! 🔥💥📣`, 'https://hexnews.bzz.link')
    const secondPost = await addPost(storage, users[0], `Swarm.City Boardwalk Implementation in Typescript`, 'https://github.com/swarmcity/boardwalk-ts/issues')
    await addInvite(storage, users[0], users[1])
    await addVote(storage, users[0], secondPost.id)

    const swarmDesktopPost = await addPost(storage, users[1], `New Swarm Desktop Release 0.16.0`, 'https://github.com/ethersphere/swarm-desktop/releases/tag/v0.16.0')
    await addInvite(storage, users[1], users[2])

    await addPost(storage, users[2], `Ethereum Successfully Executes Highly-Anticipated Merge Event`, 'https://decrypt.co/109751/ethereum-successfully-executes-highly-anticipated-merge-event-ushering-proof-of-stake-era')
    await addPost(storage, users[2], `EIP-181: ENS support for reverse resolution of Ethereum addresses`, 'https://eips.ethereum.org/EIPS/eip-181')
    await addVote(storage, users[2], swarmDesktopPost.id)

    const rootSnapshot = makeRootUserSnapshot(users[0].address)
    let snapshot = await updateSnapshot(storage, rootSnapshot)

    await addInvite(storage, users[2], users[3])
    await addPost(storage, users[3], `EthLimo Summer Updates, Roadmap and More`, 'https://ethlimo.substack.com/p/summer-updates-roadmap-and-more')
    const coolPost = await addComment(storage, users[3], `Cool post`, firstPost.id)

    snapshot = await updateSnapshot(storage, snapshot)

    await addVote(storage, users[1], firstPost.id)
    await addVote(storage, users[2], firstPost.id)

    await addInvite(storage, users[3], users[4])
    await addPost(storage, users[4], `IPFS Camp 2022 Oct 28-30 in Lisbon, Portugal`, 'https://2022.ipfs.camp/')

    await addPost(storage, users[2], `Devcon Bogotá Schedule, Oct 11 → 14`, 'https://next--efdevcon.netlify.app/app/schedule/')

    await addInvite(storage, users[3], users[5])
    await addPost(storage, users[5], `ComposeDB: Using Ceramic as a Graph Database`, 'https://blog.ceramic.network/composedb-using-ceramic-as-a-graph-database/')

    await addInvite(storage, users[5], users[6])
    await addPost(storage, users[6], `An Honest Report on Web3 Data & Storage`, 'https://curiouscat178.substack.com/p/its-finally-here-an-honest-report')

    await addInvite(storage, users[6], users[7])
    await addPost(storage, users[7], `The new Gnosis Chain Documentation site is L I V E  🎉`, 'https://docs.gnosischain.com/')

    snapshot = await updateSnapshot(storage, snapshot)

    await addInvite(storage, users[5], users[8])
    await addPost(storage, users[8], `A Virtual FIDO2 USB Device`, 'https://github.com/bulwarkid/virtual-fido')

    await addInvite(storage, users[2], users[9])
    await addPost(storage, users[9], `Track MEV-Boost Relays and Block Builders`, 'https://www.mevboost.org')

    await addInvite(storage, users[9], users[10])
    await addPost(storage, users[10], `Post-Merge MEV: Modelling Validator Returns`, 'https://pintail.xyz/posts/post-merge-mev/')

    await addInvite(storage, users[10], users[11])
    await addPost(storage, users[11], `Fileverse: File sharing between blockchain addresses`, 'https://fileverse.io/')

    await addComment(storage, users[0], `Thanks!`, coolPost.id)

    snapshot = await updateSnapshot(storage, snapshot)

    snapshot = await updateSnapshot(storage, snapshot)

    return snapshot
}
