export const restaurantFixtures = [
  {
    id: 'green-table',
    place: 'Green Table',
    travelTime: '6 min walk',
    location: {
      address: '200 University Avenue West, Waterloo, ON',
      latitude: 43.4723,
      longitude: -80.5449,
    },
    meals: [
      {
        name: 'Harvest grain bowl',
        description: 'Roasted vegetables, greens, quinoa, and tahini dressing.',
        healthTag: 'Healthy',
        dietaryTags: ['Vegan', 'Vegetarian', 'No pork', 'No alcohol'],
        allergens: { Sesame: 'contains', 'Tree nuts': 'may_contain' },
      },
      {
        name: 'Chicken pesto sandwich',
        description: 'Grilled chicken, pesto, tomato, and mixed greens.',
        healthTag: 'Kinda Healthy',
        dietaryTags: ['No pork', 'No alcohol'],
        allergens: { Wheat: 'contains', Dairy: 'contains', 'Tree nuts': 'contains' },
      },
      {
        name: 'Crispy chicken wrap',
        description: 'Crispy chicken, slaw, and house sauce in a warm wrap.',
        healthTag: 'Unhealthy',
        dietaryTags: ['No pork', 'No alcohol'],
        allergens: { Wheat: 'contains', Egg: 'contains' },
      },
    ],
  },
  {
    id: 'market-kitchen',
    place: 'Market Kitchen',
    travelTime: '9 min walk',
    location: {
      address: '75 University Avenue West, Waterloo, ON',
      latitude: 43.4701,
      longitude: -80.5431,
    },
    meals: [
      {
        name: 'Salmon poke bowl',
        description: 'Salmon, edamame, cucumber, seaweed, and brown rice.',
        healthTag: 'Healthy',
        dietaryTags: ['No pork', 'No alcohol'],
        allergens: { Sesame: 'contains' },
      },
      {
        name: 'Turkey club',
        description: 'Turkey, avocado, tomato, greens, and multigrain bread.',
        healthTag: 'Kinda Healthy',
        dietaryTags: ['No pork', 'No alcohol'],
        allergens: { Wheat: 'contains', Egg: 'may_contain' },
      },
      {
        name: 'Loaded poutine',
        description: 'Crispy fries, cheese curds, gravy, and green onions.',
        healthTag: 'Unhealthy',
        dietaryTags: ['Vegetarian', 'No alcohol'],
        allergens: { Dairy: 'contains', Wheat: 'may_contain' },
      },
    ],
  },
  {
    id: 'corner-noodle',
    place: 'Corner Noodle',
    travelTime: '12 min walk',
    location: {
      address: '140 University Avenue West, Waterloo, ON',
      latitude: 43.4689,
      longitude: -80.5456,
    },
    meals: [
      {
        name: 'Ginger tofu noodle soup',
        description: 'Tofu, bok choy, mushrooms, ginger broth, and noodles.',
        healthTag: 'Healthy',
        dietaryTags: ['Vegan', 'Vegetarian', 'No pork', 'No alcohol'],
        allergens: { Wheat: 'contains' },
      },
      {
        name: 'Chicken ramen',
        description: 'Chicken, egg, corn, scallions, and savoury broth.',
        healthTag: 'Kinda Healthy',
        dietaryTags: ['No pork', 'No alcohol'],
        allergens: { Wheat: 'contains', Egg: 'contains' },
      },
      {
        name: 'Spicy fried noodles',
        description: 'Wok-fried noodles with crispy shallots and chili oil.',
        healthTag: 'Unhealthy',
        dietaryTags: ['Vegan', 'Vegetarian', 'No pork', 'No alcohol'],
        allergens: { Wheat: 'contains' },
      },
    ],
  },
  {
    id: 'cedar-grill',
    place: 'Cedar Grill',
    travelTime: '14 min walk',
    location: {
      address: '50 University Avenue West, Waterloo, ON',
      latitude: 43.4675,
      longitude: -80.5418,
    },
    meals: [
      {
        name: 'Falafel plate',
        description: 'Falafel, rice, salad, pickles, and garlic sauce.',
        healthTag: 'Healthy',
        dietaryTags: ['Halal', 'Vegan', 'Vegetarian', 'No pork', 'No alcohol'],
        allergens: { Sesame: 'may_contain' },
      },
      {
        name: 'Grilled chicken plate',
        description: 'Chargrilled chicken, rice, salad, and garlic sauce.',
        healthTag: 'Kinda Healthy',
        dietaryTags: ['Halal', 'No pork', 'No alcohol'],
        allergens: { Dairy: 'may_contain' },
      },
    ],
  },
] as const;
