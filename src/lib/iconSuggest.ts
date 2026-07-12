import { DEFAULT_EXPIRY_ICON, DEFAULT_LAST_TIME_ICON } from '@/lib/iconCatalog';

const KEYWORD_MAP: [RegExp, string][] = [
  [/milk/, '🥛'],
  [/bread|loaf|sourdough/, '🍞'],
  [/egg/, '🥚'],
  [/cheese/, '🧀'],
  [/spinach|lettuce|greens/, '🥬'],
  [/salad/, '🥗'],
  [/chicken|meat|thigh/, '🍗'],
  [/apple/, '🍎'],
  [/banana/, '🍌'],
  [/fish|salmon|tuna/, '🐟'],
  [/rice/, '🍚'],
  [/juice/, '🧃'],
  [/jar|sauce|jam|pickle/, '🫙'],
  [/butter|margarine/, '🧈'],
  [/honey/, '🍯'],
  [/nuts|almond|cashew|peanut/, '🥜'],
  [/chocolate|cocoa/, '🍫'],
  [/noodle|pasta|ramen/, '🍜'],
  [/coffee/, '☕'],
  [/wine|beer|alcohol/, '🍷'],
  [/paracetamol|tablet|pill|medicine|drug/, '💊'],
  [/bandage|plaster/, '🩹'],
  [/lotion|cream|shampoo|soap/, '🧴'],
  [/toothbrush|tooth/, '🪥'],
  [/thermometer|temperature/, '🌡️'],
  [/eye ?drop/, '💧'],
  [/injection|vaccine|syringe/, '💉'],
  [/mask/, '😷'],
  [/first aid/, '🩺'],
  [/water/, '💧'],
  [/bedsheet|sheets|mattress|bed/, '🛏️'],
  [/filter|ac\b|fan|vent/, '🌀'],
  [/tissue|toilet paper|napkin/, '🧻'],
  [/plant|water.*plant/, '🪴'],
  [/battery|batteries/, '🔋'],
  [/clean|vacuum|mop/, '🧹'],
  [/sponge|dish/, '🧽'],
  [/shower|drain/, '🚿'],
  [/candle/, '🕯️'],
  [/fire extinguisher|smoke alarm/, '🧯'],
  [/bulb|light/, '💡'],
  [/\bpet\b|\bdog\b|\bcat\b|litter/, '🐾'],
  [/laundry|detergent/, '🧺'],
  [/\bcar\b|oil change|tire/, '🚗'],
  [/keys?\b/, '🔑'],
];

export function suggestIcon(name: string, section: 'expiry' | 'lastTime'): string {
  const lower = name.toLowerCase();
  for (const [pattern, icon] of KEYWORD_MAP) {
    if (pattern.test(lower)) return icon;
  }
  return section === 'expiry' ? DEFAULT_EXPIRY_ICON : DEFAULT_LAST_TIME_ICON;
}
