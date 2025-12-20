/** @type {import('jest').Config} */
module.exports = {
	displayName: '@oblique/mobile',
	preset: 'jest-expo',
	rootDir: '.',
	testMatch: ['<rootDir>/**/*.test.tsx', '<rootDir>/**/*.test.ts'],

	// Path aliases for shared package
	moduleNameMapper: {
		'^@oblique/shared$': '<rootDir>/../../packages/shared/src/index.ts',
		'^@oblique/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
	},

	transformIgnorePatterns: [
		'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
	],
}
