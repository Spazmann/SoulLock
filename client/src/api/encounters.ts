import type { GameSeriesId } from '../types';
import type { EncounterLocation } from '../constants/orasLocations';
import { ORAS_ENCOUNTER_LOCATIONS } from '../constants/orasLocations';
import { HGSS_ENCOUNTER_LOCATIONS } from '../constants/hgssLocations';

type LocationIndex = Map<string, EncounterLocation>;

const SERIES_LOCATIONS: Record<GameSeriesId, EncounterLocation[]> = {
  oras: ORAS_ENCOUNTER_LOCATIONS,
  hgss: HGSS_ENCOUNTER_LOCATIONS,
  sword_shield: []
};

const locationIndexes = new Map<GameSeriesId, LocationIndex>();
const areaPokemonCache = new Map<string, Promise<string[]>>();

const SERIES_ALLOWED_VERSIONS: Record<GameSeriesId, ReadonlySet<string> | null> = {
  oras: new Set(['omega-ruby', 'alpha-sapphire', 'ruby', 'sapphire', 'emerald']),
  hgss: new Set(['heartgold', 'soulsilver']),
  sword_shield: new Set(['sword', 'shield'])
};

const DISALLOWED_METHODS = new Set(['gift', 'gift-egg', 'npc-trade']);

const getLocationIndex = (series: GameSeriesId): LocationIndex => {
  if (!locationIndexes.has(series)) {
    const locations = SERIES_LOCATIONS[series] ?? SERIES_LOCATIONS.oras;
    locationIndexes.set(series, new Map(locations.map((location) => [location.id, location])));
  }

  return locationIndexes.get(series) ?? new Map();
};

const methodIsAllowed = (methodName: string) => !DISALLOWED_METHODS.has(methodName);

const fetchAreaPokemon = async (areaName: string, series: GameSeriesId): Promise<string[]> => {
  const response = await fetch(`https://pokeapi.co/api/v2/location-area/${areaName}/`);
  if (!response.ok) {
    throw new Error(`Failed to load encounters for ${areaName}`);
  }

  const data: {
    pokemon_encounters: Array<{
      pokemon: { name: string };
      version_details: Array<{
        version: { name: string };
        encounter_details: Array<{
          method: { name: string };
        }>;
      }>;
    }>;
  } = await response.json();

  const allowedVersions = SERIES_ALLOWED_VERSIONS[series];
  const hasVersionConstraint = Boolean(allowedVersions && allowedVersions.size > 0);

  const names = new Set<string>();

  for (const encounter of data.pokemon_encounters) {
    const hasAllowedEncounter = encounter.version_details.some((versionDetail) => {
      if (hasVersionConstraint && allowedVersions && !allowedVersions.has(versionDetail.version.name)) {
        return false;
      }

      return versionDetail.encounter_details.some((detail) => methodIsAllowed(detail.method.name));
    });

    if (hasAllowedEncounter) {
      names.add(encounter.pokemon.name);
    }
  }

  return Array.from(names);
};

const loadLocationPokemon = async (locationId: string, series: GameSeriesId): Promise<string[]> => {
  const locationIndex = getLocationIndex(series);
  const location = locationIndex.get(locationId);
  if (!location) {
    return [];
  }

  const pokemonSet = new Set<string>();

  for (const area of location.areas) {
    try {
      const areaPokemon = await fetchAreaPokemon(area, series);
      areaPokemon.forEach((pokemonName) => pokemonSet.add(pokemonName));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  if (Array.isArray(location.extraPokemon)) {
    location.extraPokemon.forEach((pokemonName) => pokemonSet.add(pokemonName));
  }

  return Array.from(pokemonSet).sort((a, b) => a.localeCompare(b));
};

export const getEncounterLocations = (series: GameSeriesId): EncounterLocation[] => {
  return SERIES_LOCATIONS[series] ?? SERIES_LOCATIONS.oras;
};

export const getPokemonOptionsForLocation = (locationId: string | null, series: GameSeriesId): Promise<string[]> => {
  if (!locationId) {
    return Promise.resolve([]);
  }

  const cacheKey = `${series}::${locationId}`;
  if (!areaPokemonCache.has(cacheKey)) {
    areaPokemonCache.set(cacheKey, loadLocationPokemon(locationId, series));
  }

  return areaPokemonCache.get(cacheKey) ?? Promise.resolve([]);
};

export const getLocationLabel = (locationId: string | null, series: GameSeriesId): string => {
  if (!locationId) {
    return '';
  }

  const locationIndex = getLocationIndex(series);
  const location = locationIndex.get(locationId);
  return location?.label ?? '';
};

export const isValidLocationId = (locationId: string | null, series: GameSeriesId): boolean => {
  if (!locationId) {
    return false;
  }

  const locationIndex = getLocationIndex(series);
  return locationIndex.has(locationId);
};

export type { EncounterLocation };
