/** @type {import('jest').Config} */
module.exports = {
	displayName: '@oblique/mcp-server',
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	testMatch: ['<rootDir>/src/**/*.test.ts'],

	// Path aliases for shared package
	moduleNameMapper: {
		'^@oblique/shared$': '<rootDir>/../../packages/shared/src/index.ts',
		'^@oblique/shared/pin$': '<rootDir>/../../packages/shared/src/utils/pin.ts',
		'^@oblique/shared/types$':
			'<rootDir>/../../packages/shared/src/types/index.ts',
		'^@oblique/shared/utils$':
			'<rootDir>/../../packages/shared/src/utils/index.ts',
		'^@oblique/shared/data$':
			'<rootDir>/../../packages/shared/src/data/strategies.ts',
		'^@oblique/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
		// Map .js extensions to .ts for ESM compatibility
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},

	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: {
					esModuleInterop: true,
					moduleResolution: 'node',
					types: ['@cloudflare/workers-types', 'jest'],
				},
			},
		],
	},
}
