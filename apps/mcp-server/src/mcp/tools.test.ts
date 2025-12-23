import {
	handleGetRandomStrategy,
	handleGetUserHistory,
	handleSearchStrategies,
} from './tools'
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

describe('MCP Tool Handlers', () => {
	describe('handleGetRandomStrategy', () => {
		it('should return a random strategy', async () => {
			let mockKV = createMockKV()
			let params = { deviceId: 'device123' }

			let result = await handleGetRandomStrategy(mockKV, params)

			expect(result.isError).toBe(false)
			expect(result.content).toHaveLength(1)
			expect(result.content[0].type).toBe('text')

			let data = JSON.parse(result.content[0].text)
			expect(data).toHaveProperty('id')
			expect(data).toHaveProperty('text')
			expect(data).toHaveProperty('category')
		})

		it('should return strategy from specified category', async () => {
			let mockKV = createMockKV()
			let params = { deviceId: 'device123', category: 'Reframing' }

			let result = await handleGetRandomStrategy(mockKV, params)

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(data.category).toBe('Reframing')
		})

		it('should return error for invalid category', async () => {
			let mockKV = createMockKV()
			let params = { deviceId: 'device123', category: 'InvalidCategory' }

			let result = await handleGetRandomStrategy(mockKV, params)

			expect(result.isError).toBe(true)
			expect(result.content[0].text).toContain('No strategies found')
		})

		it('should automatically add to user history', async () => {
			let mockKV = createMockKV()
			let params = { deviceId: 'device123' }

			await handleGetRandomStrategy(mockKV, params)

			let history = (await mockKV.get(
				'user:device123:history',
				'json',
			)) as UserHistory[]
			expect(history).toHaveLength(1)
			expect(history[0]).toHaveProperty('strategyId')
			expect(history[0]).toHaveProperty('viewedAt')
			expect(history[0].context).toBe('get_random_strategy')
		})

		it('should throw error for missing deviceId', async () => {
			let mockKV = createMockKV()
			let params = {}

			await expect(handleGetRandomStrategy(mockKV, params)).rejects.toThrow()
		})
	})

	describe('handleGetUserHistory', () => {
		it('should return user history', async () => {
			let mockKV = createMockKV()
			let entries: UserHistory[] = [
				{ strategyId: '1', viewedAt: 1000, context: 'test' },
				{ strategyId: '2', viewedAt: 2000, context: 'test' },
			]
			await mockKV.put('user:device123:history', JSON.stringify(entries))

			let result = await handleGetUserHistory(mockKV, { deviceId: 'device123' })

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(data).toEqual(entries)
		})

		it('should return empty array for new user', async () => {
			let mockKV = createMockKV()

			let result = await handleGetUserHistory(mockKV, { deviceId: 'device123' })

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(data).toEqual([])
		})

		it('should throw error for missing deviceId', async () => {
			let mockKV = createMockKV()
			let params = {}

			await expect(handleGetUserHistory(mockKV, params)).rejects.toThrow()
		})
	})

	describe('handleSearchStrategies', () => {
		it('should search strategies by keyword', async () => {
			let mockKV = createMockKV()
			let params = { keyword: 'old' }

			let result = await handleSearchStrategies(mockKV, params)

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(Array.isArray(data)).toBe(true)
			expect(data.length).toBeGreaterThan(0)
			expect(data[0].text).toContain('old')
		})

		it('should search strategies by category', async () => {
			let mockKV = createMockKV()
			let params = { category: 'Action' }

			let result = await handleSearchStrategies(mockKV, params)

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(data.every((s: any) => s.category === 'Action')).toBe(true)
		})

		it('should search by both keyword and category', async () => {
			let mockKV = createMockKV()
			let params = { keyword: 'the', category: 'Perspective' }

			let result = await handleSearchStrategies(mockKV, params)

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(
				data.every(
					(s: any) => s.category === 'Perspective' && s.text.includes('the'),
				),
			).toBe(true)
		})

		it('should perform case-insensitive keyword search', async () => {
			let mockKV = createMockKV()
			let params = { keyword: 'OLD' }

			let result = await handleSearchStrategies(mockKV, params)

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(data.length).toBeGreaterThan(0)
		})

		it('should return empty array when no matches found', async () => {
			let mockKV = createMockKV()
			let params = { keyword: 'xyznonexistent' }

			let result = await handleSearchStrategies(mockKV, params)

			expect(result.isError).toBe(false)
			let data = JSON.parse(result.content[0].text)
			expect(data).toEqual([])
		})

		it('should throw error when no search params provided', async () => {
			let mockKV = createMockKV()
			let params = {}

			await expect(handleSearchStrategies(mockKV, params)).rejects.toThrow()
		})
	})
})
