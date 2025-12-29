import { describe, it, expect } from '@jest/globals'
import { formatSSEMessage, createSSEStream, createSSEResponse } from './sse.js'
import { createSuccessResponse, createErrorResponse } from './jsonrpc.js'

describe('SSE Utilities', () => {
	describe('formatSSEMessage', () => {
		it('should format JSON-RPC success response as SSE data event', () => {
			// Arrange
			let response = createSuccessResponse(1, { tools: [] })

			// Act
			let formatted = formatSSEMessage(response)

			// Assert
			expect(formatted).toMatch(/^data: /)
			expect(formatted).toContain('"jsonrpc":"2.0"')
			expect(formatted).toContain('"id":1')
			expect(formatted).toContain('"result":')
		})

		it('should format JSON-RPC error response as SSE data event', () => {
			// Arrange
			let response = createErrorResponse(1, -32600, 'Invalid Request')

			// Act
			let formatted = formatSSEMessage(response)

			// Assert
			expect(formatted).toMatch(/^data: /)
			expect(formatted).toContain('"jsonrpc":"2.0"')
			expect(formatted).toContain('"error":')
			expect(formatted).toContain('"code":-32600')
		})

		it('should add double newline after each event', () => {
			// Arrange
			let response = createSuccessResponse(1, { test: true })

			// Act
			let formatted = formatSSEMessage(response)

			// Assert
			expect(formatted).toMatch(/\n\n$/)
		})

		it('should handle null id in response', () => {
			// Arrange
			let response = createSuccessResponse(null, { test: true })

			// Act
			let formatted = formatSSEMessage(response)

			// Assert
			expect(formatted).toContain('"id":null')
		})
	})

	describe('createSSEStream', () => {
		it('should create ReadableStream with SSE formatted message', async () => {
			// Arrange
			let response = createSuccessResponse(1, { test: true })

			// Act
			let stream = createSSEStream(response)

			// Assert
			expect(stream).toBeInstanceOf(ReadableStream)

			// Read the stream
			let reader = stream.getReader()
			let decoder = new TextDecoder()
			let { value, done } = await reader.read()

			expect(done).toBe(false)
			expect(value).toBeDefined()
			let text = decoder.decode(value)
			expect(text).toMatch(/^data: /)
			expect(text).toMatch(/\n\n$/)
		})

		it('should send single message and close stream', async () => {
			// Arrange
			let response = createSuccessResponse(1, { test: true })

			// Act
			let stream = createSSEStream(response)
			let reader = stream.getReader()

			// Read first chunk
			let first = await reader.read()
			expect(first.done).toBe(false)

			// Read second chunk (should be done)
			let second = await reader.read()

			// Assert
			expect(second.done).toBe(true)
			expect(second.value).toBeUndefined()
		})
	})

	describe('createSSEResponse', () => {
		it('should create Response with text/event-stream header', () => {
			// Arrange
			let response = createSuccessResponse(1, { test: true })

			// Act
			let httpResponse = createSSEResponse(response)

			// Assert
			expect(httpResponse).toBeInstanceOf(Response)
			expect(httpResponse.headers.get('content-type')).toBe('text/event-stream')
		})

		it('should set Cache-Control: no-cache', () => {
			// Arrange
			let response = createSuccessResponse(1, { test: true })

			// Act
			let httpResponse = createSSEResponse(response)

			// Assert
			expect(httpResponse.headers.get('cache-control')).toBe('no-cache')
		})

		it('should set Connection: keep-alive', () => {
			// Arrange
			let response = createSuccessResponse(1, { test: true })

			// Act
			let httpResponse = createSSEResponse(response)

			// Assert
			expect(httpResponse.headers.get('connection')).toBe('keep-alive')
		})

		it('should stream JSON-RPC response correctly', async () => {
			// Arrange
			let response = createSuccessResponse(123, { message: 'hello' })

			// Act
			let httpResponse = createSSEResponse(response)
			let text = await httpResponse.text()

			// Assert
			expect(text).toMatch(/^data: /)
			expect(text).toContain('"id":123')
			expect(text).toContain('"message":"hello"')
			expect(text).toMatch(/\n\n$/)
		})
	})
})
