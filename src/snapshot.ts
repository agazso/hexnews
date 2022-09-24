import { readFileSync } from 'fs'
import { Snapshot } from "./model"

// declare var TextDecoder: any

export const SNAPSHOT_FILE = 'snapshot.json'

export function readSnapshotFromFile(file: string = SNAPSHOT_FILE): Snapshot | undefined {
    try {
        const data = readFileSync(file)
        const json = new TextDecoder().decode(data)
        const snapshot = JSON.parse(json) as Snapshot
        return snapshot
    } catch (e) {
        return undefined
    }
}

