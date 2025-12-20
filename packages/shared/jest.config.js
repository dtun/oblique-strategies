/** @type {import('jest').Config} */
module.exports = {
	displayName: '@oblique/shared',
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	testMatch: ['<rootDir>/src/**/*.test.ts'],
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
