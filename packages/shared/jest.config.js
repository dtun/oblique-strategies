/** @type {import('jest').Config} */
module.exports = {
	displayName: '@oblique/shared',
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	testMatch: ['<rootDir>/src/**/*.test.ts'],
	moduleNameMapper: {
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
				},
			},
		],
	},
}
