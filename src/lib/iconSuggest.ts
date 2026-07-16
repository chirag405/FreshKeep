import { ICON_CATEGORIES, DEFAULT_EXPIRY_ICON, DEFAULT_LAST_TIME_ICON } from './iconCatalog';

/**
 * One representative icon per category — used when the typed name doesn't
 * exactly match a curated icon label, so we don't need to keep an
 * ever-growing exact keyword→icon map. Getting the category right (e.g.
 * "this is food") is usually good enough; the user can still pick an exact
 * icon manually via Choose Icon.
 */
const CATEGORY_ICON: Record<string, string> = {
  'Produce': '🥦',
  'Dairy & eggs': '🥛',
  'Meat & seafood': '🍗',
  'Bakery': '🍞',
  'Pantry': '🥫',
  'Beverages': '☕',
  'Frozen & snacks': '🧊',
  'Medicine & health': '💊',
  'Personal care': '🧴',
  'Baby & kids': '🍼',
  'Home & chores': '🧹',
  'Kitchen': '🍽️',
  'Garden & outdoors': '🌱',
  'Pets': '🐾',
  'Car & garage': '🚗',
  'Tech & office': '🔌',
  'Other': '📦',
};

const CATEGORY_KEYWORDS: [string, RegExp][] = [
  ['Dairy & eggs', /milk|cheese|yog(h)?urt|butter|\begg/],
  ['Produce', /fruit|veg(etable)?s?|produce|greens?|\bsalad\b|apple|banana|tomato|onion|potato|carrot|berry|berries/],
  ['Meat & seafood', /meat|chicken|beef|pork|mutton|fish|seafood|shrimp|prawn|bacon|sausage/],
  ['Bakery', /bread|bakery|baked|cake\b|pastry|bagel|croissant|cookie/],
  ['Beverages', /drink|beverage|juice|soda|coffee|\btea\b|wine|beer/],
  ['Frozen & snacks', /frozen|snack|chips|ice ?cream/],
  ['Pantry', /pantry|grocer(y|ies)|\brice\b|pasta|noodle|sauce|spice|\boil\b|grain|nuts?\b|honey|jam\b|pickle|cereal/],
  ['Medicine & health', /medic(ine|ation)|health|\bpill\b|tablet|\bdrug\b|vitamin|supplement|bandage|antiseptic|syrup|paracetamol/],
  ['Personal care', /\bcare\b|cosmetic|hygiene|skincare|shampoo|\bsoap\b|lotion|toothpaste|toothbrush|razor|deodorant/],
  ['Baby & kids', /\bbaby\b|infant|diaper|\bkids?\b/],
  ['Home & chores', /clean(ing)?|\bchore\b|house(hold)?|filter|laundry|detergent|\bsheets?\b|mattress|vacuum|\bmop\b|bulb/],
  ['Kitchen', /kitchen|\bdish(es)?\b|utensil|cutlery/],
  ['Garden & outdoors', /garden|\bplant\b|\blawn\b|outdoor/],
  ['Pets', /\bpet\b|\bdog\b|\bcat\b|\banimal\b/],
  ['Car & garage', /\bcar\b|vehicle|garage|\bauto\b|\btire\b|oil change/],
  ['Tech & office', /\btech\b|gadget|electronic|battery|charger|\boffice\b|printer|paper|stationery/],
];

export function suggestIcon(name: string, section: 'expiry' | 'lastTime'): string {
  const fallback = section === 'expiry' ? DEFAULT_EXPIRY_ICON : DEFAULT_LAST_TIME_ICON;
  const lower = name.trim().toLowerCase();
  if (!lower) return fallback;

  // 1. Exact label match against the curated catalog is most precise.
  for (const cat of ICON_CATEGORIES) {
    const exact = cat.icons.find((entry) => entry.label.toLowerCase() === lower);
    if (exact) return exact.icon;
  }

  // 2. Otherwise, infer the broad category and use its representative icon.
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(lower)) return CATEGORY_ICON[category] ?? fallback;
  }

  return fallback;
}
