import { Hono } from 'hono'
import type { Strategy, StrategyResponse } from '@oblique/shared'
import { generateId } from '@oblique/shared'

const app = new Hono()

app.get('/', (c) => {
	return c.json({
		message: 'Oblique Strategies MCP Server',
		version: '0.1.0',
	})
})

app.get('/health', (c) => {
	return c.json({ status: 'ok', timestamp: Date.now() })
})

app.get('/api/strategy/random', (c) => {
	const strategy: Strategy = {
		id: generateId(),
		text: 'Use an old idea',
		category: 'creativity',
	}

	const response: StrategyResponse = {
		data: strategy,
		timestamp: Date.now(),
	}

	return c.json(response)
})

export default app
