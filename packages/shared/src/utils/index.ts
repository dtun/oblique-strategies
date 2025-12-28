/**
 * Generate a unique ID for a strategy or resource
 */
export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format a timestamp to ISO string
 */
export function formatTimestamp(timestamp: number): string {
	return new Date(timestamp).toISOString()
}

/**
 * Available strategy categories
 */
export let STRATEGY_CATEGORIES = [
	'creativity',
	'workflow',
	'perspective',
	'collaboration',
] as const

/**
 * Type representing a strategy category
 */
export type StrategyCategory = (typeof STRATEGY_CATEGORIES)[number]

/**
 * PIN utilities
 */
export { generatePin, validatePin, pinSchema } from './pin.js'
