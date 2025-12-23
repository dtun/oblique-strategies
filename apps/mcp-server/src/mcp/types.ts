import { z } from 'zod'

// MCP Tool Response format
export interface MCPToolResponse {
	content: Array<{
		type: 'text'
		text: string
	}>
	isError: boolean
}

// Tool parameter schemas
export let GetRandomStrategyParamsSchema = z.object({
	deviceId: z.string().min(1),
	category: z.string().optional(),
})

export let GetUserHistoryParamsSchema = z.object({
	deviceId: z.string().min(1),
})

export let SearchStrategiesParamsSchema = z
	.object({
		keyword: z.string().optional(),
		category: z.string().optional(),
	})
	.refine((data) => data.keyword || data.category, {
		message: 'At least one of keyword or category must be provided',
	})

export type GetRandomStrategyParams = z.infer<
	typeof GetRandomStrategyParamsSchema
>
export type GetUserHistoryParams = z.infer<typeof GetUserHistoryParamsSchema>
export type SearchStrategiesParams = z.infer<
	typeof SearchStrategiesParamsSchema
>
