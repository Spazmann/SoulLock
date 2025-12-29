const regions = ['johto', 'kanto'];

const ALLOWED_VERSIONS = new Set(['heartgold', 'soulsilver']);
const DISALLOWED_METHODS = new Set(['gift', 'gift-egg', 'npc-trade']);

// Best-effort story progression ordering for the location picker.
// Any locations not in this list fall back to route-number heuristics, then stable label/id.
const STORY_ORDER = [
  'new-bark-town',
  'johto-route-29',
  'cherrygrove-city',
  'johto-route-30',
  'johto-route-31',
  'violet-city',
  'sprout-tower',
  'dark-cave',
  'johto-route-32',
  'ruins-of-alph',
  'union-cave',
  'johto-route-33',
  'azalea-town',
  'slowpoke-well',
  'ilex-forest',
  'johto-route-34',
  'goldenrod-city',
  'goldenrod-tunnel',
  'johto-route-35',
  'national-park',
  'johto-route-36',
  'johto-route-37',
  'ecruteak-city',
  'burned-tower',
  'johto-route-38',
  'johto-route-39',
  'olivine-city',
  'johto-lighthouse',
  'johto-sea-route-40',
  'johto-sea-route-41',
  'cianwood-city',
  'whirl-islands',
  'johto-route-42',
  'mt-mortar',
  'mahogany-town',
  'johto-route-43',
  'lake-of-rage',
  'johto-route-44',
  'ice-path',
  'blackthorn-city',
  'dragons-den',
  'johto-route-45',
  'johto-route-46',
  'johto-route-47',
  'johto-route-48',
  'johto-route-27',
  'tohjo-falls',
  'johto-route-26',
  'victory-road',
  'indigo-plateau',

  // Kanto (best-effort)
  'pallet-town',
  'kanto-route-1',
  'viridian-city',
  'kanto-route-2',
  'viridian-forest',
  'pewter-city',
  'kanto-route-3',
  'mt-moon',
  'kanto-route-4',
  'power-plant',
  'lavender-town',
  'rock-tunnel',
  'vermilion-city',
  'saffron-city',
  'fuchsia-city',
  'kanto-safari-zone',
  'kanto-sea-route-19',
  'kanto-sea-route-20',
  'kanto-sea-route-21',
  'seafoam-islands',
  'cerulean-cave'
];

const storyOrderIndex = new Map(STORY_ORDER.map((id, index) => [id, index]));

const extractNumber = (value, prefix) => {
  if (!value.startsWith(prefix)) {
    return null;
  }

  const rest = value.slice(prefix.length);
  const match = rest.match(/^(\d+)/);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
};

const getSortKey = (location) => {
  const explicit = storyOrderIndex.get(location.id);
  if (typeof explicit === 'number') {
    return explicit;
  }

  const johtoRoute = extractNumber(location.id, 'johto-route-');
  if (typeof johtoRoute === 'number') {
    return 1000 + johtoRoute;
  }

  const johtoSea = extractNumber(location.id, 'johto-sea-route-');
  if (typeof johtoSea === 'number') {
    return 1200 + johtoSea;
  }

  const kantoRoute = extractNumber(location.id, 'kanto-route-');
  if (typeof kantoRoute === 'number') {
    return 2000 + kantoRoute;
  }

  const kantoSea = extractNumber(location.id, 'kanto-sea-route-');
  if (typeof kantoSea === 'number') {
    return 2200 + kantoSea;
  }

  return 100000;
};

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${url}`);
  }
  return response.json();
};

const englishName = (names, fallback) => {
  const entry = Array.isArray(names)
    ? names.find((nameEntry) => nameEntry.language?.name === 'en' && nameEntry.name)
    : null;
  return entry?.name ?? fallback;
};

const methodIsAllowed = (methodName) => !DISALLOWED_METHODS.has(methodName);

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const main = async () => {
  const locations = [];
  const areaHasEncountersCache = new Map();

  const areaHasHgssEncounters = async (areaName) => {
    if (areaHasEncountersCache.has(areaName)) {
      return areaHasEncountersCache.get(areaName);
    }

    const promise = (async () => {
      const areaData = await getJson(`https://pokeapi.co/api/v2/location-area/${areaName}/`);

      const pokemonEncounters = areaData?.pokemon_encounters ?? [];
      for (const encounter of pokemonEncounters) {
        const versionDetails = encounter?.version_details ?? [];
        for (const versionDetail of versionDetails) {
          const versionName = versionDetail?.version?.name;
          if (!versionName || !ALLOWED_VERSIONS.has(versionName)) {
            continue;
          }

          const encounterDetails = versionDetail?.encounter_details ?? [];
          if (encounterDetails.some((detail) => methodIsAllowed(detail?.method?.name))) {
            return true;
          }
        }
      }

      return false;
    })();

    areaHasEncountersCache.set(areaName, promise);
    return promise;
  };

  for (const region of regions) {
    const regionData = await getJson(`https://pokeapi.co/api/v2/region/${region}/`);

    const regionLocations = regionData.locations ?? [];

    const expanded = await mapWithConcurrency(regionLocations, 6, async (locationRef) => {
      const location = await getJson(locationRef.url);

      const areaRefs = location.areas ?? [];
      const areaNames = areaRefs.map((area) => area.name).filter(Boolean);
      const allowedAreaNames = (await mapWithConcurrency(areaNames, 10, async (areaName) => {
        try {
          return (await areaHasHgssEncounters(areaName)) ? areaName : null;
        } catch {
          return null;
        }
      }))
        .filter(Boolean);

      return {
        id: location.name,
        label: englishName(location.names, location.name),
        areas: allowedAreaNames
      };
    });

    expanded.forEach((entry) => locations.push(entry));
  }

  const newBark = locations.find((entry) => entry.id === 'new-bark-town');
  if (newBark) {
    newBark.extraPokemon = ['chikorita', 'cyndaquil', 'totodile'];
  }

  const filteredLocations = locations.filter((entry) => {
    const hasAreas = Array.isArray(entry.areas) && entry.areas.length > 0;
    const hasExtras = Array.isArray(entry.extraPokemon) && entry.extraPokemon.length > 0;
    return hasAreas || hasExtras;
  });

  filteredLocations.sort((a, b) => {
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);
    if (keyA !== keyB) {
      return keyA - keyB;
    }

    // Stable fallback so the output doesn't thrash.
    const labelCompare = String(a.label).localeCompare(String(b.label));
    return labelCompare !== 0 ? labelCompare : String(a.id).localeCompare(String(b.id));
  });

  const output =
    "import type { EncounterLocation } from './orasLocations';\n\n" +
    "// Auto-generated via PokeAPI by scripts/generate-hgss-locations.mjs\n" +
    "// Do not edit by hand.\n\n" +
    `export const HGSS_ENCOUNTER_LOCATIONS: EncounterLocation[] = ${JSON.stringify(filteredLocations, null, 2)};\n`;

  process.stdout.write(output);
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
