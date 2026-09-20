import menuData from '@/data/uw-menus.json';

export type Restaurant = (typeof menuData.restaurants)[number];
export type MenuItem = Restaurant['menu_items'][number];

export type MenuItemResult = MenuItem & {
    restaurant: string;
    restaurantHealthScore: number;
};

export type MenuItemFilters = {
    restaurant?: string;
    minHealthScore?: number;
    dietaryRestrictions?: string[];
    allergens?: string[];
};

export type RestaurantHealthSummary = {
    restaurant: string;
    healthScore: number;
    itemCount: number;
    menuGroupCount: number;
    confidence: number;
};

const locationNames: Record<string, string> = {
    'Residence Bulk Kellogg’s Cereals': 'Residence Dining',
    'Residence Burrito Station': 'Residence Dining',
    'Residence Curry Station': 'Residence Dining',
    'Residence Fajita Station': 'Residence Dining',
    'Residence Grill Station': 'Residence Dining',
    'Residence Nestle Specialty Coffee Machine': 'Residence Dining',
    'Residence Pasta Station': 'Residence Dining',
    'Residence Pizza & Quesadilla Station': 'Residence Dining',
    'Residence Poutine Ingredient Guide': 'Residence Dining',
    'Residence Power Bowl': 'Residence Dining',
    'Residence REV Poutine Ingredient Guide': 'Residence Dining',
    'Residence REV Sandwich Station': 'Residence Dining',
    'Residence Stir Fry Station': 'Residence Dining',
    'SLC Masala': 'SLC',
    'SLC Smokehouse': 'SLC',
    'SLC and Southside Market Shawarma': 'Southside Market',
    'Southside Market Pasta Lab': 'Southside Market',
    'Southside Market Whet Noodle': 'Southside Market',
    'Village 1 Bake Shop Gourmet Cakes and Pies': 'Village 1',
    'Village 1 Bakery Ingredient Guide': 'Village 1',
};

function getLocationName(menuGroupName: string) {
    return locationNames[menuGroupName] ?? menuGroupName;
}

async function retrieveRestaurantData(): Promise<Restaurant[]> {
    return menuData.restaurants;
}

export async function listRestaurants(): Promise<string[]> {
    const restaurants = await retrieveRestaurantData();
    return [...new Set(restaurants.map(({ restaurant }) => getLocationName(restaurant)))];
}

export async function getRestaurant(
    restaurantName: string,
): Promise<Restaurant | undefined> {
    const restaurants = await retrieveRestaurantData();
    return restaurants.find(
        ({ restaurant }) =>
            restaurant === restaurantName || getLocationName(restaurant) === restaurantName,
    );
}

export async function listRestaurantHealth(
    filters: Omit<MenuItemFilters, 'restaurant' | 'minHealthScore'> = {},
): Promise<RestaurantHealthSummary[]> {
    const restaurants = await retrieveRestaurantData();
    const groups = new Map<string, Restaurant[]>();

    for (const menuGroup of restaurants) {
        const locationName = getLocationName(menuGroup.restaurant);
        groups.set(locationName, [...(groups.get(locationName) ?? []), menuGroup]);
    }

    const rawSummaries = [...groups.entries()]
        .map(([restaurant, menuGroups]) => {
            const groupScores = menuGroups.flatMap((menuGroup) => {
                const sectionScores = sections(menuGroup.menu_items)
                    .map((sectionItems) =>
                        average(
                            sectionItems
                                .filter((item) => matchesFilters(item, filters))
                                .map((item) => item.healthScore),
                        ),
                    )
                    .filter((score): score is number => score !== undefined);

                const groupScore = average(sectionScores);
                return groupScore === undefined ? [] : [groupScore];
            });

            const itemCount = menuGroups.reduce(
                (total, menuGroup) =>
                    total +
                    menuGroup.menu_items.filter((item) => matchesFilters(item, filters)).length,
                0,
            );

            return {
                restaurant,
                healthScore: average(groupScores) ?? 0,
                itemCount,
                menuGroupCount: groupScores.length,
            };
        })
        .filter(({ itemCount }) => itemCount > 0);

    const campusBaseline = average(rawSummaries.map(({ healthScore }) => healthScore)) ?? 0;

    return rawSummaries.map((summary) => {
        // Sparse ingredient guides are less certain, so shrink them toward the campus baseline.
        const confidence = summary.itemCount / (summary.itemCount + 10);
        return {
            ...summary,
            healthScore:
                confidence * summary.healthScore +
                (1 - confidence) * campusBaseline,
            confidence,
        };
    });
}

/** Lists compatible menu items and attaches the health score of their parent location. */
export async function listMenuItems(
    filters: MenuItemFilters = {},
): Promise<MenuItemResult[]> {
    const restaurants = await retrieveRestaurantData();
    const healthSummaries = await listRestaurantHealth(filters);
    const healthByRestaurant = new Map(
        healthSummaries.map(({ restaurant, healthScore }) => [restaurant, healthScore]),
    );

    return restaurants.flatMap((menuGroup) => {
        const restaurant = getLocationName(menuGroup.restaurant);
        const restaurantHealthScore = healthByRestaurant.get(restaurant) ?? 0;

        return menuGroup.menu_items
            .filter((item) => matchesFilters(item, filters))
            .filter(
                (item) =>
                    filters.minHealthScore === undefined ||
                    item.healthScore >= filters.minHealthScore,
            )
            .filter(
                (item) =>
                    !filters.restaurant ||
                    menuGroup.restaurant === filters.restaurant ||
                    restaurant === filters.restaurant,
            )
            .map((item) => ({ ...item, restaurant, restaurantHealthScore }));
    });
}

/**
 * Provides easy access to a specific menu item by restaurant and name
 * Use to access properties such as dietary restrictions and allergens for a specific menu item
 * `dietary`, `allergens`, `ingredients`, `healthScore`
 */
export async function getMenuItem(
    restaurantName: string,
    menuItemName: string,
): Promise<MenuItemResult | undefined> {
    const items = await listMenuItems({ restaurant: restaurantName });
    return items.find(({ name }) => name === menuItemName);
}

function sections(items: MenuItem[]) {
    const grouped = new Map<string, MenuItem[]>();
    for (const item of items) {
        grouped.set(item.section, [...(grouped.get(item.section) ?? []), item]);
    }
    return [...grouped.values()];
}

function matchesFilters(
    item: MenuItem,
    filters: Omit<MenuItemFilters, 'restaurant' | 'minHealthScore'>,
) {
    return (
        (filters.dietaryRestrictions ?? []).every((restriction) =>
            matchesDietary(item, restriction),
        ) &&
        (filters.allergens ?? []).every((allergen) => !matchesAllergen(item, allergen))
    );
}

function matchesDietary(item: MenuItem, restriction: string) {
    const normalized = restriction.toLowerCase().replaceAll(' ', '_');
    if (normalized === 'halal') return item.dietary.halal_labeled;
    if (normalized === 'vegan') return item.dietary.vegan === true;
    if (normalized === 'vegetarian') return item.dietary.vegetarian === true;
    if (normalized === 'no_pork') return item.dietary.contains_pork === 'none_listed';
    if (normalized === 'no_alcohol') return !item.dietary.contains_alcohol;
    return false;
}

function matchesAllergen(item: MenuItem, allergen: string) {
    const normalized = allergen.toLowerCase();
    return [...item.allergens.contains, ...item.allergens.may_contain].some(
        (itemAllergen) => itemAllergen.toLowerCase() === normalized,
    );
}

function average(values: number[]) {
    return values.length === 0
        ? undefined
        : values.reduce((total, value) => total + value, 0) / values.length;
}