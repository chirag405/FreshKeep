export type IconEntry = { icon: string; label: string };

export const ICON_CATEGORIES: { label: string; icons: IconEntry[] }[] = [
  {
    label: 'Food & drink',
    icons: [
      { icon: '🥛', label: 'Milk' },
      { icon: '🍞', label: 'Bread' },
      { icon: '🥚', label: 'Eggs' },
      { icon: '🧀', label: 'Cheese' },
      { icon: '🥬', label: 'Greens' },
      { icon: '🍗', label: 'Meat' },
      { icon: '🍎', label: 'Fruit' },
      { icon: '🍌', label: 'Banana' },
      { icon: '🐟', label: 'Fish' },
      { icon: '🍚', label: 'Rice' },
      { icon: '🧃', label: 'Juice' },
      { icon: '🫙', label: 'Sauce' },
      { icon: '🧈', label: 'Butter' },
      { icon: '🍯', label: 'Honey' },
      { icon: '🥜', label: 'Nuts' },
      { icon: '🍫', label: 'Chocolate' },
      { icon: '🥗', label: 'Salad' },
      { icon: '🍜', label: 'Noodles' },
      { icon: '☕', label: 'Coffee' },
      { icon: '🍷', label: 'Wine' },
    ],
  },
  {
    label: 'Health',
    icons: [
      { icon: '💊', label: 'Medicine' },
      { icon: '🩹', label: 'Bandage' },
      { icon: '🧴', label: 'Lotion' },
      { icon: '🦷', label: 'Toothpaste' },
      { icon: '🌡️', label: 'Thermometer' },
      { icon: '💧', label: 'Eye drops' },
      { icon: '💉', label: 'Injection' },
      { icon: '😷', label: 'Mask' },
      { icon: '🩺', label: 'First aid' },
    ],
  },
  {
    label: 'Home & chores',
    icons: [
      { icon: '🛏️', label: 'Bedsheets' },
      { icon: '🪥', label: 'Toothbrush' },
      { icon: '🌀', label: 'AC filter' },
      { icon: '🧻', label: 'Toilet paper' },
      { icon: '🪴', label: 'Plant' },
      { icon: '🔋', label: 'Battery' },
      { icon: '🧹', label: 'Cleaning' },
      { icon: '🧽', label: 'Sponge' },
      { icon: '🚿', label: 'Shower' },
      { icon: '🕯️', label: 'Candle' },
      { icon: '🧯', label: 'Fire safety' },
      { icon: '💡', label: 'Lightbulb' },
      { icon: '🐾', label: 'Pet care' },
      { icon: '🧺', label: 'Laundry' },
      { icon: '🚗', label: 'Car' },
      { icon: '🔑', label: 'Keys' },
    ],
  },
];

export const DEFAULT_EXPIRY_ICON = '🥫';
export const DEFAULT_LAST_TIME_ICON = '📝';
