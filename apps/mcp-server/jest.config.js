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
		'^@oblique/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
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
