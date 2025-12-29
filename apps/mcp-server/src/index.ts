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
import { validatePin } from '@oblique/shared'
import { authenticateRequest, AuthenticationError } from './mcp/auth'
import { createSSEResponse } from './mcp/sse'

let ToolsCallParamsSchema = z.object({
	name: z.string(),
	arguments: z.unknown(),
})

let registerSchema = z.object({
	pin: z.string(),
	deviceId: z.string().min(1),
})

let authSchema = z.object({
	pin: z.string(),
})

type RegisterRequest = z.infer<typeof registerSchema>
type RegisterResponse = { success: true } | { error: string }
type AuthRequest = z.infer<typeof authSchema>
type AuthErrorResponse = { error: string }

const PIN_TTL_SECONDS = 300 // 5 minutes
const PIN_KEY_PREFIX = 'pin:'
const TOKEN_KEY_PREFIX = 'token:'

function generateAuthFormHTML(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Oblique Strategies - Authenticate Device</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20px;
		}
		.container {
			background: white;
			padding: 40px;
			border-radius: 12px;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
			max-width: 400px;
			width: 100%;
		}
		h1 {
			color: #333;
			margin-bottom: 10px;
			font-size: 24px;
		}
		p {
			color: #666;
			margin-bottom: 30px;
			font-size: 14px;
		}
		label {
			display: block;
			color: #333;
			font-weight: 500;
			margin-bottom: 8px;
			font-size: 14px;
		}
		input[type="text"] {
			width: 100%;
			padding: 12px 16px;
			border: 2px solid #e0e0e0;
			border-radius: 8px;
			font-size: 18px;
			letter-spacing: 2px;
			text-align: center;
			transition: border-color 0.3s;
			font-family: 'Courier New', monospace;
		}
		input[type="text"]:focus {
			outline: none;
			border-color: #667eea;
		}
		button {
			width: 100%;
			padding: 14px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			border: none;
			border-radius: 8px;
			font-size: 16px;
			font-weight: 600;
			cursor: pointer;
			margin-top: 20px;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		button:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
		}
		button:active {
			transform: translateY(0);
		}
		.hint {
			margin-top: 12px;
			font-size: 12px;
			color: #999;
			text-align: center;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Authenticate Device</h1>
		<p>Enter your 6-digit PIN to get your authentication token</p>
		<form method="POST" action="/auth">
			<label for="pin">6-Digit PIN</label>
			<input
				type="text"
				id="pin"
				name="pin"
				pattern="[0-9]{6}"
				required
				maxlength="6"
				placeholder="000000"
				autocomplete="off"
			>
			<div class="hint">Enter the PIN you received from your device</div>
			<button type="submit">Authenticate</button>
		</form>
	</div>
</body>
</html>`
}

function generateSuccessHTML(token: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Authentication Successful - Oblique Strategies</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			min-height: 100vh;
			padding: 20px;
		}
		.container {
			max-width: 800px;
			margin: 40px auto;
			background: white;
			padding: 40px;
			border-radius: 12px;
			box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		}
		h1 {
			color: #22c55e;
			margin-bottom: 10px;
			font-size: 28px;
			display: flex;
			align-items: center;
			gap: 10px;
		}
		h1::before {
			content: "✓";
			display: inline-block;
			width: 36px;
			height: 36px;
			background: #22c55e;
			color: white;
			border-radius: 50%;
			text-align: center;
			line-height: 36px;
		}
		h2 {
			color: #333;
			margin-top: 30px;
			margin-bottom: 15px;
			font-size: 20px;
		}
		p {
			color: #666;
			margin-bottom: 20px;
			line-height: 1.6;
		}
		.token-container {
			background: #f8f9fa;
			padding: 20px;
			border-radius: 8px;
			margin: 20px 0;
			border: 2px solid #e0e0e0;
		}
		.token-label {
			font-size: 12px;
			color: #666;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 8px;
		}
		.token-display {
			display: flex;
			align-items: center;
			gap: 10px;
		}
		.token-value {
			flex: 1;
			font-family: 'Courier New', monospace;
			font-size: 16px;
			color: #333;
			word-break: break-all;
			padding: 12px;
			background: white;
			border-radius: 6px;
			border: 1px solid #ddd;
		}
		.copy-button {
			padding: 12px 24px;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			border: none;
			border-radius: 6px;
			font-size: 14px;
			font-weight: 600;
			cursor: pointer;
			transition: transform 0.2s, box-shadow 0.2s;
			white-space: nowrap;
		}
		.copy-button:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
		}
		.copy-button:active {
			transform: translateY(0);
		}
		.config-example {
			background: #1e293b;
			color: #e2e8f0;
			padding: 20px;
			border-radius: 8px;
			overflow-x: auto;
			font-family: 'Courier New', monospace;
			font-size: 14px;
			line-height: 1.6;
		}
		.config-example pre {
			margin: 0;
		}
		.key {
			color: #7dd3fc;
		}
		.string {
			color: #86efac;
		}
		.note {
			background: #fef3c7;
			border-left: 4px solid #f59e0b;
			padding: 15px;
			margin: 20px 0;
			border-radius: 4px;
		}
		.note p {
			color: #92400e;
			margin: 0;
			font-size: 14px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Device Authenticated Successfully</h1>
		<p>Your device has been authenticated. Use the token below to configure your Claude MCP client.</p>

		<div class="token-container">
			<div class="token-label">Your Authentication Token</div>
			<div class="token-display">
				<code class="token-value" id="token">${token}</code>
				<button class="copy-button" onclick="copyToken()">Copy</button>
			</div>
		</div>

		<div class="note">
			<p><strong>Important:</strong> Keep this token secure. Anyone with this token can access your Oblique Strategies history and data.</p>
		</div>

		<h2>MCP Client Configuration</h2>
		<p>Add this configuration to your Claude Desktop or MCP client settings:</p>

		<div class="config-example">
<pre>{
  <span class="key">"mcpServers"</span>: {
    <span class="key">"oblique-strategies"</span>: {
      <span class="key">"url"</span>: <span class="string">"https://your-worker-url.workers.dev/mcp"</span>,
      <span class="key">"headers"</span>: {
        <span class="key">"Authorization"</span>: <span class="string">"Bearer ${token}"</span>
      }
    }
  }
}</pre>
		</div>

		<p style="margin-top: 20px; font-size: 14px; color: #999;">
			Replace <code>your-worker-url.workers.dev</code> with your actual Cloudflare Workers URL.
		</p>
	</div>

	<script>
		function copyToken() {
			const tokenElement = document.getElementById('token');
			const token = tokenElement.textContent;
			navigator.clipboard.writeText(token).then(() => {
				const button = event.target;
				const originalText = button.textContent;
				button.textContent = 'Copied!';
				button.style.background = '#22c55e';
				setTimeout(() => {
					button.textContent = originalText;
					button.style.background = '';
				}, 2000);
			}).catch(err => {
				alert('Failed to copy token. Please copy it manually.');
			});
		}
	</script>
</body>
</html>`
}

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
		// STEP 1: Authenticate request
		let authHeader = c.req.header('Authorization') ?? null
		let deviceId: string
		try {
			deviceId = await authenticateRequest(c.env.KV, authHeader)
		} catch (error) {
			if (error instanceof AuthenticationError) {
				return c.json({ error: 'Unauthorized' }, 401)
			}
			throw error
		}

		// STEP 2: Parse and validate JSON-RPC request
		let body = await c.req.json()
		if (!isValidJSONRPCRequest(body)) {
			let errorResponse = createErrorResponse(
				body.id ?? null,
				JSONRPC_ERROR_CODES.INVALID_REQUEST,
				'Invalid Request',
			)
			return createSSEResponse(errorResponse)
		}

		// STEP 3: Handle initialize
		if (body.method === 'initialize') {
			let successResponse = createSuccessResponse(body.id, {
				protocolVersion: '2024-11-05',
				capabilities: {
					tools: {},
				},
				serverInfo: {
					name: 'oblique-strategies',
					version: '1.0.0',
				},
			})
			return createSSEResponse(successResponse)
		}

		// STEP 4: Handle notifications/initialized (acknowledge with empty SSE)
		if (body.method === 'notifications/initialized') {
			return new Response('', { status: 200 })
		}

		// STEP 5: Handle tools/list
		if (body.method === 'tools/list') {
			let successResponse = createSuccessResponse(body.id, { tools })
			return createSSEResponse(successResponse)
		}

		// STEP 6: Handle tools/call
		if (body.method !== 'tools/call') {
			let errorResponse = createErrorResponse(
				body.id,
				JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
				'Method not found',
			)
			return createSSEResponse(errorResponse)
		}

		// STEP 7: Validate params
		let paramsResult = ToolsCallParamsSchema.safeParse(body.params)
		if (!paramsResult.success) {
			let errorResponse = createErrorResponse(
				body.id,
				JSONRPC_ERROR_CODES.INVALID_PARAMS,
				'Invalid params',
			)
			return createSSEResponse(errorResponse)
		}

		// STEP 8: Execute tool with deviceId from token
		let { name, arguments: args } = paramsResult.data
		let argsWithDeviceId =
			typeof args === 'object' && args !== null
				? { ...args, deviceId }
				: { deviceId }
		let kv = c.env.KV

		// Route to tool handlers
		let result
		switch (name) {
			case 'get_random_strategy':
				result = await handleGetRandomStrategy(kv, argsWithDeviceId)
				break
			case 'get_user_history':
				result = await handleGetUserHistory(kv, argsWithDeviceId)
				break
			case 'search_strategies':
				result = await handleSearchStrategies(kv, argsWithDeviceId)
				break
			default: {
				let errorResponse = createErrorResponse(
					body.id,
					JSONRPC_ERROR_CODES.METHOD_NOT_FOUND,
					`Unknown tool: ${name}`,
				)
				return createSSEResponse(errorResponse)
			}
		}

		// STEP 9: Return success via SSE
		let successResponse = createSuccessResponse(body.id, result)
		return createSSEResponse(successResponse)
	} catch (error) {
		let errorResponse = createErrorResponse(
			null,
			JSONRPC_ERROR_CODES.INTERNAL_ERROR,
			error instanceof Error ? error.message : 'Internal error',
		)
		return createSSEResponse(errorResponse)
	}
})

app.post('/register', async (c) => {
	try {
		// Parse and validate request body
		let body = await c.req.json()
		let parsed = registerSchema.safeParse(body)

		if (!parsed.success) {
			return c.json<RegisterResponse>({ error: 'Invalid request body' }, 400)
		}

		let { pin, deviceId } = parsed.data

		// Validate PIN format
		if (!validatePin(pin)) {
			return c.json<RegisterResponse>(
				{ error: 'PIN must be exactly 6 digits' },
				400,
			)
		}

		// Store in KV with TTL expiration
		await c.env.KV.put(`${PIN_KEY_PREFIX}${pin}`, deviceId, {
			expirationTtl: PIN_TTL_SECONDS,
		})

		return c.json<RegisterResponse>({ success: true })
	} catch (error) {
		return c.json<RegisterResponse>(
			{ error: error instanceof Error ? error.message : 'Internal error' },
			400,
		)
	}
})

// GET /auth - Serve HTML form for PIN entry
app.get('/auth', async (c) => {
	return c.html(generateAuthFormHTML())
})

// POST /auth - Handle PIN to token exchange
app.post('/auth', async (c) => {
	try {
		// Parse and validate request body
		let body = await c.req.json()
		let parsed = authSchema.safeParse(body)

		if (!parsed.success) {
			return c.json<AuthErrorResponse>({ error: 'Invalid request body' }, 400)
		}

		let { pin } = parsed.data

		// Validate PIN format
		if (!validatePin(pin)) {
			return c.json<AuthErrorResponse>(
				{ error: 'PIN must be exactly 6 digits' },
				400,
			)
		}

		// Check if PIN exists in KV
		let deviceId = await c.env.KV.get(`${PIN_KEY_PREFIX}${pin}`)
		if (!deviceId) {
			return c.json<AuthErrorResponse>(
				{ error: 'PIN not found or expired' },
				404,
			)
		}

		// Generate token using crypto.randomUUID()
		let token = crypto.randomUUID()

		// Store token in KV with no expiration
		await c.env.KV.put(`${TOKEN_KEY_PREFIX}${token}`, deviceId)

		// Delete PIN from KV (one-time use)
		await c.env.KV.delete(`${PIN_KEY_PREFIX}${pin}`)

		// Return success HTML page
		return c.html(generateSuccessHTML(token))
	} catch (error) {
		return c.json<AuthErrorResponse>(
			{ error: error instanceof Error ? error.message : 'Internal error' },
			400,
		)
	}
})

export default app
