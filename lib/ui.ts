/**
 * Shared Tailwind class tokens for the dark theme. These strings were copy-pasted
 * across many pages; centralising them keeps the look consistent and makes a
 * future restyle a one-file change. Adopt incrementally — see docs/UI-IMPROVEMENTS.md.
 */

/** Standard interactive content card. */
export const CARD_CLASS =
  'bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors'

/** Form text input / select. */
export const INPUT_CLASS =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/** Small muted form label. */
export const LABEL_CLASS = 'block text-xs text-gray-400 mb-1'
