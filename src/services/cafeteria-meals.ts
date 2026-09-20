import {
    composeCafeteriaMeal,
    type CafeteriaHealthPreference,
    type CafeteriaMenuItem,
} from '@/domain/cafeteria/meal-composer';
import type { HealthTag, MenuMeal } from '@/services/menu-picker';
import Constants from 'expo-constants';

const LOCAL_CAFETERIA_API_URL =
  process.env.EXPO_PUBLIC_CAFETERIA_API_URL ?? 'http://localhost:8787/api/cafeteria-meals';
const isOpenAiDebug = Constants.expoConfig?.extra?.openAiDebug === true;

type LlmMeal = {
  proteinItemId: string | null;
  carbItemId: string | null;
  vegetableItemId: string | null;
  healthTag: HealthTag;
};

type LlmResponse = { meals: LlmMeal[] };

export type CafeteriaMealCandidate = CafeteriaMenuItem & { healthTag: HealthTag };

/**
 * Sends only the already-eligible items for one cafeteria station to the local
 * backend. The client validates that every returned ID came from that menu.
 */
export async function getCafeteriaMeals(
  items: CafeteriaMealCandidate[],
  eatingPreferences: readonly string[]
): Promise<MenuMeal[]> {
  const llmMeals = await requestCafeteriaMeals(items, eatingPreferences).catch((error) => {
    if (isOpenAiDebug) {
      console.warn('[cafeteria-meals] Local AI request failed; using local fallback.', error);
    }
    return [];
  });
  const validatedMeals = validateLlmMeals(llmMeals, items);

  if (isOpenAiDebug) {
    console.log('[cafeteria-meals] Valid AI meals:', validatedMeals);
  }

  if (validatedMeals.length > 0) return validatedMeals;

  const fallback = composeCafeteriaMeal(items, getHealthPreference(eatingPreferences));
  return fallback
    ? [
        {
          name: fallback.items.map((item) => item.name).join(' + '),
          description: 'Cafeteria meal · protein, carb/starch, and vegetables when available',
          healthTag: healthTagForScore(fallback.averageHealthScore),
        },
      ]
    : [];
}

async function requestCafeteriaMeals(
  items: CafeteriaMealCandidate[],
  eatingPreferences: readonly string[]
): Promise<LlmResponse['meals']> {
  const response = await fetch(LOCAL_CAFETERIA_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      healthPreference: eatingPreferences,
      availableMenuItems: items.map(({ id, name, section }) => ({ id, name, section })),
    }),
  });
  const body = (await response.json()) as LlmResponse & { error?: string };

  if (isOpenAiDebug) {
    console.log('[cafeteria-meals] Local AI response:', body);
  }

  if (!response.ok || !Array.isArray(body.meals)) {
    throw new Error(body.error ?? `Local AI server returned ${response.status}.`);
  }

  return body.meals;
}

function validateLlmMeals(meals: LlmMeal[], candidates: CafeteriaMealCandidate[]): MenuMeal[] {
  const candidateById = new Map(candidates.map((item) => [item.id, item]));
  const seenCombinations = new Set<string>();
  const validMeals: MenuMeal[] = [];

  for (const meal of meals) {
    const itemIds = [meal.proteinItemId, meal.carbItemId, meal.vegetableItemId].filter(
      (id): id is string => typeof id === 'string'
    );
    const uniqueIds = [...new Set(itemIds)];
    const selectedItems = uniqueIds.map((id) => candidateById.get(id));
    const invalidReason =
      uniqueIds.length === 0
        ? 'The meal did not select any item IDs.'
        : uniqueIds.length !== itemIds.length
          ? 'The same menu item was assigned to multiple meal categories.'
          : selectedItems.some((item) => item === undefined)
            ? 'The meal included an ID that is not in this cafeteria menu.'
            : !isHealthTag(meal.healthTag)
              ? 'The meal has an invalid health tag.'
              : undefined;

    if (invalidReason) {
      if (isOpenAiDebug) console.warn('[cafeteria-meals] Rejected AI meal:', invalidReason, meal);
      continue;
    }

    const combinationKey = uniqueIds.slice().sort().join('|');
    if (seenCombinations.has(combinationKey)) {
      if (isOpenAiDebug) console.warn('[cafeteria-meals] Rejected duplicate AI meal:', meal);
      continue;
    }
    seenCombinations.add(combinationKey);

    validMeals.push({
      name: (selectedItems as CafeteriaMealCandidate[]).map((item) => item.name).join(' + '),
      description: 'Cafeteria meal · AI-selected from today’s eligible menu',
      healthTag: meal.healthTag,
    });
  }

  return validMeals;
}

function getHealthPreference(labels: readonly string[]): CafeteriaHealthPreference {
  const values = new Set(labels.map((label) => label.toLowerCase().replace(/\s/g, '')));
  if (values.has('healthy') && !values.has('unhealthy')) return 'healthy';
  if (values.has('unhealthy') && !values.has('healthy')) return 'unhealthy';
  return 'neutral';
}

function healthTagForScore(score: number): HealthTag {
  if (score >= 0.7) return 'Healthy';
  if (score >= 0.4) return 'Kinda Healthy';
  return 'Unhealthy';
}

function isHealthTag(value: string): value is HealthTag {
  return value === 'Healthy' || value === 'Kinda Healthy' || value === 'Unhealthy';
}
