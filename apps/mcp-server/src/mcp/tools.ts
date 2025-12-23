import { strategies } from '@oblique/shared'
import { addHistoryEntry, getUserHistory } from '../storage/history.js'
import {
	GetRandomStrategyParamsSchema,
	GetUserHistoryParamsSchema,
	SearchStrategiesParamsSchema,
	type MCPToolResponse,
} from './types.js'

function createSuccessResponse(data: unknown): MCPToolResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify(data),
			},
		],
		isError: false,
	}
}

function createErrorResponse(message: string): MCPToolResponse {
	return {
		content: [
			{
				type: 'text',
				text: message,
			},
		],
		isError: true,
	}
}

export async function handleGetRandomStrategy(
	kv: KVNamespace,
	params: unknown,
): Promise<MCPToolResponse> {
	// Validate params
	let parsed = GetRandomStrategyParamsSchema.parse(params)

	// Filter by category if specified
	let filtered = parsed.category
		? strategies.filter((s) => s.category === parsed.category)
		: strategies

	// Check if we have strategies
	if (filtered.length === 0) {
		return createErrorResponse(
			`No strategies found${parsed.category ? ` for category: ${parsed.category}` : ''}`,
		)
	}

	// Get random strategy
	let randomIndex = Math.floor(Math.random() * filtered.length)
	let strategy = filtered[randomIndex]

	// Add to history
	await addHistoryEntry(kv, parsed.deviceId, {
		strategyId: strategy.id,
		viewedAt: Date.now(),
		context: 'get_random_strategy',
	})

	// Return strategy
	return createSuccessResponse(strategy)
}

export async function handleGetUserHistory(
	kv: KVNamespace,
	params: unknown,
): Promise<MCPToolResponse> {
	let parsed = GetUserHistoryParamsSchema.parse(params)
	let history = await getUserHistory(kv, parsed.deviceId)
	return createSuccessResponse(history)
}

export async function handleSearchStrategies(
	kv: KVNamespace,
	params: unknown,
): Promise<MCPToolResponse> {
	let parsed = SearchStrategiesParamsSchema.parse(params)

	let results = strategies.filter((strategy) => {
		let matchesKeyword = parsed.keyword
			? strategy.text.toLowerCase().includes(parsed.keyword.toLowerCase())
			: true

		let matchesCategory = parsed.category
			? strategy.category === parsed.category
			: true

		return matchesKeyword && matchesCategory
	})

	return createSuccessResponse(results)
}
