export const transportOptions = ['Walk', 'Bike', 'Car', 'Transit'] as const;
export const travelTimeOptions = [5, 10, 15, 20, 30] as const;
export const eatingPreferenceOptions = ['Healthy', 'Kinda Healthy', 'Unhealthy'] as const;

export type Transport = (typeof transportOptions)[number];
export type TravelTime = (typeof travelTimeOptions)[number];
export type EatingPreference = (typeof eatingPreferenceOptions)[number];
export type HealthTag = EatingPreference;

export type SearchCriteria = {
  location: string;
  transport: Transport;
  openNow: boolean;
  maximumTravelTime: TravelTime;
  eatingPreference: EatingPreference;
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
  eatingPreference: 'Kinda Healthy',
};

const mockRecommendations: PlaceRecommendation[] = [
  {
    id: 'green-table',
    place: 'Green Table',
    travelTime: '6 min walk',
    meals: [
      {
        name: 'Harvest grain bowl',
        description: 'Roasted vegetables, greens, quinoa, and tahini dressing.',
        healthTag: 'Healthy',
      },
      {
        name: 'Chicken pesto sandwich',
        description: 'Grilled chicken, pesto, tomato, and mixed greens.',
        healthTag: 'Kinda Healthy',
      },
      {
        name: 'Crispy chicken wrap',
        description: 'Crispy chicken, slaw, and house sauce in a warm wrap.',
        healthTag: 'Unhealthy',
      },
    ],
  },
  {
    id: 'market-kitchen',
    place: 'Market Kitchen',
    travelTime: '9 min walk',
    meals: [
      {
        name: 'Salmon poke bowl',
        description: 'Salmon, edamame, cucumber, seaweed, and brown rice.',
        healthTag: 'Healthy',
      },
      {
        name: 'Turkey club',
        description: 'Turkey, avocado, tomato, greens, and multigrain bread.',
        healthTag: 'Kinda Healthy',
      },
      {
        name: 'Loaded poutine',
        description: 'Crispy fries, cheese curds, gravy, and green onions.',
        healthTag: 'Unhealthy',
      },
    ],
  },
  {
    id: 'corner-noodle',
    place: 'Corner Noodle',
    travelTime: '12 min walk',
    meals: [
      {
        name: 'Ginger tofu noodle soup',
        description: 'Tofu, bok choy, mushrooms, ginger broth, and noodles.',
        healthTag: 'Healthy',
      },
      {
        name: 'Chicken ramen',
        description: 'Chicken, egg, corn, scallions, and savoury broth.',
        healthTag: 'Kinda Healthy',
      },
      {
        name: 'Spicy fried noodles',
        description: 'Wok-fried noodles with crispy shallots and chili oil.',
        healthTag: 'Unhealthy',
      },
    ],
  },
];

export function getDefaultSearchCriteria(): SearchCriteria {
  return { ...defaultSearchCriteria };
}

export function getSearchCriteriaFromParams(
  params: Record<string, string | string[] | undefined>
): SearchCriteria {
  const location = getFirstParam(params.location)?.trim() || defaultSearchCriteria.location;
  const transportParam = getFirstParam(params.transport);
  const travelTimeParam = Number(getFirstParam(params.maximumTravelTime));
  const eatingPreferenceParam = getFirstParam(params.eatingPreference);
  const transport = isTransport(transportParam) ? transportParam : defaultSearchCriteria.transport;
  const eatingPreference = isEatingPreference(eatingPreferenceParam)
    ? eatingPreferenceParam
    : defaultSearchCriteria.eatingPreference;

  return {
    location,
    transport,
    openNow: getFirstParam(params.openNow) !== 'false',
    maximumTravelTime: isTravelTime(travelTimeParam)
      ? travelTimeParam
      : defaultSearchCriteria.maximumTravelTime,
    eatingPreference,
  };
}

export function getTopRecommendations(_criteria: SearchCriteria): PlaceRecommendation[] {
  // This service boundary is intentionally ready for a future API or ranking implementation.
  return mockRecommendations;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isTransport(value: string | undefined): value is Transport {
  return transportOptions.some((option) => option === value);
}

function isTravelTime(value: number): value is TravelTime {
  return travelTimeOptions.some((option) => option === value);
}

function isEatingPreference(value: string | undefined): value is EatingPreference {
  return eatingPreferenceOptions.some((option) => option === value);
}
