/**
 * Server-Sent Events (SSE) utilities for MCP server
 */

import { JSONRPCResponse } from './jsonrpc.js'

let SSE_HEADERS = {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
} as const

/**
 * Format JSON-RPC response as SSE message
 * @param response - The JSON-RPC response to format
 * @returns SSE formatted message string
 */
export function formatSSEMessage(response: JSONRPCResponse): string {
	return `data: ${JSON.stringify(response)}\n\n`
}

/**
 * Create ReadableStream that sends one SSE message and closes
 * @param response - The JSON-RPC response to stream
 * @returns ReadableStream with SSE formatted message
 */
export function createSSEStream(
	response: JSONRPCResponse,
): ReadableStream<Uint8Array> {
	let encoder = new TextEncoder()
	let message = formatSSEMessage(response)

	return new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(message))
			controller.close()
		},
	})
}

/**
 * Create HTTP Response with SSE headers and stream
 * @param response - The JSON-RPC response to send
 * @returns Response object with SSE stream
 */
export function createSSEResponse(response: JSONRPCResponse): Response {
	let stream = createSSEStream(response)
	return new Response(stream, { headers: SSE_HEADERS })
}
