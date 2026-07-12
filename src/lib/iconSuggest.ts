import { DEFAULT_EXPIRY_ICON, DEFAULT_LAST_TIME_ICON } from '@/lib/iconCatalog';

const KEYWORD_MAP: [RegExp, string][] = [
  [/milk/, '🥛'],
  [/bread|loaf|sourdough/, '🍞'],
  [/egg/, '🥚'],
  [/cheese/, '🧀'],
  [/spinach|lettuce|greens|salad/, '🥬'],
  [/chicken|meat|thigh/, '🍗'],
  [/apple/, '🍎'],
  [/banana/, '🍌'],
  [/fish|salmon|tuna/, '🐟'],
  [/rice/, '🍚'],
  [/juice/, '🧃'],
  [/jar|sauce|jam|pickle/, '🫙'],
  [/paracetamol|tablet|pill|medicine|drug/, '💊'],
  [/bandage|plaster/, '🩹'],
  [/lotion|cream|shampoo|soap/, '🧴'],
  [/toothbrush|tooth/, '🪥'],
  [/thermometer|temperature/, '🌡️'],
  [/water/, '💧'],
  [/bedsheet|sheets|mattress|bed/, '🛏️'],
  [/filter|ac\b|fan|vent/, '🌀'],
  [/tissue|toilet paper|napkin/, '🧻'],
  [/plant|water.*plant/, '🪴'],
  [/battery|batteries/, '🔋'],
];

export function suggestIcon(name: string, section: 'expiry' | 'lastTime'): string {
  const lower = name.toLowerCase();
  for (const [pattern, icon] of KEYWORD_MAP) {
    if (pattern.test(lower)) return icon;
  }
  return section === 'expiry' ? DEFAULT_EXPIRY_ICON : DEFAULT_LAST_TIME_ICON;
}
