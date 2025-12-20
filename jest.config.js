/** @type {import('jest').Config} */
module.exports = {
	// TypeScript support
	preset: 'ts-jest',

	// Test environment
	testEnvironment: 'node',

	// Module resolution for path aliases
	moduleNameMapper: {
		'^@oblique/shared$': '<rootDir>/packages/shared/src/index.ts',
		'^@oblique/shared/(.*)$': '<rootDir>/packages/shared/src/$1',
	},

	// TypeScript transformation
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: {
					// Override tsconfig for tests
					esModuleInterop: true,
					moduleResolution: 'node', // Changed from 'bundler'
				},
			},
		],
	},

	// Coverage
	collectCoverageFrom: [
		'packages/*/src/**/*.{ts,tsx}',
		'apps/*/src/**/*.{ts,tsx}',
		'!**/*.d.ts',
		'!**/node_modules/**',
		'!**/dist/**',
	],

	// Test match patterns
	testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],

	// Ignore patterns
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/.expo/',
		'/.wrangler/',
	],

	// Workspace projects
	projects: [
		'<rootDir>/packages/shared',
		'<rootDir>/apps/mcp-server',
		'<rootDir>/apps/mobile',
	],
}
