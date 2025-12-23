import { z } from 'zod'

// JSON-RPC 2.0 Error Codes
export let JSONRPC_ERROR_CODES = {
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603,
} as const

export interface JSONRPCRequest {
	jsonrpc: '2.0'
	id: number | string
	method: string
	params?: unknown
}

export interface JSONRPCResponse<T = unknown> {
	jsonrpc: '2.0'
	id: number | string | null
	result?: T
	error?: JSONRPCError
}

export interface JSONRPCError {
	code: number
	message: string
}

let JSONRPCRequestSchema = z.object({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.number(), z.string()]),
	method: z.string(),
	params: z.unknown().optional(),
})

export function createSuccessResponse<T>(
	id: number | string | null,
	result: T,
): JSONRPCResponse<T> {
	return {
		jsonrpc: '2.0',
		id,
		result,
	}
}

export function createErrorResponse(
	id: number | string | null,
	code: number,
	message: string,
): JSONRPCResponse {
	return {
		jsonrpc: '2.0',
		id,
		error: {
			code,
			message,
		},
	}
}

export function isValidJSONRPCRequest(req: unknown): req is JSONRPCRequest {
	return JSONRPCRequestSchema.safeParse(req).success
}
