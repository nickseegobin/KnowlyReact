/**
 * Caribbean-flavoured nickname generator.
 * Used during child onboarding — doesn't require Railway auth.
 * Format: [Adjective][CaribbeanNoun][Number]  e.g. "BoldConch42"
 */

const ADJECTIVES = [
  'Bold', 'Swift', 'Bright', 'Cool', 'Brave',
  'Sharp', 'Quick', 'Calm', 'Star', 'Flash',
  'Wild', 'Gold', 'Blue', 'Sun', 'Sky',
  'Wise', 'True', 'Keen', 'Ace', 'Prime',
]

const NOUNS = [
  'Conch', 'Pelican', 'Mango', 'Coral', 'Parrot',
  'Soca', 'Steelpan', 'Cocoa', 'Caimite', 'Sapodilla',
  'Flamingo', 'Tarpon', 'Ibis', 'Gecko', 'Toucan',
  'Dolphin', 'Hawksbill', 'Manatee', 'Macaw', 'Lionfish',
]

export function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = Math.floor(Math.random() * 90) + 10 // 10–99
  return `${adj}${noun}${num}`
}
