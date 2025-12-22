import type { Strategy } from '../types'

export let strategies: Strategy[] = [
	{ id: '1', text: 'Use an old idea', category: 'Reframing' },
	{
		id: '2',
		text: 'State the problem in words as clearly as possible',
		category: 'Clarity',
	},
	{
		id: '3',
		text: 'Honor thy error as a hidden intention',
		category: 'Acceptance',
	},
	{ id: '4', text: 'Only one element of each kind', category: 'Constraints' },
	{
		id: '5',
		text: 'What would your closest friend do?',
		category: 'Perspective',
	},
	{ id: '6', text: 'Simple subtraction', category: 'Action' },
	{
		id: '7',
		text: 'Are there sections? Consider transitions',
		category: 'Clarity',
	},
	{ id: '8', text: 'Turn it upside down', category: 'Reframing' },
	{ id: '9', text: 'Do the washing up', category: 'Action' },
	{
		id: '10',
		text: 'Listen to the quiet voice',
		category: 'Perspective',
	},
]

export const STRATEGY_COUNT = strategies.length
