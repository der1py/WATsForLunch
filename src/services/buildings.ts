import buildingFixtures from '@/data/buildings.json';

export type Building = (typeof buildingFixtures)[number];

const defaultBuildingName = 'Mathematics and Computer Building (MC)';

export function searchBuildings(query: string): Building[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [...buildingFixtures];
  }

  return buildingFixtures.filter((building) =>
    `${building.name} ${building.address}`.toLocaleLowerCase().includes(normalizedQuery)
  );
}

export function getBuildingByName(name: string): Building | undefined {
  return buildingFixtures.find((building) => building.name === name);
}

export function getDefaultBuilding(): Building {
  return getBuildingByName(defaultBuildingName)!;
}
