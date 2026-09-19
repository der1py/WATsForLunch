export type HealthTag = 'Healthy' | 'Kinda Healthy' | 'Unhealthy';
export type DietaryRestriction = 'Halal' | 'Vegan' | 'Vegetarian' | 'No pork' | 'No alcohol';
export type Allergen = 'Wheat' | 'Peanut' | 'Tree nuts' | 'Sesame' | 'Dairy' | 'Egg';
export type AllergenStatus = 'contains' | 'may_contain';

type Meal = {
  name: string;
  description: string;
  healthTag: HealthTag;
  dietaryTags: readonly DietaryRestriction[];
  allergens: Readonly<Partial<Record<Allergen, AllergenStatus>>>;
};

type Restaurant = {
  id: string;
  place: string;
  travelTime: string;
  meals: readonly Meal[];
};

export type RecommendationCriteria = {
  eatingPreferences: readonly HealthTag[];
  requiredDietary: readonly DietaryRestriction[];
  preferredDietary: readonly DietaryRestriction[];
  allergies: readonly Allergen[];
};

export type RankedRestaurant = Omit<Restaurant, 'meals'> & {
  meals: Meal[];
};

export function filterAndRankRestaurants(
  restaurants: readonly Restaurant[],
  criteria: RecommendationCriteria
): RankedRestaurant[] {
  return restaurants
    .map((restaurant) => {
      const meals = restaurant.meals.filter((meal) => isCompatibleMeal(meal, criteria));

      return {
        ...restaurant,
        meals,
        score: meals.reduce(
          (total, meal) => total + countPreferredDietaryMatches(meal, criteria.preferredDietary),
          0
        ),
      };
    })
    .filter((restaurant) => restaurant.meals.length > 0)
    .sort((first, second) => second.score - first.score)
    .map(({ score: _score, ...restaurant }) => restaurant);
}

function isCompatibleMeal(meal: Meal, criteria: RecommendationCriteria) {
  return (
    criteria.eatingPreferences.includes(meal.healthTag) &&
    criteria.requiredDietary.every((restriction) => meal.dietaryTags.includes(restriction)) &&
    !criteria.allergies.some((allergen) => meal.allergens[allergen] !== undefined)
  );
}

function countPreferredDietaryMatches(meal: Meal, preferences: readonly DietaryRestriction[]) {
  return preferences.filter((preference) => meal.dietaryTags.includes(preference)).length;
}
