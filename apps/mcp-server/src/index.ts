import { Hono } from 'hono'
import { z } from 'zod'
import {
	JSONRPC_ERROR_CODES,
	createErrorResponse,
	createSuccessResponse,
	isValidJSONRPCRequest,
} from './mcp/jsonrpc'
import {
	handleGetRandomStrategy,
	handleGetUserHistory,
	handleSearchStrategies,
} from './mcp/tools'

let ToolsCallParamsSchema = z.object({
	name: z.string(),
	arguments: z.unknown(),
})

let tools = [
	{
		name: 'get_random_strategy',
		description:
			'Get a random Oblique Strategy card, optionally filtered by category',
		inputSchema: {
			type: 'object',
			properties: {
				deviceId: {
					type: 'string',
					description: 'Device identifier for tracking history',
				},
				category: {
					type: 'string',
					description: 'Optional category to filter strategies',
				},
			},
			required: ['deviceId'],
		},
	},
	{
		name: 'get_user_history',
		description: 'Retrieve the viewing history for a user',
		inputSchema: {
			type: 'object',
			properties: {
				deviceId: {
					type: 'string',
					description: 'Device identifier to fetch history for',
				},
			},
			required: ['deviceId'],
		},
	},
	{
		name: 'search_strategies',
		description: 'Search for strategies by keyword or category',
		inputSchema: {
			type: 'object',
			properties: {
				keyword: {
					type: 'string',
					description: 'Search keyword to match in strategy text',
				},
				category: {
					type: 'string',
					description: 'Category to filter strategies by',
				},
			},
		},
	},
] as const

type Bindings = {
	KV: KVNamespace
}

let app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.text('Oblique Strategies MCP Server'))

app.post('/mcp', async (c) => {
	try {
		let body = await c.req.json()

		// Validate JSON-RPC request
		if (!isValidJSONRPCRequest(body)) {
			return c.json(
				createErrorResponse(
					body.id ?? null,
					JSONRPC_ERROR_CODES.INVALID_REQUEST,
					'Invalid Request',
				),
				400,
			)
		}

		// Handle tools/list
		if (body.method === 'tools/list') {
			return c.json(createSuccessResponse(body.id, { tools }))
		}

		// Handle tools/call
		if (body.method !== 'tools/call') {
			return c.json(
				createErrorResponse(
					body.id,
					JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
					'Method not found',
				),
				400,
			)
		}

		// Validate and parse params
		let paramsResult = ToolsCallParamsSchema.safeParse(body.params)
		if (!paramsResult.success) {
			return c.json(
				createErrorResponse(
					body.id,
					JSONRPC_ERROR_CODES.INVALID_PARAMS,
					'Invalid params',
				),
				400,
			)
		}

		let { name, arguments: args } = paramsResult.data
		let kv = c.env.KV

		// Route to tool handlers
		let result
		switch (name) {
			case 'get_random_strategy':
				result = await handleGetRandomStrategy(kv, args)
				break
			case 'get_user_history':
				result = await handleGetUserHistory(kv, args)
				break
			case 'search_strategies':
				result = await handleSearchStrategies(kv, args)
				break
			default:
				return c.json(
					createErrorResponse(
						body.id,
						JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
						`Unknown tool: ${name}`,
					),
					404,
				)
		}

		return c.json(createSuccessResponse(body.id, result))
	} catch (error) {
		return c.json(
			createErrorResponse(
				null,
				JSONRPC_ERROR_CODES.INTERNAL_ERROR,
				error instanceof Error ? error.message : 'Internal error',
			),
			400,
		)
	}
})

export default app
