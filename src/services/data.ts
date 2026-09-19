import menuData from '@/data/uw-menus.json';

export type Restaurant = (typeof menuData.restaurants)[number];
export type MenuItem = Restaurant['menu_items'][number];

export type MenuItemResult = MenuItem & {
    restaurant: string;
};

export type MenuItemFilters = {
    restaurant?: string;
    minHealthScore?: number;
};

export async function retrieveRestaurantData(): Promise<Restaurant[]> {
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

export async function listMenuItems(
    filters: MenuItemFilters = {},
): Promise<MenuItemResult[]> {
    const restaurants = await retrieveRestaurantData();

    return restaurants.flatMap(({ restaurant, menu_items }) =>
        menu_items
            .filter((item) => {
                const matchesRestaurant =
                    !filters.restaurant || restaurant === filters.restaurant;
                const matchesHealthScore =
                    filters.minHealthScore === undefined ||
                    item.healthScore >= filters.minHealthScore;

                return matchesRestaurant && matchesHealthScore;
            })
            .map((item) => ({ ...item, restaurant })),
    );
}