import { generatePin, validatePin } from './pin'

describe('generatePin', () => {
	it('should return a string', () => {
		let pin = generatePin()
		expect(typeof pin).toBe('string')
	})

	it('should return exactly 6 characters', () => {
		let pin = generatePin()
		expect(pin).toHaveLength(6)
	})

	it('should contain only numeric digits (0-9)', () => {
		let pin = generatePin()
		expect(pin).toMatch(/^\d{6}$/)
	})

	it('should generate different PINs on multiple calls', () => {
		let pins = new Set()
		// Generate 100 PINs - highly unlikely to get duplicates
		for (let i = 0; i < 100; i++) {
			pins.add(generatePin())
		}
		// We expect at least 95 unique PINs out of 100
		expect(pins.size).toBeGreaterThan(95)
	})

	it('should potentially generate PIN with leading zeros', () => {
		// Generate many PINs and check if at least one starts with '0'
		// This is probabilistic but with 1000 tries, highly likely
		let pins: string[] = []
		for (let i = 0; i < 1000; i++) {
			pins.push(generatePin())
		}
		let hasLeadingZero = pins.some((pin) => pin.startsWith('0'))
		expect(hasLeadingZero).toBe(true)
	})
})

describe('validatePin', () => {
	it('should return true for valid 6-digit PIN', () => {
		expect(validatePin('123456')).toBe(true)
	})

	it('should return true for PIN with leading zeros', () => {
		expect(validatePin('000123')).toBe(true)
	})

	it('should return true for all zeros', () => {
		expect(validatePin('000000')).toBe(true)
	})

	it('should return false for PIN shorter than 6 digits', () => {
		expect(validatePin('12345')).toBe(false)
	})

	it('should return false for PIN longer than 6 digits', () => {
		expect(validatePin('1234567')).toBe(false)
	})

	it('should return false for PIN with non-numeric characters', () => {
		expect(validatePin('12345a')).toBe(false)
	})

	it('should return false for PIN with special characters', () => {
		expect(validatePin('12-456')).toBe(false)
	})

	it('should return false for PIN with spaces', () => {
		expect(validatePin('123 456')).toBe(false)
	})

	it('should return false for empty string', () => {
		expect(validatePin('')).toBe(false)
	})

	it('should handle non-string inputs gracefully', () => {
		// @ts-expect-error - Testing runtime behavior with invalid input
		expect(validatePin(null)).toBe(false)
		// @ts-expect-error - Testing runtime behavior with invalid input
		expect(validatePin(undefined)).toBe(false)
		// @ts-expect-error - Testing runtime behavior with invalid input
		expect(validatePin(123456)).toBe(false)
	})
})
