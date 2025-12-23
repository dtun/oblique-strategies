import { z } from 'zod'
import type { UserHistory } from '@oblique/shared'

const MAX_HISTORY_ENTRIES = 100
const HISTORY_TTL = 7776000 // 90 days in seconds

let UserHistorySchema = z.object({
	strategyId: z.string(),
	viewedAt: z.number(),
	context: z.string().optional(),
})

let UserHistoryArraySchema = z.array(UserHistorySchema)

export async function addHistoryEntry(
	kv: KVNamespace,
	deviceId: string,
	entry: UserHistory,
): Promise<void> {
	let key = `user:${deviceId}:history`
	let existing = await getUserHistory(kv, deviceId)
	let updated = [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES)

	await kv.put(key, JSON.stringify(updated), { expirationTtl: HISTORY_TTL })
}

export async function getUserHistory(
	kv: KVNamespace,
	deviceId: string,
): Promise<UserHistory[]> {
	let key = `user:${deviceId}:history`
	let stored = await kv.get(key, 'json')

	if (!stored) {
		return []
	}

	let parsed = UserHistoryArraySchema.safeParse(stored)
	return parsed.success ? parsed.data : []
}
