export type Update = InviteUpdate | PostUpdate | VoteUpdate

export interface InviteUpdate {
    type: 'invite'
    user: string
}

export interface PostUpdate {
    type: 'post'
    title: string
    text: string
    link?: string
    parent?: string | undefined
}

export interface VoteUpdate {
    type: 'vote'
    post: string
}

export interface Post extends PostUpdate {
    id: string
    user: string
}

export interface Comment extends Post {
    level: number
}

export interface CombinedPost extends Post {
    comments: Comment[]
    votes: number
}

export interface Vote extends VoteUpdate {
    user: string
}

export interface User extends PublicIdentity {
    lastIndex: number
    invitedBy: string
    nick?: string
}

export interface PublicIdentity {
    address: string
}

export interface PrivateIdentity extends PublicIdentity {
    privateKey: string
}

export function isPost(update: Update): update is PostUpdate {
    return update.type === 'post'
}

export function isInvite(update: Update): update is InviteUpdate {
    return update.type === 'invite'
}

export function isVote(update: Update): update is VoteUpdate {
    return update.type === 'vote'
}

