import { restaurantFixtures } from '@/data/recommendations';
import restaurantLocations from '@/data/restaurants.json';
import {
  filterAndRankRestaurants,
  type Allergen,
  type DietaryRestriction,
  type HealthTag,
} from '@/domain/recommendations/filter-and-rank';
import { getBuildingByName, getDefaultBuilding, type Building } from '@/services/buildings';
import { getWalkingRouteInfos, type RouteInfo } from '@/services/maps';

export const transportOptions = ['Walk', 'Bike', 'Car', 'Transit'] as const;
export const travelTimeOptions = [5, 10, 15, 20, 30] as const;
export const eatingPreferenceOptions = ['Healthy', 'Kinda Healthy', 'Unhealthy'] as const;
export const dietaryRestrictionOptions = [
  'Halal',
  'Vegan',
  'Vegetarian',
  'No pork',
  'No alcohol',
] as const;
export const allergyOptions = ['Wheat', 'Peanut', 'Tree nuts', 'Sesame', 'Dairy', 'Egg'] as const;
export const dietaryConstraintOptions = ['Required', 'Preferred'] as const;

export type Transport = (typeof transportOptions)[number];
export type TravelTime = (typeof travelTimeOptions)[number];
export type EatingPreference = (typeof eatingPreferenceOptions)[number];
export type DietaryConstraint = (typeof dietaryConstraintOptions)[number];
export type { Allergen, DietaryRestriction, HealthTag };

export type SearchCriteria = {
  building: Building;
  location: string;
  transport: Transport;
  openNow: boolean;
  maximumTravelTime: TravelTime;
  eatingPreferences: EatingPreference[];
  requiredDietary: DietaryRestriction[];
  preferredDietary: DietaryRestriction[];
  allergies: Allergen[];
};

export type MealRecommendation = {
  name: string;
  description: string;
  healthTag: HealthTag;
};

export type PlaceLocation = {
  address: string;
  latitude: number;
  longitude: number;
};

export type PlaceRecommendation = {
  id: string;
  place: string;
  travelTime: string;
  location: PlaceLocation;
  meals: MealRecommendation[];
  routeInfo: RouteInfo | null;
};

const defaultBuilding = getDefaultBuilding();
const defaultSearchCriteria: SearchCriteria = {
  building: defaultBuilding,
  location: defaultBuilding.name,
  transport: 'Walk',
  openNow: true,
  maximumTravelTime: 15,
  eatingPreferences: ['Kinda Healthy'],
  requiredDietary: [],
  preferredDietary: [],
  allergies: [],
};

const locatedRestaurantFixtures = restaurantLocations.map((location, index) => {
  const menuFixture = restaurantFixtures[index % restaurantFixtures.length];

  return {
    ...menuFixture,
    id: `restaurant-${index + 1}`,
    place: location.name,
    location,
  };
});

export function getDefaultSearchCriteria(): SearchCriteria {
  return {
    ...defaultSearchCriteria,
    eatingPreferences: [...defaultSearchCriteria.eatingPreferences],
    requiredDietary: [...defaultSearchCriteria.requiredDietary],
    preferredDietary: [...defaultSearchCriteria.preferredDietary],
    allergies: [...defaultSearchCriteria.allergies],
  };
}

export function getSearchCriteriaFromParams(
  params: Record<string, string | string[] | undefined>
): SearchCriteria {
  const building = getBuildingByName(getFirstParam(params.building) ?? '') ?? defaultBuilding;
  const transportParam = getFirstParam(params.transport);
  const travelTimeParam = Number(getFirstParam(params.maximumTravelTime));
  const requiredDietary = parseOptionList(
    getFirstParam(params.requiredDietary),
    isDietaryRestriction
  );

  return {
    building,
    location: building.name,
    transport: isTransport(transportParam) ? transportParam : defaultSearchCriteria.transport,
    openNow: getFirstParam(params.openNow) !== 'false',
    maximumTravelTime: isTravelTime(travelTimeParam)
      ? travelTimeParam
      : defaultSearchCriteria.maximumTravelTime,
    eatingPreferences: parseEatingPreferences(getFirstParam(params.eatingPreferences)),
    requiredDietary,
    preferredDietary: parseOptionList(
      getFirstParam(params.preferredDietary),
      (value): value is DietaryRestriction =>
        isDietaryRestriction(value) && !requiredDietary.includes(value)
    ),
    allergies: parseOptionList(getFirstParam(params.allergies), isAllergen),
  };
}

export async function getTopRecommendations(
  criteria: SearchCriteria
): Promise<PlaceRecommendation[]> {
  const rankedRestaurantIds = filterAndRankRestaurants(locatedRestaurantFixtures, criteria).map(
    (restaurant) => restaurant.id
  );
  const selectedRestaurantIds = (rankedRestaurantIds.length > 0
    ? rankedRestaurantIds
    : locatedRestaurantFixtures.map((restaurant) => restaurant.id)
  ).slice(0, 3);
  const selectedRestaurants = selectedRestaurantIds.map(
    (id) => locatedRestaurantFixtures.find((restaurant) => restaurant.id === id)!
  );
  const routeInfos = await getWalkingRouteInfos(
    criteria.building,
    selectedRestaurants.map((restaurant) => ({
      id: restaurant.id,
      ...restaurant.location,
    }))
  ).catch(() => new Map<string, RouteInfo>());

  return selectedRestaurants.map((restaurant) => {
    const routeInfo = routeInfos.get(restaurant.id) ?? null;

    return {
      id: restaurant.id,
      place: restaurant.place,
      travelTime: routeInfo?.duration ?? 'Walking time unavailable',
      location: { ...restaurant.location },
      meals: restaurant.meals.map(({ name, description, healthTag }) => ({
        name,
        description,
        healthTag,
      })),
      routeInfo,
    };
  });
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseEatingPreferences(value: string | undefined): EatingPreference[] {
  const preferences = parseOptionList(value, isEatingPreference);

  return preferences.length > 0 ? preferences : [...defaultSearchCriteria.eatingPreferences];
}

function parseOptionList<T extends string>(
  value: string | undefined,
  isValidOption: (option: string) => option is T
): T[] {
  return [...new Set(value?.split(',').filter(isValidOption) ?? [])];
}

function isTransport(value: string | undefined): value is Transport {
  return transportOptions.some((option) => option === value);
}

function isTravelTime(value: number): value is TravelTime {
  return travelTimeOptions.some((option) => option === value);
}

function isEatingPreference(value: string): value is EatingPreference {
  return eatingPreferenceOptions.some((option) => option === value);
}

function isDietaryRestriction(value: string): value is DietaryRestriction {
  return dietaryRestrictionOptions.some((option) => option === value);
}

function isAllergen(value: string): value is Allergen {
  return allergyOptions.some((option) => option === value);
}
