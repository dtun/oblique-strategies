import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { createMockKV } from './storage/mock-kv'
import {
	handleGetRandomStrategy,
	handleGetUserHistory,
	handleSearchStrategies,
} from './mcp/tools'

let TOOL_DEFINITIONS = [
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

export function createServer() {
	let kv = createMockKV()

	let server = new Server(
		{
			name: 'oblique-strategies',
			version: '1.0.0',
		},
		{
			capabilities: {
				tools: {},
			},
		},
	)

	// Register tools/list handler
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: TOOL_DEFINITIONS,
		}
	})

	// Register tools/call handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		let { name, arguments: args } = request.params

		let result
		try {
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
					throw new Error(`Unknown tool: ${name}`)
			}

			if (result.isError) {
				throw new Error(result.content[0].text)
			}

			return {
				content: result.content,
			}
		} catch (error) {
			throw new Error(error instanceof Error ? error.message : 'Unknown error')
		}
	})

	return server
}
