export type CafeteriaMealCategory = 'protein' | 'carb' | 'vegetable';
export type CafeteriaHealthPreference = 'healthy' | 'neutral' | 'unhealthy';

export type CafeteriaMenuItem = {
  id: string;
  name: string;
  section: string;
  healthScore: number;
};

export type CafeteriaMeal = {
  items: CafeteriaMenuItem[];
  averageHealthScore: number;
};

const proteinPattern = /protein|meat|\bmain\b/i;
const carbPattern = /pasta|noodle|bread|grain|rice|starch|bun|wrap/i;
const vegetablePattern = /vegetable|produce|salad|greens|topping/i;
const vegetableNamePattern =
  /broccoli|bok choy|cabbage|carrot|cauliflower|cucumber|eggplant|greens|kale|lettuce|mushroom|pepper|spinach|squash|tomato|zucchini/i;

function classifyItem(item: CafeteriaMenuItem): CafeteriaMealCategory | undefined {
  const searchable = `${item.section} ${item.name}`;

  if (vegetablePattern.test(item.section) || vegetableNamePattern.test(item.name)) return 'vegetable';
  if (proteinPattern.test(item.section)) return 'protein';
  if (carbPattern.test(searchable)) return 'carb';

  return undefined;
}

function chooseItem(
  candidates: CafeteriaMenuItem[],
  preference: CafeteriaHealthPreference
): CafeteriaMenuItem | undefined {
  return [...candidates].sort((left, right) => {
    const preferenceDifference =
      preference === 'healthy'
        ? right.healthScore - left.healthScore
        : preference === 'unhealthy'
          ? left.healthScore - right.healthScore
          : Math.abs(left.healthScore - 0.55) - Math.abs(right.healthScore - 0.55);

    return preferenceDifference || left.name.localeCompare(right.name);
  })[0];
}

export function isCompleteCafeteriaMeal(
  selectedItems: readonly CafeteriaMenuItem[],
  availableItems: readonly CafeteriaMenuItem[]
): boolean {
  const selectedCategories = selectedItems.map(classifyItem);
  if (selectedCategories.some((category) => category === undefined)) return false;
  if (new Set(selectedCategories).size !== selectedCategories.length) return false;

  const availableCategories = new Set(
    availableItems
      .map(classifyItem)
      .filter((category): category is CafeteriaMealCategory => category !== undefined)
  );

  return [...availableCategories].every((category) => selectedCategories.includes(category));
}

/**
 * Forms the closest available cafeteria meal from already-filtered items.
 * It never adds unclassified items, so drinks, desserts, and arbitrary extras
 * cannot enter the result. Missing categories are simply omitted.
 */
export function composeCafeteriaMeal(
  availableItems: readonly CafeteriaMenuItem[],
  preference: CafeteriaHealthPreference
): CafeteriaMeal | undefined {
  const unusedItems = [...availableItems];
  const selected: CafeteriaMenuItem[] = [];

  (['protein', 'carb', 'vegetable'] as const).forEach((category) => {
    const item = chooseItem(
      unusedItems.filter((candidate) => classifyItem(candidate) === category),
      preference
    );

    if (!item) return;

    selected.push(item);
    unusedItems.splice(
      unusedItems.findIndex((candidate) => candidate.id === item.id),
      1
    );
  });

  if (selected.length === 0) return undefined;

  return {
    items: selected,
    averageHealthScore:
      selected.reduce((total, item) => total + item.healthScore, 0) / selected.length,
  };
}
