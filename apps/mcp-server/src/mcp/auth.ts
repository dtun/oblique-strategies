/**
 * Authentication utilities for MCP server
 */

/**
 * Custom error class for authentication failures
 */
export class AuthenticationError extends Error {
	constructor(message: string = 'Unauthorized') {
		super(message)
		this.name = 'AuthenticationError'
	}
}

/**
 * Extract Bearer token from Authorization header
 * @param authHeader - The Authorization header value
 * @returns The token string or null if invalid
 */
export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null
	}
	return authHeader.slice(7).trim()
}

/**
 * Validate token against KV store and return deviceId
 * @param kv - KV namespace for token storage
 * @param token - The token to validate
 * @returns The deviceId if valid, null otherwise
 */
export async function validateToken(
	kv: KVNamespace,
	token: string,
): Promise<string | null> {
	if (!token) {
		return null
	}

	try {
		return await kv.get(`token:${token}`)
	} catch {
		return null
	}
}

/**
 * Authenticate request and return deviceId
 * Throws AuthenticationError if authentication fails
 * @param kv - KV namespace for token storage
 * @param authHeader - The Authorization header value
 * @returns The deviceId for authenticated user
 */
export async function authenticateRequest(
	kv: KVNamespace,
	authHeader: string | null,
): Promise<string> {
	let token = extractBearerToken(authHeader)
	if (!token) {
		throw new AuthenticationError()
	}

	let deviceId = await validateToken(kv, token)
	if (!deviceId) {
		throw new AuthenticationError()
	}

	return deviceId
}
