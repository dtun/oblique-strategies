import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { createMockKV } from './storage/mock-kv'
import {
	handleGetRandomStrategy,
	handleGetUserHistory,
	handleSearchStrategies,
} from './mcp/tools'
import { createServer } from './stdio-impl'

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js')
jest.mock('./storage/mock-kv')
jest.mock('./mcp/tools')

describe('Stdio MCP Server', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('Server initialization', () => {
		it('should create server with correct name and version', () => {
			createServer()

			expect(Server).toHaveBeenCalledWith(
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
		})
	})

	describe('Tools registration', () => {
		it('should register ListTools handler', () => {
			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2)
			expect(mockServer.setRequestHandler).toHaveBeenNthCalledWith(
				1,
				expect.anything(),
				expect.any(Function),
			)
		})

		it('should register CallTool handler', () => {
			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2)
			expect(mockServer.setRequestHandler).toHaveBeenNthCalledWith(
				2,
				expect.anything(),
				expect.any(Function),
			)
		})

		it('should list all three tools', async () => {
			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let listToolsHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[0][1]
			let result = await listToolsHandler()

			expect(result.tools).toHaveLength(3)
			expect(result.tools.map((t: any) => t.name)).toEqual([
				'get_random_strategy',
				'get_user_history',
				'search_strategies',
			])
		})

		it('should include proper tool schemas', async () => {
			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let listToolsHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[0][1]
			let result = await listToolsHandler()

			let randomStrategyTool = result.tools.find(
				(t: any) => t.name === 'get_random_strategy',
			)
			expect(randomStrategyTool.inputSchema.properties.deviceId).toBeDefined()
			expect(randomStrategyTool.inputSchema.required).toContain('deviceId')
		})
	})

	describe('Tool execution', () => {
		beforeEach(() => {
			;(createMockKV as jest.Mock).mockReturnValue({} as KVNamespace)
		})

		it('should call handleGetRandomStrategy for get_random_strategy tool', async () => {
			;(handleGetRandomStrategy as jest.Mock).mockResolvedValue({
				content: [{ type: 'text', text: 'test' }],
				isError: false,
			})

			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let callToolHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[1][1]
			await callToolHandler({
				params: {
					name: 'get_random_strategy',
					arguments: { deviceId: 'test123' },
				},
			})

			expect(handleGetRandomStrategy).toHaveBeenCalled()
		})

		it('should call handleGetUserHistory for get_user_history tool', async () => {
			;(handleGetUserHistory as jest.Mock).mockResolvedValue({
				content: [{ type: 'text', text: '[]' }],
				isError: false,
			})

			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let callToolHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[1][1]
			await callToolHandler({
				params: {
					name: 'get_user_history',
					arguments: { deviceId: 'test123' },
				},
			})

			expect(handleGetUserHistory).toHaveBeenCalled()
		})

		it('should call handleSearchStrategies for search_strategies tool', async () => {
			;(handleSearchStrategies as jest.Mock).mockResolvedValue({
				content: [{ type: 'text', text: '[]' }],
				isError: false,
			})

			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let callToolHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[1][1]
			await callToolHandler({
				params: {
					name: 'search_strategies',
					arguments: { keyword: 'test' },
				},
			})

			expect(handleSearchStrategies).toHaveBeenCalled()
		})

		it('should throw error for unknown tool', async () => {
			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let callToolHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[1][1]

			await expect(
				callToolHandler({
					params: {
						name: 'unknown_tool',
						arguments: {},
					},
				}),
			).rejects.toThrow('Unknown tool: unknown_tool')
		})

		it('should handle tool errors', async () => {
			;(handleGetRandomStrategy as jest.Mock).mockResolvedValue({
				content: [{ type: 'text', text: 'Error message' }],
				isError: true,
			})

			let mockServer = {
				setRequestHandler: jest.fn(),
			}
			;(Server as jest.Mock).mockReturnValue(mockServer)

			createServer()

			let callToolHandler = (mockServer.setRequestHandler as jest.Mock).mock
				.calls[1][1]

			await expect(
				callToolHandler({
					params: {
						name: 'get_random_strategy',
						arguments: { deviceId: 'test123' },
					},
				}),
			).rejects.toThrow('Error message')
		})
	})
})
