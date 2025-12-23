import { Hono } from 'hono'

type Bindings = {
	KV: KVNamespace
}

let app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.text('Oblique Strategies MCP Server'))

app.post('/mcp', async (c) => {
	return c.json({ message: 'MCP endpoint - tools coming next' })
})

export default app
