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
})
