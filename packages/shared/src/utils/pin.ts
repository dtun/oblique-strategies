import { randomInt } from 'node:crypto'
import { z } from 'zod'

/**
 * Zod schema for validating 6-digit PINs.
 * Ensures the input is a string containing exactly 6 numeric digits (0-9).
 *
 * @example
 * ```typescript
 * pinSchema.parse('123456') // Valid
 * pinSchema.parse('000123') // Valid
 * pinSchema.parse('12345')  // Throws ZodError
 * ```
 */
export let pinSchema = z
	.string()
	.length(6, { message: 'PIN must be exactly 6 characters' })
	.regex(/^\d+$/, { message: 'PIN must contain only digits' })

/**
 * Generates a random 6-digit PIN using cryptographically secure random numbers.
 *
 * Uses Node.js's `crypto.randomInt()` for secure random number generation,
 * which is suitable for security-sensitive applications like PIN generation.
 *
 * @returns A 6-digit PIN as a string (with leading zeros if necessary)
 *
 * @example
 * ```typescript
 * generatePin() // Returns something like "042851" or "999123"
 * ```
 */
export function generatePin(): string {
	// Generate a random number between 0 and 999999 (inclusive on lower bound, exclusive on upper)
	let randomNumber = randomInt(0, 1000000)
	// Pad with leading zeros to ensure exactly 6 digits
	return randomNumber.toString().padStart(6, '0')
}

/**
 * Validates that a PIN is exactly 6 digits using the Zod schema.
 *
 * This function uses `safeParse()` to validate without throwing errors,
 * making it safe to use with untrusted input.
 *
 * @param pin - The PIN string to validate
 * @returns `true` if the PIN is exactly 6 digits, `false` otherwise
 *
 * @example
 * ```typescript
 * validatePin('123456') // true
 * validatePin('000123') // true
 * validatePin('12345')  // false (too short)
 * validatePin('abc123') // false (contains non-digits)
 * ```
 */
export function validatePin(pin: string): boolean {
	return pinSchema.safeParse(pin).success
}
