/**
 * Shared category-to-emoji mapping.
 * Covers all known DB values and common aliases from the MonuTell database.
 *
 * The DB `category` column may contain any of these strings (stored as-is).
 * All comparisons are done lowercase.
 */
export const CATEGORY_EMOJI = {
  // Statues & sculptures
  statue:          "🗿",
  "mini-statue":   "🗿",
  "mini_statue":   "🗿",
  ministatue:      "🗿",
  sculpture:       "🗿",
  bust:            "🗿",

  // Monuments & memorials
  monument:        "🗽",
  memorial:        "🗽",
  emlekmű:         "🗽",

  // Castles & fortifications
  castle:          "🏰",
  fortress:        "🏰",
  fort:            "🏰",
  citadel:         "🏰",
  citadella:       "🏰",
  palace:          "🏰",

  // Churches & religious
  church:          "⛪",
  basilica:        "⛪",
  cathedral:       "⛪",
  religious:       "⛪",
  chapel:          "⛪",
  synagogue:       "⛪",
  mosque:          "⛪",

  // Museums & cultural
  museum:          "🏛️",
  opera:           "🎭",
  theatre:         "🎭",
  theater:         "🎭",
  gallery:         "🏛️",
  exhibition:      "🏛️",
  cultural:        "🏛️",

  // Bridges
  bridge:          "🌉",

  // Parks & nature
  park:            "🌳",
  garden:          "🌳",
  nature:          "🌳",

  // Markets & squares
  market:          "🏪",
  square:          "🏛️",
  plaza:           "🏛️",

  // Generic landmarks
  landmark:        "📍",
  building:        "🏗️",
  historical:      "📍",

  // Default fallback
  default:         "📍",
};

/**
 * Returns the emoji for a given monument category string.
 * Case-insensitive, handles null/undefined gracefully.
 */
export function getCategoryEmoji(category) {
  if (!category) return CATEGORY_EMOJI.default;
  return CATEGORY_EMOJI[category.toLowerCase().trim()] ?? CATEGORY_EMOJI.default;
}
