import { createMockKV } from './mock-kv'

describe('Mock KV Storage', () => {
	describe('createMockKV', () => {
		it('should create a KVNamespace-compatible mock', () => {
			let kv = createMockKV()
			expect(kv).toBeDefined()
			expect(kv.get).toBeDefined()
			expect(kv.put).toBeDefined()
			expect(kv.delete).toBeDefined()
			expect(kv.list).toBeDefined()
			expect(kv.getWithMetadata).toBeDefined()
		})
	})

	describe('get', () => {
		it('should return string with type "text"', async () => {
			let kv = createMockKV()
			await kv.put('test-key', 'test-value')
			let result = await kv.get('test-key', { type: 'text' })
			expect(result).toBe('test-value')
		})

		it('should return parsed object with type "json"', async () => {
			let kv = createMockKV()
			let obj = { foo: 'bar', num: 42 }
			await kv.put('test-key', JSON.stringify(obj))
			let result = await kv.get('test-key', { type: 'json' })
			expect(result).toEqual(obj)
		})

		it('should return null for non-existent key', async () => {
			let kv = createMockKV()
			let result = await kv.get('non-existent', { type: 'text' })
			expect(result).toBeNull()
		})

		it('should return text by default when no type specified', async () => {
			let kv = createMockKV()
			await kv.put('test-key', 'test-value')
			let result = await kv.get('test-key')
			expect(result).toBe('test-value')
		})
	})

	describe('put', () => {
		it('should store value', async () => {
			let kv = createMockKV()
			await kv.put('test-key', 'test-value')
			let result = await kv.get('test-key', { type: 'text' })
			expect(result).toBe('test-value')
		})

		it('should accept options.expirationTtl without error', async () => {
			let kv = createMockKV()
			await expect(
				kv.put('test-key', 'test-value', { expirationTtl: 3600 }),
			).resolves.not.toThrow()
		})

		it('should overwrite existing value', async () => {
			let kv = createMockKV()
			await kv.put('test-key', 'value1')
			await kv.put('test-key', 'value2')
			let result = await kv.get('test-key', { type: 'text' })
			expect(result).toBe('value2')
		})
	})

	describe('delete', () => {
		it('should remove key', async () => {
			let kv = createMockKV()
			await kv.put('test-key', 'test-value')
			await kv.delete('test-key')
			let result = await kv.get('test-key', { type: 'text' })
			expect(result).toBeNull()
		})

		it('should not error when deleting non-existent key', async () => {
			let kv = createMockKV()
			await expect(kv.delete('non-existent')).resolves.not.toThrow()
		})
	})

	describe('Multiple operations', () => {
		it('should handle get after put correctly', async () => {
			let kv = createMockKV()
			await kv.put('key1', 'value1')
			await kv.put('key2', JSON.stringify({ test: true }))

			let result1 = await kv.get('key1', { type: 'text' })
			let result2 = await kv.get('key2', { type: 'json' })

			expect(result1).toBe('value1')
			expect(result2).toEqual({ test: true })
		})

		it('should handle get after delete correctly', async () => {
			let kv = createMockKV()
			await kv.put('key1', 'value1')
			await kv.put('key2', 'value2')

			await kv.delete('key1')

			let result1 = await kv.get('key1', { type: 'text' })
			let result2 = await kv.get('key2', { type: 'text' })

			expect(result1).toBeNull()
			expect(result2).toBe('value2')
		})
	})
})
