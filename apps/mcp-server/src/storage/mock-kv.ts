export function createMockKV(): KVNamespace {
	let store = new Map<string, string>()

	return {
		async get(key: string, options?: { type?: 'text' | 'json' }) {
			let value = store.get(key)
			if (!value) return null
			if (options?.type === 'json') return JSON.parse(value)
			return value
		},
		async put(key: string, value: string, options?: any) {
			store.set(key, value)
		},
		async delete(key: string) {
			store.delete(key)
		},
		list: async () => ({ keys: [], list_complete: true, cursor: '' }),
		getWithMetadata: async () => ({ value: null, metadata: null }),
	} as unknown as KVNamespace
}
