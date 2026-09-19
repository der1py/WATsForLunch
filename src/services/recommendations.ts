import { restaurantFixtures } from '@/data/recommendations';
import {
  filterAndRankRestaurants,
  type Allergen,
  type DietaryRestriction,
  type HealthTag,
} from '@/domain/recommendations/filter-and-rank';

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

export type PlaceRecommendation = {
  id: string;
  place: string;
  travelTime: string;
  meals: MealRecommendation[];
};

const defaultSearchCriteria: SearchCriteria = {
  location: 'MC',
  transport: 'Walk',
  openNow: true,
  maximumTravelTime: 15,
  eatingPreferences: ['Kinda Healthy'],
  requiredDietary: [],
  preferredDietary: [],
  allergies: [],
};

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
  const location = getFirstParam(params.location)?.trim() || defaultSearchCriteria.location;
  const transportParam = getFirstParam(params.transport);
  const travelTimeParam = Number(getFirstParam(params.maximumTravelTime));
  const requiredDietary = parseOptionList(
    getFirstParam(params.requiredDietary),
    isDietaryRestriction
  );

  return {
    location,
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

export function getTopRecommendations(criteria: SearchCriteria): PlaceRecommendation[] {
  return filterAndRankRestaurants(restaurantFixtures, criteria)
    .slice(0, 3)
    .map((place) => ({
      id: place.id,
      place: place.place,
      travelTime: place.travelTime,
      meals: place.meals.map(({ name, description, healthTag }) => ({
        name,
        description,
        healthTag,
      })),
    }));
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
