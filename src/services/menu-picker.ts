/**
 * services/menu-picker.ts
 *
 * Walks every item in uw-menus.json, keeps the ones that pass the user's
 * filters (dietary restrictions, allergies, health preference), and picks
 * random items from what's left.
 *
 * Expected layout:
 *   data/menus.json       { "YYYY-MM-DD": { "<restaurant>": ["<item name>", ...] } }
 *   data/uw-menus.json    ingredient / dietary guide (one entry per restaurant)
 *   services/menu-picker.ts   <- this file
 */
import menusJson from '../data/menus.json';
import uwMenusJson from '../data/uw-menus.json';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** healthScore (0-1) at or above this is "Healthy". */
export const HEALTHY_MIN_SCORE = 0.7;
/** healthScore at or above this (and below HEALTHY_MIN_SCORE) is "Kinda Healthy". */
export const KINDA_HEALTHY_MIN_SCORE = 0.4;

/** Each "preferred" dietary restriction an item satisfies adds this much weight to its pick odds. */
const PREFERRED_BOOST = 3;
const DEFAULT_PICK_COUNT = 3;

/**
 * Optional: link a restaurant name in uw-menus.json to the name used as a key
 * in menus.json, when the two differ. Format: { 'uw-menus name': 'menus.json key' }
 */
export const RESTAURANT_ALIASES: Record<string, string> = {};

/**
 * Optional: where each restaurant is, keyed by its uw-menus.json name. Restaurants
 * listed here get a "Navigate" button on the results screen; others don't.
 */
export const RESTAURANT_LOCATIONS: Record<string, PlaceLocation> = {};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthTag = 'Healthy' | 'Kinda Healthy' | 'Unhealthy';

export type PlaceLocation = { address: string; latitude: number; longitude: number };

/** The slice of the search criteria this module needs (structurally matches the app's criteria). */
export type MenuFilterCriteria = {
  eatingPreferences: readonly string[];
  requiredDietary: readonly string[];
  preferredDietary: readonly string[];
  allergies: readonly string[];
};

export type MenuMeal = { name: string; description: string; healthTag: HealthTag };

/** Shaped like a place card: the restaurant, plus the single picked item as its meal. */
export type MenuRecommendation = {
  id: string;
  place: string;
  meals: MenuMeal[];
  travelTime?: string;
  location?: PlaceLocation;
};

type UwItem = {
  name: string;
  section: string;
  dietary: {
    halal_labeled: boolean;
    vegetarian: boolean | null;
    vegan: boolean | null;
    contains_pork: 'yes' | 'possible' | 'none_listed';
    contains_alcohol: boolean;
  };
  allergens: { contains: string[]; may_contain: string[]; shared_fryer: boolean };
  ingredients: string | null;
  notes: string[] | null;
  healthScore: number;
};

type UwRestaurant = { restaurant: string; notes: string[] | null; menu_items: UwItem[] };

export type EligibleMenuItem = {
  id: string;
  restaurant: string;
  item: UwItem;
  healthTag: HealthTag;
  /** How many of the user's "preferred" dietary restrictions this item satisfies. */
  preferredMatches: number;
};

const uwMenus = uwMenusJson as unknown as { restaurants: UwRestaurant[] };
const dailyMenus = menusJson as unknown as Record<string, Record<string, string[]>>;

// ---------------------------------------------------------------------------
// Name normalisation
// ---------------------------------------------------------------------------

/** Lowercase letters/digits only, so "Tree Nuts", "tree-nuts" and "treenuts" compare equal. */
const canon = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Same, plus drops a trailing "s" so "peanuts" / "peanut" and "eggs" / "egg" match. */
const canonAllergen = (value: string) => canon(value).replace(/s$/, '');

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

function getHealthTag(score: number): HealthTag {
  if (score >= HEALTHY_MIN_SCORE) return 'Healthy';
  if (score >= KINDA_HEALTHY_MIN_SCORE) return 'Kinda Healthy';
  return 'Unhealthy';
}

const HEALTH_TAG_BY_LABEL = new Map<string, HealthTag>([
  ['healthy', 'Healthy'],
  ['kindahealthy', 'Kinda Healthy'],
  ['unhealthy', 'Unhealthy'],
]);

// ---------------------------------------------------------------------------
// Allergies
// ---------------------------------------------------------------------------

/** uw-menus.json uses this token in may_contain to mean "everything". */
const ANY_ALLERGEN = 'allpriorityallergen';

/** Notes that say the allergen info for an item is incomplete or variable. */
const UNCERTAIN_NOTE = /verify with staff|may change|varieties contain|may impact/i;

/** Extra data tokens that should also count when the user picks a given allergy (keys/values are canonAllergen'd). */
const ALLERGEN_ALIASES = new Map<string, string[]>([
  ['nut', ['treenut', 'peanut', 'cashew']],
  ['treenut', ['cashew']],
  ['dairy', ['milk']],
  ['milk', ['dairy']],
  ['lactose', ['milk', 'dairy']],
  ['crustacean', ['shellfish']],
  ['mollusc', ['shellfish']],
  ['crustaceansmollusc', ['shellfish']],
  ['sesame', ['seed']],
  ['wheat', ['gluten']],
  ['gluten', ['wheat', 'barley', 'rye', 'oat']],
  ['sulfite', ['sulphite']],
]);

function buildBlockedAllergenTokens(allergies: readonly string[]): Set<string> {
  const blocked = new Set<string>();
  for (const label of allergies) {
    const token = canonAllergen(label);
    if (!token) continue;
    blocked.add(token);
    ALLERGEN_ALIASES.get(token)?.forEach((alias) => blocked.add(alias));
  }
  return blocked;
}

/**
 * An item is unsafe if, for any selected allergy, it (a) lists the allergen as
 * contained or possible, (b) is cooked in a shared fryer, (c) has a note that
 * mentions the allergen (e.g. "made in a facility that uses peanuts"), or (d)
 * has a note saying its allergens vary / need to be verified with staff.
 */
function isAllergenSafe(item: UwItem, extraNotes: string[], blocked: ReadonlySet<string>): boolean {
  if (blocked.size === 0) return true;

  const { contains, may_contain, shared_fryer } = item.allergens;
  if (shared_fryer) return false;

  const listed = [...contains, ...may_contain].map(canonAllergen);
  if (listed.some((token) => token === ANY_ALLERGEN || blocked.has(token))) return false;

  const notes = [...(item.notes ?? []), ...extraNotes];
  if (notes.some((note) => UNCERTAIN_NOTE.test(note))) return false;

  const squashedNotes = canon(notes.join(' '));
  return ![...blocked].some((token) => squashedNotes.includes(token));
}

/** Restaurant-level notes (e.g. "salad dressing may impact allergens") apply to items in the section they name. */
function getSectionNotes(restaurant: UwRestaurant, item: UwItem): string[] {
  const section = item.section.toLowerCase().replace(/s$/, '');
  return (restaurant.notes ?? []).filter((note) => note.toLowerCase().includes(section));
}

// ---------------------------------------------------------------------------
// Dietary restrictions
// ---------------------------------------------------------------------------

type DietaryRule = (item: UwItem) => boolean;

const listedAllergenTokens = (item: UwItem) =>
  [...item.allergens.contains, ...item.allergens.may_contain].map(canonAllergen);

const noPork: DietaryRule = (item) => item.dietary.contains_pork === 'none_listed';
const noAlcohol: DietaryRule = (item) => item.dietary.contains_alcohol === false;

/** Keyed by canon(label). "unknown" (null) vegetarian/vegan values never satisfy a rule. */
const DIETARY_RULES = new Map<string, DietaryRule>([
  ['vegetarian', (item) => item.dietary.vegetarian === true],
  ['vegan', (item) => item.dietary.vegan === true],
  ['halal', (item) => item.dietary.halal_labeled === true],
  ['nopork', noPork],
  ['porkfree', noPork],
  ['noalcohol', noAlcohol],
  ['alcoholfree', noAlcohol],
  [
    'glutenfree',
    (item) =>
      !listedAllergenTokens(item).some((t) =>
        ['gluten', 'wheat', 'barley', 'rye', 'oat', ANY_ALLERGEN].includes(t)
      ),
  ],
  ['dairyfree', (item) => !listedAllergenTokens(item).some((t) => t === 'milk' || t === ANY_ALLERGEN)],
]);

const warnedLabels = new Set<string>();

function getDietaryRule(label: string): DietaryRule | undefined {
  const rule = DIETARY_RULES.get(canon(label));
  if (!rule && !warnedLabels.has(label)) {
    warnedLabels.add(label);
    console.warn(
      `[menu-picker] No data-backed rule for dietary restriction "${label}". ` +
        `Required: no items will match. Preferred: ignored. Add it to DIETARY_RULES.`
    );
  }
  return rule;
}

// ---------------------------------------------------------------------------
// "Available today" for restaurants that have a daily menu in menus.json
// ---------------------------------------------------------------------------

/** canon(restaurant) -> restaurant key, across every date in menus.json. */
const dailyRestaurantKeys = new Map<string, string>();
for (const day of Object.values(dailyMenus)) {
  for (const key of Object.keys(day)) dailyRestaurantKeys.set(canon(key), key);
}

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date, which is "tomorrow" in the evening). */
function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * null  -> restaurant isn't a key in menus.json: every item is always available.
 * Set   -> restaurant has a daily menu: only these (normalised) item names are available
 *          on this date. Empty if it has no menu today (weekend, holiday, past the last date).
 */
function getTodaysItemNames(restaurantName: string, dateKey: string): Set<string> | null {
  const key = dailyRestaurantKeys.get(canon(RESTAURANT_ALIASES[restaurantName] ?? restaurantName));
  if (key === undefined) return null;
  return new Set((dailyMenus[dateKey]?.[key] ?? []).map(canon));
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/** Every menu item that is available today and passes all of the user's filters. */
export function getEligibleMenuItems(
  criteria: MenuFilterCriteria,
  now: Date = new Date()
): EligibleMenuItem[] {
  const dateKey = toDateKey(now);

  const wantedTags = new Set<HealthTag>();
  for (const label of criteria.eatingPreferences) {
    const tag = HEALTH_TAG_BY_LABEL.get(canon(label));
    if (tag) wantedTags.add(tag);
  }

  // An unrecognised *required* label stays `undefined` and fails closed below.
  const requiredRules = criteria.requiredDietary.map(getDietaryRule);
  const preferredRules = criteria.preferredDietary
    .map(getDietaryRule)
    .filter((rule): rule is DietaryRule => rule !== undefined);
  const blockedAllergens = buildBlockedAllergenTokens(criteria.allergies);

  const eligible: EligibleMenuItem[] = [];
  const seen = new Set<string>();

  uwMenus.restaurants.forEach((restaurant, restaurantIndex) => {
    const todaysNames = getTodaysItemNames(restaurant.restaurant, dateKey);

    restaurant.menu_items.forEach((item, itemIndex) => {
      if (todaysNames && !todaysNames.has(canon(item.name))) return;

      const healthTag = getHealthTag(item.healthScore);
      if (wantedTags.size > 0 && !wantedTags.has(healthTag)) return;

      if (!requiredRules.every((rule) => rule !== undefined && rule(item))) return;

      if (!isAllergenSafe(item, getSectionNotes(restaurant, item), blockedAllergens)) return;

      const dedupeKey = `${restaurantIndex}|${canon(item.name)}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      eligible.push({
        id: `${restaurantIndex}-${itemIndex}`,
        restaurant: restaurant.restaurant,
        item,
        healthTag,
        preferredMatches: preferredRules.filter((rule) => rule(item)).length,
      });
    });
  });

  return eligible;
}

// ---------------------------------------------------------------------------
// Picking
// ---------------------------------------------------------------------------

/** Random sample without replacement; entries that satisfy more "preferred" restrictions are likelier. */
function sampleWeighted(
  pool: EligibleMenuItem[],
  count: number,
  distinctRestaurants: boolean
): EligibleMenuItem[] {
  let remaining = [...pool];
  const picked: EligibleMenuItem[] = [];

  while (picked.length < count && remaining.length > 0) {
    const weights = remaining.map((entry) => 1 + entry.preferredMatches * PREFERRED_BOOST);
    let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
    let index = weights.findIndex((weight) => (roll -= weight) < 0);
    if (index === -1) index = remaining.length - 1;

    const selection = remaining.splice(index, 1)[0];
    picked.push(selection);

    if (distinctRestaurants) {
      remaining = remaining.filter((entry) => entry.restaurant !== selection.restaurant);
    }
  }

  return picked;
}

/** First few top-level ingredients, with parenthesised sub-ingredients and footnote marks removed. */
function summarizeIngredients(ingredients: string | null, max = 5): string {
  if (!ingredients) return '';

  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of ingredients.split(' | ')[0]) {
    if (char === '(') depth += 1;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      if (char === ',') {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  parts.push(current);

  const cleaned = parts
    .map((part) => part.replace(/\*/g, '').trim().replace(/\.$/, ''))
    .filter(Boolean);
  const shown = cleaned.slice(0, max).join(', ');
  return cleaned.length > max ? `${shown}…` : shown;
}

function toRecommendation({ id, restaurant, item, healthTag }: EligibleMenuItem): MenuRecommendation {
  const preview = summarizeIngredients(item.ingredients);
  return {
    id,
    place: restaurant,
    meals: [
      {
        name: item.name,
        description: preview ? `${item.section} · ${preview}` : item.section,
        healthTag,
      },
    ],
    location: RESTAURANT_LOCATIONS[restaurant],
  };
}

/**
 * Filters every uw-menus.json item by the user's criteria and returns `count`
 * (default 3) random ones. Returns fewer than `count` if fewer pass the filters.
 */
export function getMenuItemRecommendations(
  criteria: MenuFilterCriteria,
  options: {
    count?: number;
    now?: Date;
    restaurants?: readonly string[];
    distinctRestaurants?: boolean;
  } = {}
): MenuRecommendation[] {
  const {
    count = DEFAULT_PICK_COUNT,
    now = new Date(),
    restaurants,
    distinctRestaurants = false,
  } = options;
  const allowedRestaurants = restaurants ? new Set(restaurants) : undefined;
  const eligibleItems = getEligibleMenuItems(criteria, now).filter(
    (item) => !allowedRestaurants || allowedRestaurants.has(item.restaurant)
  );

  return sampleWeighted(eligibleItems, count, distinctRestaurants).map(toRecommendation);
}
