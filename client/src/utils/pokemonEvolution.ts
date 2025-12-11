import { normalizeSpeciesKey } from './pokemonSprites';

const evolutionResultCache = new Map<string, string | null>();
const evolutionRequestCache = new Map<string, Promise<string | null>>();

const formatSpeciesName = (rawName: string) => {
  const parts = rawName.split('-');
  return parts
    .map((part) => {
      if (!part) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};

interface EvolutionNode {
  species?: {
    name?: string;
  };
  evolves_to?: EvolutionNode[];
}

const findNextEvolution = (node: EvolutionNode | undefined, target: string): string | null => {
  if (!node) {
    return null;
  }

  const nodeKey = normalizeSpeciesKey(node.species?.name ?? '');
  if (nodeKey === target) {
    const next = node.evolves_to?.[0];
    return next?.species?.name ?? null;
  }

  for (const child of node.evolves_to ?? []) {
    const result = findNextEvolution(child, target);
    if (result) {
      return result;
    }
  }

  return null;
};

export const loadNextEvolution = (species: string): Promise<string | null> => {
  const cacheKey = normalizeSpeciesKey(species);
  if (evolutionResultCache.has(cacheKey)) {
    return Promise.resolve(evolutionResultCache.get(cacheKey) ?? null);
  }

  const inflight = evolutionRequestCache.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${cacheKey}/`);
      if (!speciesResponse.ok) {
        throw new Error('species lookup failed');
      }
      const speciesData: {
        evolution_chain?: {
          url?: string;
        };
      } = await speciesResponse.json();
      const chainUrl = speciesData?.evolution_chain?.url;
      if (!chainUrl) {
        evolutionResultCache.set(cacheKey, null);
        return null;
      }

      const chainResponse = await fetch(chainUrl);
      if (!chainResponse.ok) {
        throw new Error('chain lookup failed');
      }
      const chainData: {
        chain?: EvolutionNode;
      } = await chainResponse.json();

      const nextRaw = findNextEvolution(chainData?.chain, cacheKey);
      if (!nextRaw) {
        evolutionResultCache.set(cacheKey, null);
        return null;
      }

      const formatted = formatSpeciesName(nextRaw);
      evolutionResultCache.set(cacheKey, formatted);
      return formatted;
    } catch (error) {
      evolutionResultCache.set(cacheKey, null);
      return null;
    } finally {
      evolutionRequestCache.delete(cacheKey);
    }
  })();

  evolutionRequestCache.set(cacheKey, request);
  return request;
};
