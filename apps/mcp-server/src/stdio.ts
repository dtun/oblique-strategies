#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './stdio-impl.js'

export async function startServer() {
	let server = createServer()
	let transport = new StdioServerTransport()
	await server.connect(transport)
}

startServer().catch(console.error)
