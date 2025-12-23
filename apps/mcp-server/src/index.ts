import { Hono } from 'hono'

type Bindings = {
	KV: KVNamespace
}

let app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.text('Oblique Strategies MCP Server'))

export default app
