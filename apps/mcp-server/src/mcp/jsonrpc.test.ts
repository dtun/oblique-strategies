import {
	createSuccessResponse,
	createErrorResponse,
	isValidJSONRPCRequest,
} from './jsonrpc'

describe('JSON-RPC 2.0 Utilities', () => {
	describe('createSuccessResponse', () => {
		it('should create valid JSON-RPC 2.0 success response', () => {
			let result = createSuccessResponse(1, { data: 'test' })

			expect(result.jsonrpc).toBe('2.0')
			expect(result.id).toBe(1)
			expect(result.result).toEqual({ data: 'test' })
			expect(result.error).toBeUndefined()
		})

		it('should work with string ids', () => {
			let result = createSuccessResponse('abc-123', { value: 42 })

			expect(result.jsonrpc).toBe('2.0')
			expect(result.id).toBe('abc-123')
			expect(result.result).toEqual({ value: 42 })
		})

		it('should work with null as result', () => {
			let result = createSuccessResponse(2, null)

			expect(result.jsonrpc).toBe('2.0')
			expect(result.id).toBe(2)
			expect(result.result).toBeNull()
		})
	})

	describe('createErrorResponse', () => {
		it('should create valid JSON-RPC 2.0 error response', () => {
			let result = createErrorResponse(1, -32600, 'Invalid Request')

			expect(result.jsonrpc).toBe('2.0')
			expect(result.id).toBe(1)
			expect(result.error).toEqual({ code: -32600, message: 'Invalid Request' })
			expect(result.result).toBeUndefined()
		})

		it('should work with string ids', () => {
			let result = createErrorResponse('xyz-789', -32601, 'Method not found')

			expect(result.jsonrpc).toBe('2.0')
			expect(result.id).toBe('xyz-789')
			expect(result.error).toBeDefined()
			expect(result.error?.code).toBe(-32601)
		})

		it('should work with null id', () => {
			let result = createErrorResponse(null, -32700, 'Parse error')

			expect(result.jsonrpc).toBe('2.0')
			expect(result.id).toBeNull()
			expect(result.error).toEqual({ code: -32700, message: 'Parse error' })
		})
	})

	describe('isValidJSONRPCRequest', () => {
		it('should return true for valid request', () => {
			let req = { jsonrpc: '2.0', id: 1, method: 'test' }

			expect(isValidJSONRPCRequest(req)).toBe(true)
		})

		it('should return true for valid request with params', () => {
			let req = {
				jsonrpc: '2.0',
				id: 1,
				method: 'test',
				params: { foo: 'bar' },
			}

			expect(isValidJSONRPCRequest(req)).toBe(true)
		})

		it('should return false for missing jsonrpc field', () => {
			let req = { id: 1, method: 'test' }

			expect(isValidJSONRPCRequest(req)).toBe(false)
		})

		it('should return false for wrong jsonrpc version', () => {
			let req = { jsonrpc: '1.0', id: 1, method: 'test' }

			expect(isValidJSONRPCRequest(req)).toBe(false)
		})

		it('should return false for missing id field', () => {
			let req = { jsonrpc: '2.0', method: 'test' }

			expect(isValidJSONRPCRequest(req)).toBe(false)
		})

		it('should return false for missing method field', () => {
			let req = { jsonrpc: '2.0', id: 1 }

			expect(isValidJSONRPCRequest(req)).toBe(false)
		})

		it('should return false for non-string method', () => {
			let req = { jsonrpc: '2.0', id: 1, method: 123 }

			expect(isValidJSONRPCRequest(req)).toBe(false)
		})

		it('should return false for non-object request', () => {
			expect(isValidJSONRPCRequest(null)).toBe(false)
			expect(isValidJSONRPCRequest(undefined)).toBe(false)
			expect(isValidJSONRPCRequest('string')).toBe(false)
			expect(isValidJSONRPCRequest(123)).toBe(false)
		})
	})
})
