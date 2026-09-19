import menuData from '@/data/uw-menus.json';

export type Restaurant = (typeof menuData.restaurants)[number];
export type MenuItem = Restaurant['menu_items'][number];

export type MenuItemResult = MenuItem & {
    restaurant: string;
};

export type MenuItemFilters = {
    restaurant?: string;
    minHealthScore?: number;
    dietaryRestrictions?: string[];
    allergens?: string[];
};

async function retrieveRestaurantData(): Promise<Restaurant[]> {
    return menuData.restaurants;
}

export async function listRestaurants(): Promise<string[]> {
    const restaurants = await retrieveRestaurantData();
    return restaurants.map(({ restaurant }) => restaurant);
}

export async function getRestaurant(
    restaurantName: string,
): Promise<Restaurant | undefined> {
    const restaurants = await retrieveRestaurantData();
    return restaurants.find(({ restaurant }) => restaurant === restaurantName);
}

/**
 * Lists ALL menu items by filters; `restaurant`, `healthScore`, `dietaryRestrictions`, and `allergens`
 */
export async function listMenuItems(
    filters: MenuItemFilters = {},
): Promise<MenuItemResult[]> {
    const restaurants = await retrieveRestaurantData();

    return restaurants.flatMap(({ restaurant, menu_items}) =>
        menu_items
            .filter((item) => {
                const matchesRestaurant =
                    !filters.restaurant || restaurant === filters.restaurant;
                const matchesHealthScore =
                    filters.minHealthScore === undefined ||
                    item.healthScore >= filters.minHealthScore;
                const matchesDietaryRestrictions =
                    !filters.restaurant ||
                    filters.dietaryRestrictions?.some((restriction: string) =>
                        Object.values(item.dietary).includes(restriction),
                    );
                const matchesAllergens =
                    !filters.restaurant ||
                    filters.allergens?.some((allergen: string) =>
                        (Object.values(item.allergens.contains).includes(allergen) || Object.values(item.allergens.may_contain).includes(allergen)),
                    );

                return matchesRestaurant && matchesHealthScore && matchesDietaryRestrictions && matchesAllergens;
            })
            .map((item) => ({ ...item, restaurant })),
    );
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
    const restaurant = await getRestaurant(restaurantName);
    const menuItem = restaurant?.menu_items.find(({ name }) => name === menuItemName);
    if (!menuItem) {
        return undefined;
    }
    return { ...menuItem, restaurant: restaurantName };
}