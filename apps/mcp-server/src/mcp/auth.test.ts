import { describe, it, expect, beforeEach } from '@jest/globals'
import {
	extractBearerToken,
	validateToken,
	authenticateRequest,
} from './auth.js'
import { createMockKV } from '../storage/mock-kv.js'

describe('Authentication Module', () => {
	describe('extractBearerToken', () => {
		it('should extract token from valid Authorization header', () => {
			// Arrange
			let authHeader = 'Bearer abc123xyz'

			// Act
			let token = extractBearerToken(authHeader)

			// Assert
			expect(token).toBe('abc123xyz')
		})

		it('should return null for missing Authorization header', () => {
			// Arrange
			let authHeader = null

			// Act
			let token = extractBearerToken(authHeader)

			// Assert
			expect(token).toBeNull()
		})

		it('should return null for malformed Authorization header', () => {
			// Arrange
			let authHeader = 'Basic abc123'

			// Act
			let token = extractBearerToken(authHeader)

			// Assert
			expect(token).toBeNull()
		})

		it('should handle extra whitespace', () => {
			// Arrange
			let authHeader = 'Bearer   token-with-spaces  '

			// Act
			let token = extractBearerToken(authHeader)

			// Assert
			expect(token).toBe('token-with-spaces')
		})

		it('should return null for Bearer without token', () => {
			// Arrange
			let authHeader = 'Bearer '

			// Act
			let token = extractBearerToken(authHeader)

			// Assert
			expect(token).toBe('')
		})
	})

	describe('validateToken', () => {
		let mockKV: KVNamespace

		beforeEach(() => {
			mockKV = createMockKV()
		})

		it('should return deviceId for valid token', async () => {
			// Arrange
			await mockKV.put('token:valid-token', 'device-123')

			// Act
			let deviceId = await validateToken(mockKV, 'valid-token')

			// Assert
			expect(deviceId).toBe('device-123')
		})

		it('should return null for invalid token', async () => {
			// Arrange
			await mockKV.put('token:valid-token', 'device-123')

			// Act
			let deviceId = await validateToken(mockKV, 'invalid-token')

			// Assert
			expect(deviceId).toBeNull()
		})

		it('should return null for non-existent token', async () => {
			// Arrange
			// No tokens in KV

			// Act
			let deviceId = await validateToken(mockKV, 'nonexistent')

			// Assert
			expect(deviceId).toBeNull()
		})

		it('should return null for empty token', async () => {
			// Arrange
			// No setup needed

			// Act
			let deviceId = await validateToken(mockKV, '')

			// Assert
			expect(deviceId).toBeNull()
		})

		it('should handle KV errors gracefully', async () => {
			// Arrange
			let errorKV = {
				get: async () => {
					throw new Error('KV error')
				},
			} as unknown as KVNamespace

			// Act
			let deviceId = await validateToken(errorKV, 'any-token')

			// Assert
			expect(deviceId).toBeNull()
		})
	})

	describe('authenticateRequest', () => {
		let mockKV: KVNamespace

		beforeEach(() => {
			mockKV = createMockKV()
		})

		it('should return deviceId for valid Bearer token', async () => {
			// Arrange
			await mockKV.put('token:valid-token', 'device-abc')
			let authHeader = 'Bearer valid-token'

			// Act
			let deviceId = await authenticateRequest(mockKV, authHeader)

			// Assert
			expect(deviceId).toBe('device-abc')
		})

		it('should throw error for missing Authorization header', async () => {
			// Arrange
			let authHeader = null

			// Act & Assert
			await expect(authenticateRequest(mockKV, authHeader)).rejects.toThrow(
				'Unauthorized',
			)
		})

		it('should throw error for invalid token format', async () => {
			// Arrange
			let authHeader = 'Basic invalid'

			// Act & Assert
			await expect(authenticateRequest(mockKV, authHeader)).rejects.toThrow(
				'Unauthorized',
			)
		})

		it('should throw error for non-existent token', async () => {
			// Arrange
			let authHeader = 'Bearer nonexistent-token'

			// Act & Assert
			await expect(authenticateRequest(mockKV, authHeader)).rejects.toThrow(
				'Unauthorized',
			)
		})

		it('should use token: prefix when looking up in KV', async () => {
			// Arrange
			await mockKV.put('token:my-token', 'device-xyz')
			let authHeader = 'Bearer my-token'

			// Act
			let deviceId = await authenticateRequest(mockKV, authHeader)

			// Assert
			expect(deviceId).toBe('device-xyz')
		})
	})
})
