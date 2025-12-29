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

	describe('GET /auth endpoint', () => {
		describe('HTML Form Response', () => {
			it('should return HTML form with 200 status', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)

				expect(res.status).toBe(200)
			})

			it('should return Content-Type: text/html header', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)

				let contentType = res.headers.get('content-type')
				expect(contentType).toContain('text/html')
			})

			it('should contain form with PIN input field', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)

				let html = await res.text()
				expect(html).toContain('<form')
				expect(html).toContain('type="text"')
				expect(html).toContain('name="pin"')
				expect(html).toContain('id="pin"')
			})

			it('should have form that posts to /auth endpoint', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)

				let html = await res.text()
				expect(html).toContain('method="POST"')
				expect(html).toContain('action="/auth"')
			})

			it('should include PIN validation pattern', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)

				let html = await res.text()
				expect(html).toContain('pattern="[0-9]{6}"')
				expect(html).toContain('maxlength="6"')
			})

			it('should have submit button', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)

				let html = await res.text()
				expect(html).toContain('<button')
				expect(html).toContain('type="submit"')
			})
		})

		describe('HTTP Method Specificity', () => {
			it('should respond to GET requests on /auth', async () => {
				let req = new Request('http://localhost/auth', { method: 'GET' })
				let res = await app.request(req)
				expect(res.status).toBe(200)
			})

			it('should not match PUT requests on /auth (returns 404)', async () => {
				let req = new Request('http://localhost/auth', { method: 'PUT' })
				let res = await app.request(req)
				expect(res.status).toBe(404)
			})

			it('should not match DELETE requests on /auth (returns 404)', async () => {
				let req = new Request('http://localhost/auth', { method: 'DELETE' })
				let res = await app.request(req)
				expect(res.status).toBe(404)
			})
		})
	})

	describe('POST /auth endpoint', () => {
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

		describe('Success Cases', () => {
			it('should exchange valid PIN for token', async () => {
				let mockKV = createMockKV()
				// Pre-populate KV with a PIN
				await mockKV.put('pin:123456', 'device-abc-123', {
					expirationTtl: 300,
				})

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(200)
				let contentType = res.headers.get('content-type')
				expect(contentType).toContain('text/html')
			})

			it('should display generated token in success page', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:654321', 'test-device', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '654321' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				let html = await res.text()
				// Token should be a UUID format
				expect(html).toMatch(
					/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
				)
			})

			it('should store generated token in KV with token: prefix', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:111111', 'device1', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '111111' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				// Verify token was stored with correct prefix (check the second put call)
				let tokenPutCalls = (mockKV.put as jest.Mock).mock.calls.filter(
					(call) => call[0].startsWith('token:'),
				)
				expect(tokenPutCalls.length).toBe(1)
				expect(tokenPutCalls[0][0]).toMatch(/^token:/)
				expect(tokenPutCalls[0][1]).toBe('device1')
			})

			it('should delete PIN from KV after successful exchange', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:222222', 'device2', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '222222' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				expect(mockKV.delete).toHaveBeenCalledWith('pin:222222')
			})

			it('should store token with no expiration (no TTL)', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:333333', 'device3', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '333333' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				await app.fetch(req, mockEnv, ctx as any)

				// Verify put was called without expirationTtl (third param should be undefined)
				let putCalls = (mockKV.put as jest.Mock).mock.calls.filter((call) =>
					call[0].startsWith('token:'),
				)
				expect(putCalls.length).toBe(1)
				expect(putCalls[0][2]).toBeUndefined()
			})

			it('should include MCP configuration example in success page', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:444444', 'device4', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '444444' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				let html = await res.text()
				expect(html).toContain('mcpServers')
				expect(html).toContain('oblique-strategies')
				expect(html).toContain('Authorization')
				expect(html).toContain('Bearer')
			})

			it('should include copy button in success page', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:555555', 'device5', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '555555' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				let html = await res.text()
				expect(html).toContain('onclick')
				expect(html).toContain('copy')
			})
		})

		describe('Error Cases', () => {
			it('should reject PIN that does not exist in KV', async () => {
				let mockKV = createMockKV()
				// Don't pre-populate KV - PIN doesn't exist

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '999999' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				expect(res.status).toBe(404)
				let json = (await res.json()) as any
				expect(json.error).toBeDefined()
				expect(json.error).toContain('not found')
			})

			it('should reject PIN with invalid format (not 6 digits)', async () => {
				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '12345' }),
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

			it('should reject PIN with non-numeric characters', async () => {
				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: 'abc123' }),
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

			it('should reject missing PIN in request body', async () => {
				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({}),
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

			it('should reject non-string PIN values', async () => {
				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: 123456 }),
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

			it('should reject invalid JSON body', async () => {
				let req = new Request('http://localhost/auth', {
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
		})

		describe('Token Generation', () => {
			it('should generate unique tokens across multiple exchanges', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:111111', 'device1', { expirationTtl: 300 })
				await mockKV.put('pin:222222', 'device2', { expirationTtl: 300 })

				let req1 = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '111111' }),
				})
				let req2 = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '222222' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}

				let res1 = await app.fetch(req1, mockEnv, ctx as any)
				// Need to re-populate since PIN was deleted
				await mockKV.put('pin:222222', 'device2', { expirationTtl: 300 })
				let res2 = await app.fetch(req2, mockEnv, ctx as any)

				let html1 = await res1.text()
				let html2 = await res2.text()

				// Extract tokens from HTML
				let token1Match = html1.match(
					/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
				)
				let token2Match = html2.match(
					/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
				)

				expect(token1Match).toBeTruthy()
				expect(token2Match).toBeTruthy()
				expect(token1Match![0]).not.toBe(token2Match![0])
			})

			it('should generate tokens in UUID v4 format', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:123456', 'device-test', { expirationTtl: 300 })

				let req = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '123456' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}
				let res = await app.fetch(req, mockEnv, ctx as any)

				let html = await res.text()
				// UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
				expect(html).toMatch(
					/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
				)
			})
		})

		describe('One-Time PIN Usage', () => {
			it('should prevent PIN reuse after successful exchange', async () => {
				let mockKV = createMockKV()
				await mockKV.put('pin:777777', 'device-reuse-test', {
					expirationTtl: 300,
				})

				let req1 = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '777777' }),
				})
				let mockEnv = { KV: mockKV }
				let ctx = {
					waitUntil: jest.fn(),
					passThroughOnException: jest.fn(),
				}

				// First request should succeed
				let res1 = await app.fetch(req1, mockEnv, ctx as any)
				expect(res1.status).toBe(200)

				// Second request with same PIN should fail (PIN was deleted)
				let req2 = new Request('http://localhost/auth', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin: '777777' }),
				})
				let res2 = await app.fetch(req2, mockEnv, ctx as any)
				expect(res2.status).toBe(404)
			})
		})
	})

	describe('POST /mcp with SSE and Authentication', () => {
		let mockKV: KVNamespace
		let validToken = 'test-token-abc123'
		let deviceId = 'device-test-xyz'

		beforeEach(async () => {
			mockKV = {
				get: jest.fn(async (key: string) => {
					if (key === `token:${validToken}`) return deviceId
					if (key === `user:${deviceId}:history`) return null
					return null
				}),
				put: jest.fn(async () => {}),
				delete: jest.fn(async () => {}),
				list: jest.fn(),
				getWithMetadata: jest.fn(),
			} as unknown as KVNamespace
		})

		describe('Authentication', () => {
			it('should return 401 when Authorization header is missing', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.status).toBe(401)
			})

			it('should return 401 when token is invalid', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: 'Bearer invalid-token',
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.status).toBe(401)
			})

			it('should return 401 for malformed Authorization header', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: 'Basic abc123',
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.status).toBe(401)
			})
		})

		describe('SSE Response Format', () => {
			async function parseSSE(res: Response): Promise<any> {
				let text = await res.text()
				let dataLine = text
					.split('\n')
					.find((line) => line.startsWith('data: '))
				if (!dataLine) throw new Error('No data line in SSE response')
				return JSON.parse(dataLine.replace('data: ', ''))
			}

			it('should return text/event-stream content type', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.headers.get('content-type')).toBe('text/event-stream')
			})

			it('should set Cache-Control: no-cache', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.headers.get('cache-control')).toBe('no-cache')
			})

			it('should set Connection: keep-alive', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.headers.get('connection')).toBe('keep-alive')
			})

			it('should stream tools/list as SSE event', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				let json = await parseSSE(res)

				// Assert
				expect(json.jsonrpc).toBe('2.0')
				expect(json.id).toBe(1)
				expect(json.result).toBeDefined()
				expect(Array.isArray(json.result.tools)).toBe(true)
			})

			it('should stream tools/call success as SSE event', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 2,
						method: 'tools/call',
						params: {
							name: 'get_random_strategy',
							arguments: { deviceId: 'will-be-overridden' },
						},
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				let json = await parseSSE(res)

				// Assert
				expect(json.jsonrpc).toBe('2.0')
				expect(json.id).toBe(2)
				expect(json.result).toBeDefined()
				expect(json.result.content).toBeDefined()
			})
		})

		describe('Token to DeviceId Flow', () => {
			it('should use deviceId from token for tool execution', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: {
							name: 'get_user_history',
							arguments: {},
						},
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				await res.text() // Consume response

				// Assert
				// Verify KV was called with the correct deviceId from token
				expect(mockKV.get).toHaveBeenCalledWith(
					`user:${deviceId}:history`,
					'json',
				)
			})

			it('should override any deviceId in request body', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: {
							name: 'get_user_history',
							arguments: { deviceId: 'hacker-device' },
						},
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				await res.text() // Consume response

				// Assert
				// Should use deviceId from token, not from request body
				expect(mockKV.get).toHaveBeenCalledWith(
					`user:${deviceId}:history`,
					'json',
				)
			})
		})

		describe('MCP Protocol Handshake', () => {
			async function parseSSE(res: Response): Promise<any> {
				let text = await res.text()
				let dataLine = text
					.split('\n')
					.find((line) => line.startsWith('data: '))
				if (!dataLine) throw new Error('No data line in SSE response')
				return JSON.parse(dataLine.replace('data: ', ''))
			}

			it('should handle initialize method', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						method: 'initialize',
						params: {
							protocolVersion: '2024-11-05',
							capabilities: {},
							clientInfo: {
								name: 'test-client',
								version: '1.0.0',
							},
						},
						id: 1,
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				let json = await parseSSE(res)

				// Assert
				expect(json.jsonrpc).toBe('2.0')
				expect(json.id).toBe(1)
				expect(json.result).toBeDefined()
				expect(json.result.protocolVersion).toBe('2024-11-05')
				expect(json.result.capabilities).toBeDefined()
				expect(json.result.capabilities.tools).toBeDefined()
				expect(json.result.serverInfo).toBeDefined()
				expect(json.result.serverInfo.name).toBe('oblique-strategies')
				expect(json.result.serverInfo.version).toBe('1.0.0')
			})

			it('should handle notifications/initialized', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						method: 'notifications/initialized',
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })

				// Assert
				expect(res.status).toBe(200)
			})
		})

		describe('JSON-RPC Errors via SSE', () => {
			async function parseSSE(res: Response): Promise<any> {
				let text = await res.text()
				let dataLine = text
					.split('\n')
					.find((line) => line.startsWith('data: '))
				if (!dataLine) throw new Error('No data line in SSE response')
				return JSON.parse(dataLine.replace('data: ', ''))
			}

			it('should stream invalid request error', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({ invalid: 'request' }),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				let json = await parseSSE(res)

				// Assert
				expect(json.jsonrpc).toBe('2.0')
				expect(json.error).toBeDefined()
				expect(json.error.code).toBe(-32600)
			})

			it('should stream method not found error', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'unknown/method',
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				let json = await parseSSE(res)

				// Assert
				expect(json.jsonrpc).toBe('2.0')
				expect(json.error).toBeDefined()
				expect(json.error.code).toBe(-32601)
			})

			it('should stream invalid params error', async () => {
				// Arrange
				let req = new Request('http://localhost/mcp', {
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						Authorization: `Bearer ${validToken}`,
					},
					body: JSON.stringify({
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: { invalid: 'params' },
					}),
				})

				// Act
				let res = await app.fetch(req, { KV: mockKV })
				let json = await parseSSE(res)

				// Assert
				expect(json.jsonrpc).toBe('2.0')
				expect(json.error).toBeDefined()
				expect(json.error.code).toBe(-32602)
			})
		})
	})
})
