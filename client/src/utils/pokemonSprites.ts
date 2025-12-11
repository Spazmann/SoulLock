const spriteResultCache = new Map<string, string | null>();
const spriteRequestCache = new Map<string, Promise<string | null>>();

export const normalizeSpeciesKey = (species: string) => species.trim().toLowerCase();

export const getCachedSprite = (species: string): string | null | undefined => {
  const key = normalizeSpeciesKey(species);
  if (!spriteResultCache.has(key)) {
    return undefined;
  }
  return spriteResultCache.get(key) ?? null;
};

export const loadPokemonSprite = (species: string): Promise<string | null> => {
  const cacheKey = normalizeSpeciesKey(species);

  if (spriteResultCache.has(cacheKey)) {
    return Promise.resolve(spriteResultCache.get(cacheKey) ?? null);
  }

  const inflight = spriteRequestCache.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${cacheKey}/`);
      if (!response.ok) {
        throw new Error(`Failed to load sprite for ${species}`);
      }

      const data: {
        sprites?: {
          front_default?: string | null;
        };
      } = await response.json();

      const spriteUrl = data?.sprites?.front_default ?? null;
      spriteResultCache.set(cacheKey, spriteUrl);
      return spriteUrl;
    } catch (error) {
      spriteResultCache.set(cacheKey, null);
      return null;
    } finally {
      spriteRequestCache.delete(cacheKey);
    }
  })();

  spriteRequestCache.set(cacheKey, request);
  return request;
};
