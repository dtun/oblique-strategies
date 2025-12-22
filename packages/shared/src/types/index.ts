/**
 * Represents a single Oblique Strategy card
 */
export interface Strategy {
	id: string
	text: string
	category?: string
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
	data: T
	error?: string
	timestamp: number
}

/**
 * Response type for a single strategy
 */
export type StrategyResponse = ApiResponse<Strategy>

/**
 * Response type for multiple strategies
 */
export type StrategiesResponse = ApiResponse<Strategy[]>

/**
 * Represents user's viewing history for strategies
 */
export interface UserHistory {
	strategyId: string
	viewedAt: number
	context?: string
}

/**
 * Represents an MCP (Model Context Protocol) registration
 */
export interface MCPRegistration {
	pin: string
	deviceId: string
	timestamp: number
}
