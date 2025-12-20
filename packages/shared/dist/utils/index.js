/**
 * Generate a unique ID for a strategy or resource
 */
export const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
/**
 * Format a timestamp to ISO string
 */
export const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toISOString();
};
/**
 * Available strategy categories
 */
export const STRATEGY_CATEGORIES = [
    'creativity',
    'workflow',
    'perspective',
    'collaboration',
];
//# sourceMappingURL=index.js.map