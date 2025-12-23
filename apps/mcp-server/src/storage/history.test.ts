import { addHistoryEntry, getUserHistory } from './history'
import type { UserHistory } from '@oblique/shared'

function createMockKV(): KVNamespace {
	let store = new Map<string, string>()

	return {
		get: jest.fn(async (key: string, type?: 'text' | 'json') => {
			let value = store.get(key)
			if (!value) return null
			return type === 'json' ? JSON.parse(value) : value
		}),
		put: jest.fn(async (key: string, value: string, options?: any) => {
			store.set(key, value)
		}),
		delete: jest.fn(async (key: string) => {
			store.delete(key)
		}),
		list: jest.fn(),
		getWithMetadata: jest.fn(),
	} as unknown as KVNamespace
}

describe('KV History Storage', () => {
	describe('addHistoryEntry', () => {
		it('should add entry to empty history', async () => {
			let mockKV = createMockKV()
			let entry: UserHistory = {
				strategyId: '1',
				viewedAt: Date.now(),
				context: 'test',
			}

			await addHistoryEntry(mockKV, 'device123', entry)

			let stored = (await mockKV.get(
				'user:device123:history',
				'json',
			)) as UserHistory[]
			expect(stored).toHaveLength(1)
			expect(stored[0]).toEqual(entry)
		})

		it('should prepend new entry to existing history', async () => {
			let mockKV = createMockKV()
			let existing: UserHistory[] = [
				{ strategyId: '1', viewedAt: 1000, context: 'old' },
			]
			await mockKV.put('user:device123:history', JSON.stringify(existing))

			let newEntry: UserHistory = {
				strategyId: '2',
				viewedAt: 2000,
				context: 'new',
			}
			await addHistoryEntry(mockKV, 'device123', newEntry)

			let stored = (await mockKV.get(
				'user:device123:history',
				'json',
			)) as UserHistory[]
			expect(stored).toHaveLength(2)
			expect(stored[0]).toEqual(newEntry)
			expect(stored[1]).toEqual(existing[0])
		})

		it('should enforce 100 entry limit', async () => {
			let mockKV = createMockKV()
			let existing: UserHistory[] = Array.from({ length: 100 }, (_, i) => ({
				strategyId: String(i),
				viewedAt: i,
				context: 'test',
			}))
			await mockKV.put('user:device123:history', JSON.stringify(existing))

			let newEntry: UserHistory = {
				strategyId: '100',
				viewedAt: 100,
				context: 'new',
			}
			await addHistoryEntry(mockKV, 'device123', newEntry)

			let stored = (await mockKV.get(
				'user:device123:history',
				'json',
			)) as UserHistory[]
			expect(stored).toHaveLength(100)
			expect(stored[0]).toEqual(newEntry)
			expect(stored[99].strategyId).toBe('98')
		})

		it('should set 90 day TTL when writing', async () => {
			let mockKV = createMockKV()
			let spy = jest.spyOn(mockKV, 'put')

			let entry: UserHistory = {
				strategyId: '1',
				viewedAt: Date.now(),
				context: 'test',
			}
			await addHistoryEntry(mockKV, 'device123', entry)

			expect(spy).toHaveBeenCalledWith(
				'user:device123:history',
				expect.any(String),
				{ expirationTtl: 7776000 },
			)
		})
	})

	describe('getUserHistory', () => {
		it('should return empty array for non-existent user', async () => {
			let mockKV = createMockKV()

			let history = await getUserHistory(mockKV, 'device123')

			expect(history).toEqual([])
		})

		it('should return stored history', async () => {
			let mockKV = createMockKV()
			let entries: UserHistory[] = [
				{ strategyId: '1', viewedAt: 1000, context: 'test' },
			]
			await mockKV.put('user:device123:history', JSON.stringify(entries))

			let history = await getUserHistory(mockKV, 'device123')

			expect(history).toEqual(entries)
		})
	})
})
