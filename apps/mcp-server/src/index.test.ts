import { Hono } from 'hono'
import app from './index'

describe('Hono App with Cloudflare KV Bindings', () => {
	describe('App Export', () => {
		it('should export a Hono app instance', () => {
			expect(app).toBeDefined()
			expect(app).toBeInstanceOf(Hono)
		})
	})

	describe('Type Safety', () => {
		it('should compile with correct Bindings type definition', () => {
			type ExpectedBindings = {
				KV: KVNamespace
			}

			let _typeCheck: Hono<{ Bindings: ExpectedBindings }> = app
			expect(_typeCheck).toBeDefined()
		})
	})

	describe('Root Route', () => {
		it('should have a GET / route defined', async () => {
			let req = new Request('http://localhost/')
			let res = await app.request(req)

			expect(res).toBeDefined()
			expect(res.status).toBeDefined()
		})
	})

	describe('Root Route Response Format', () => {
		it('should return content-type text/plain', async () => {
			let req = new Request('http://localhost/')
			let res = await app.request(req)

			let contentType = res.headers.get('content-type')
			expect(contentType).toContain('text/plain')
		})
	})

	describe('Root Route Content', () => {
		it('should return "Oblique Strategies MCP Server" message', async () => {
			let req = new Request('http://localhost/')
			let res = await app.request(req)

			let text = await res.text()
			expect(text).toBe('Oblique Strategies MCP Server')
		})
	})

	describe('Root Route Status', () => {
		it('should return 200 OK status', async () => {
			let req = new Request('http://localhost/')
			let res = await app.request(req)

			expect(res.status).toBe(200)
		})
	})

	describe('HTTP Method Specificity', () => {
		it('should respond to GET requests on /', async () => {
			let req = new Request('http://localhost/', { method: 'GET' })
			let res = await app.request(req)
			expect(res.status).toBe(200)
		})

		it('should not match POST requests on / (returns 404)', async () => {
			let req = new Request('http://localhost/', { method: 'POST' })
			let res = await app.request(req)
			expect(res.status).toBe(404)
		})

		it('should not match PUT requests on / (returns 404)', async () => {
			let req = new Request('http://localhost/', { method: 'PUT' })
			let res = await app.request(req)
			expect(res.status).toBe(404)
		})
	})

	describe('404 Handling', () => {
		it('should return 404 for non-existent routes', async () => {
			let req = new Request('http://localhost/non-existent')
			let res = await app.request(req)
			expect(res.status).toBe(404)
		})
	})

	describe('Integration Test', () => {
		it('should work as a complete Cloudflare Worker-compatible app', async () => {
			let req = new Request('http://localhost/')
			let res = await app.request(req)

			expect(res).toBeDefined()
			expect(res.status).toBe(200)
			expect(res.headers.get('content-type')).toContain('text/plain')

			let text = await res.text()
			expect(text).toBe('Oblique Strategies MCP Server')
		})
	})

	describe('POST /mcp endpoint', () => {
		describe('MCP Route Existence', () => {
			it('should have a POST /mcp route defined', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ jsonrpc: '2.0', method: 'test' }),
				})
				let res = await app.request(req)

				expect(res).toBeDefined()
				expect(res.status).toBeDefined()
			})
		})

		describe('MCP HTTP Method Specificity', () => {
			it('should not match GET requests on /mcp (returns 404)', async () => {
				let req = new Request('http://localhost/mcp', { method: 'GET' })
				let res = await app.request(req)
				expect(res.status).toBe(404)
			})
		})

		describe('MCP tools/list endpoint', () => {
			it('should return list of available tools', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/list',
					}),
				})
				let res = await app.request(req)

				expect(res.status).toBe(200)
				let json = (await res.json()) as any
				expect(json.jsonrpc).toBe('2.0')
				expect(json.id).toBe(1)
				expect(json.result).toBeDefined()
				expect(Array.isArray(json.result.tools)).toBe(true)
				expect(json.result.tools.length).toBe(3)
			})

			it('should include tool schemas', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/list',
					}),
				})
				let res = await app.request(req)
				let json = (await res.json()) as any

				let tool = json.result.tools.find(
					(t: any) => t.name === 'get_random_strategy',
				)
				expect(tool).toBeDefined()
				expect(tool.description).toBeDefined()
				expect(tool.inputSchema).toBeDefined()
				expect(tool.inputSchema.type).toBe('object')
				expect(tool.inputSchema.properties).toBeDefined()
				expect(tool.inputSchema.required).toContain('deviceId')
			})

			it('should list all three tools', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/list',
					}),
				})
				let res = await app.request(req)
				let json = (await res.json()) as any

				let toolNames = json.result.tools.map((t: any) => t.name)
				expect(toolNames).toContain('get_random_strategy')
				expect(toolNames).toContain('get_user_history')
				expect(toolNames).toContain('search_strategies')
			})
		})

		describe('MCP Tools Integration', () => {
			function createMockKV(): KVNamespace {
				let store = new Map<string, string>()
				return {
					get: jest.fn(async (key: string, type?: 'text' | 'json') => {
						let value = store.get(key)
						if (!value) return null
						return type === 'json' ? JSON.parse(value) : value
					}),
					put: jest.fn(async (key: string, value: string) => {
						store.set(key, value)
					}),
					delete: jest.fn(async (key: string) => {
						store.delete(key)
					}),
					list: jest.fn(),
					getWithMetadata: jest.fn(),
				} as unknown as KVNamespace
			}

			it('should handle valid get_random_strategy request', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: {
							name: 'get_random_strategy',
							arguments: { deviceId: 'device123' },
						},
					}),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(200)
				let json = (await res.json()) as any
				expect(json.jsonrpc).toBe('2.0')
				expect(json.id).toBe(1)
				expect(json.result).toBeDefined()
				expect(json.result.content).toHaveLength(1)
				expect(json.result.isError).toBe(false)
			})

			it('should return error for invalid JSON-RPC format', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ method: 'test' }),
				})
				let res = await app.request(req)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error.code).toBe(-32600)
			})

			it('should return error for unknown tool', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: {
							name: 'unknown_tool',
							arguments: {},
						},
					}),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(404)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error.code).toBe(-32601)
			})

			it('should return error for invalid tool arguments', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: {
							name: 'get_random_strategy',
							arguments: {},
						},
					}),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
			})

			it('should return error for non-tools/call method', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'unknown/method',
						params: {},
					}),
				})
				let res = await app.request(req)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
			})

			it('should return error for malformed JSON', async () => {
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: 'not valid json',
				})
				let res = await app.request(req)

				expect(res.status).toBe(400)
			})
		})
	})

	describe('POST /register endpoint', () => {
		function createMockKV(): KVNamespace {
			let store = new Map<string, { value: string; expirationTtl?: number }>()
			return {
				get: jest.fn(async (key: string, type?: 'text' | 'json') => {
					let entry = store.get(key)
					if (!entry) return null
					return type === 'json' ? JSON.parse(entry.value) : entry.value
				}),
				put: jest.fn(
					async (
						key: string,
						value: string,
						options?: { expirationTtl?: number },
					) => {
						store.set(key, {
							value,
							expirationTtl: options?.expirationTtl,
						})
					},
				),
				delete: jest.fn(async (key: string) => {
					store.delete(key)
				}),
				list: jest.fn(),
				getWithMetadata: jest.fn(),
			} as unknown as KVNamespace
		}

		describe('Basic Success Case', () => {
			it('should accept valid PIN and deviceId', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456', deviceId: 'device-abc-123' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(200)
				let json = (await res.json()) as any
				expect(json).toEqual({ success: true })
			})

			it('should store deviceId in KV with correct key format', async () => {
				let mockKV = createMockKV()
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '654321', deviceId: 'mobile-xyz' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				expect(mockKV.put).toHaveBeenCalledWith('pin:654321', 'mobile-xyz', {
					expirationTtl: 300,
				})
			})

			it('should set 5-minute TTL (300 seconds)', async () => {
				let mockKV = createMockKV()
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '111111', deviceId: 'device1' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				expect(mockKV.put).toHaveBeenCalledWith(
					expect.any(String),
					expect.any(String),
					{ expirationTtl: 300 },
				)
			})
		})

		describe('PIN Validation Tests', () => {
			it('should reject PIN that is too short', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '12345', deviceId: 'device1' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('PIN must be exactly 6 digits')
			})

			it('should reject PIN that is too long', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '1234567', deviceId: 'device1' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('PIN must be exactly 6 digits')
			})

			it('should reject PIN with non-numeric characters', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: 'abc123', deviceId: 'device1' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('PIN must be exactly 6 digits')
			})

			it('should reject empty PIN', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '', deviceId: 'device1' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('PIN must be exactly 6 digits')
			})
		})

		describe('Request Validation Tests', () => {
			it('should reject request missing deviceId', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('Invalid request body')
			})

			it('should reject request missing PIN', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ deviceId: 'device1' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('Invalid request body')
			})

			it('should reject request with empty deviceId', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456', deviceId: '' }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toBe('Invalid request body')
			})

			it('should reject invalid JSON body', async () => {
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: 'not valid json',
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(400)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
			})

			it('should not match GET requests on /register (returns 404)', async () => {
				let req = new Request('http://localhost/register', { method: 'GET' })
				let res = await app.request(req)
				expect(res.status).toBe(404)
			})

			it('should not match PUT requests on /register (returns 404)', async () => {
				let req = new Request('http://localhost/register', { method: 'PUT' })
				let res = await app.request(req)
				expect(res.status).toBe(404)
			})

			it('should not match DELETE requests on /register (returns 404)', async () => {
				let req = new Request('http://localhost/register', {
					method: 'DELETE',
				})
				let res = await app.request(req)
				expect(res.status).toBe(404)
			})
		})

		describe('KV Storage Verification', () => {
			it('should store exactly the deviceId as the value', async () => {
				let mockKV = createMockKV()
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						pin: '999999',
						deviceId: 'exact-device-id-123',
					}),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				expect(mockKV.put).toHaveBeenCalledWith(
					'pin:999999',
					'exact-device-id-123',
					{ expirationTtl: 300 },
				)
			})

			it('should use pin: prefix in key format', async () => {
				let mockKV = createMockKV()
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '777777', deviceId: 'device-xyz' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				expect(mockKV.put).toHaveBeenCalledWith(
					expect.stringMatching(/^pin:/),
					expect.any(String),
					expect.any(Object),
				)
			})

			it('should allow overwriting existing PIN', async () => {
				let mockKV = createMockKV()
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}

				// First registration
				let req1 = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '555555', deviceId: 'device1' }),
				})
				let res1 = await app.fetch(req1, mockEnv, ctx as any)
				expect(res1.status).toBe(200)

				// Second registration with same PIN
				let req2 = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '555555', deviceId: 'device2' }),
				})
				let res2 = await app.fetch(req2, mockEnv, ctx as any)
				expect(res2.status).toBe(200)

				// Verify put was called twice
				expect(mockKV.put).toHaveBeenCalledTimes(2)
			})
		})

		describe('Edge Cases', () => {
			it('should handle very long deviceId', async () => {
				let longDeviceId = 'a'.repeat(2000)
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456', deviceId: longDeviceId }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(200)
				let json = (await res.json()) as any
				expect(json).toEqual({ success: true })
			})

			it('should handle special characters in deviceId', async () => {
				let specialDeviceId = 'device-!@#$%^&*()_+-=[]{}|;:,.<>?'
				let req = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456', deviceId: specialDeviceId }),
				})
				let mockEnv = { KV: createMockKV() }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(200)
				let json = (await res.json()) as any
				expect(json).toEqual({ success: true })
			})

			it('should handle concurrent requests with same PIN', async () => {
				let mockKV = createMockKV()
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}

				// Concurrent requests
				let req1 = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '888888', deviceId: 'device-a' }),
				})
				let req2 = new Request('http://localhost/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '888888', deviceId: 'device-b' }),
				})

				let [res1, res2] = await Promise.all([
					app.fetch(req1, mockEnv, ctx as any),
					app.fetch(req2, mockEnv, ctx as any),
				])

				expect(res1.status).toBe(200)
				expect(res2.status).toBe(200)
			})
		})
	})
})
