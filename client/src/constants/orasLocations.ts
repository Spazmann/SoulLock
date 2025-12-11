export interface EncounterLocation {
  id: string;
  label: string;
  areas: string[];
  optional?: boolean;
  notes?: string;
  extraPokemon?: string[];
}

// Areas reference PokeAPI location-area identifiers for Omega Ruby and Alpha Sapphire.
export const ORAS_ENCOUNTER_LOCATIONS: EncounterLocation[] = [
  {
    id: 'littleroot-town',
    label: 'Littleroot Town',
    areas: ['littleroot-town-area'],
    extraPokemon: ['treecko', 'torchic', 'mudkip']
  },
  {
    id: 'hoenn-route-101',
    label: 'Route 101',
    areas: ['hoenn-route-101-area']
  },
  {
    id: 'hoenn-route-102',
    label: 'Route 102',
    areas: ['hoenn-route-102-area']
  },
  {
    id: 'hoenn-route-103',
    label: 'Route 103',
    areas: ['hoenn-route-103-area']
  },
  {
    id: 'hoenn-route-104',
    label: 'Route 104',
    areas: ['hoenn-route-104-area']
  },
  {
    id: 'petalburg-woods',
    label: 'Petalburg Woods',
    areas: ['petalburg-woods-area']
  },
  {
    id: 'petalburg-city',
    label: 'Petalburg City',
    areas: ['petalburg-city-area'],
    optional: true
  },
  {
    id: 'hoenn-route-116',
    label: 'Route 116',
    areas: ['hoenn-route-116-area']
  },
  {
    id: 'rusturf-tunnel',
    label: 'Rusturf Tunnel',
    areas: ['rusturf-tunnel-area']
  },
  {
    id: 'rustboro-city',
    label: 'Rustboro City',
    areas: ['rustboro-city-area'],
    optional: true
  },
  {
    id: 'dewford-town',
    label: 'Dewford Town',
    areas: ['dewford-town-area'],
    optional: true
  },
  {
    id: 'hoenn-route-106',
    label: 'Route 106',
    areas: ['hoenn-route-106-area']
  },
  {
    id: 'granite-cave',
    label: 'Granite Cave',
    areas: ['granite-cave-1f', 'granite-cave-1fsmall-room', 'granite-cave-b1f', 'granite-cave-b2f']
  },
  {
    id: 'hoenn-route-107',
    label: 'Route 107',
    areas: ['hoenn-route-107-area']
  },
  {
    id: 'hoenn-route-108',
    label: 'Route 108',
    areas: ['hoenn-route-108-area']
  },
  {
    id: 'sea-mauville',
    label: 'Sea Mauville',
    areas: ['sea-mauville-area', 'sea-mauville-inside', 'sea-mauville-outside'],
    optional: true
  },
  {
    id: 'hoenn-route-109',
    label: 'Route 109',
    areas: ['hoenn-route-109-area']
  },
  {
    id: 'slateport-city',
    label: 'Slateport City',
    areas: ['slateport-city-area', 'slateport-city-contest-hall'],
    optional: true
  },
  {
    id: 'hoenn-route-110',
    label: 'Route 110',
    areas: ['hoenn-route-110-area']
  },
  {
    id: 'new-mauville',
    label: 'New Mauville',
    areas: ['new-mauville-area', 'new-mauville-entrance'],
    optional: true
  },
  {
    id: 'hoenn-route-117',
    label: 'Route 117',
    areas: ['hoenn-route-117-area']
  },
  {
    id: 'hoenn-route-111',
    label: 'Route 111',
    areas: ['hoenn-route-111-area']
  },
  {
    id: 'mirage-tower',
    label: 'Mirage Tower',
    areas: ['mirage-tower-area'],
    optional: true
  },
  {
    id: 'desert-ruins',
    label: 'Desert Ruins',
    areas: ['desert-ruins-area'],
    optional: true
  },
  {
    id: 'desert-underpass',
    label: 'Desert Underpass',
    areas: ['desert-underpass-area'],
    optional: true
  },
  {
    id: 'hoenn-route-112',
    label: 'Route 112',
    areas: ['hoenn-route-112-area']
  },
  {
    id: 'fiery-path',
    label: 'Fiery Path',
    areas: ['fiery-path-area']
  },
  {
    id: 'jagged-pass',
    label: 'Jagged Pass',
    areas: ['jagged-pass-area']
  },
  {
    id: 'lavaridge-town',
    label: 'Lavaridge Town',
    areas: ['lavaridge-town-area'],
    optional: true
  },
  {
    id: 'hoenn-route-113',
    label: 'Route 113',
    areas: ['hoenn-route-113-area']
  },
  {
    id: 'hoenn-route-114',
    label: 'Route 114',
    areas: ['hoenn-route-114-area']
  },
  {
    id: 'meteor-falls',
    label: 'Meteor Falls',
    areas: ['meteor-falls-area', 'meteor-falls-b1f', 'meteor-falls-back', 'meteor-falls-backsmall-room']
  },
  {
    id: 'hoenn-route-115',
    label: 'Route 115',
    areas: ['hoenn-route-115-area']
  },
  {
    id: 'hoenn-route-118',
    label: 'Route 118',
    areas: ['hoenn-route-118-area']
  },
  {
    id: 'hoenn-route-119',
    label: 'Route 119',
    areas: ['hoenn-route-119-area', 'hoenn-route-119-weather-institute']
  },
  {
    id: 'scorched-slab',
    label: 'Scorched Slab',
    areas: ['scorched-slab-1f', 'scorched-slab-b1f', 'scorched-slab-b2f', 'scorched-slab-b3f'],
    optional: true
  },
  {
    id: 'hoenn-route-120',
    label: 'Route 120',
    areas: ['hoenn-route-120-area']
  },
  {
    id: 'ancient-tomb',
    label: 'Ancient Tomb',
    areas: ['ancient-tomb-area'],
    optional: true
  },
  {
    id: 'hoenn-route-121',
    label: 'Route 121',
    areas: ['hoenn-route-121-area']
  },
  {
    id: 'hoenn-safari-zone',
    label: 'Hoenn Safari Zone',
    areas: [
      'hoenn-safari-zone-expansion-north',
      'hoenn-safari-zone-expansion-south',
      'hoenn-safari-zone-neacro-bike-area',
      'hoenn-safari-zone-nwmach-bike-area',
      'hoenn-safari-zone-se',
      'hoenn-safari-zone-sw'
    ],
    optional: true
  },
  {
    id: 'hoenn-route-122',
    label: 'Route 122',
    areas: ['hoenn-route-122-area']
  },
  {
    id: 'mt-pyre',
    label: 'Mt. Pyre',
    areas: [
      'mt-pyre-1f',
      'mt-pyre-2f',
      'mt-pyre-3f',
      'mt-pyre-4f',
      'mt-pyre-5f',
      'mt-pyre-6f',
      'mt-pyre-outside',
      'mt-pyre-summit'
    ]
  },
  {
    id: 'hoenn-route-123',
    label: 'Route 123',
    areas: ['hoenn-route-123-area']
  },
  {
    id: 'lilycove-city',
    label: 'Lilycove City',
    areas: ['lilycove-city-area', 'lilycove-city-contest-hall'],
    optional: true
  },
  {
    id: 'team-aqua-hideout',
    label: 'Team Aqua Hideout',
    areas: ['team-aqua-hideout-area'],
    optional: true,
    notes: 'Alpha Sapphire main story'
  },
  {
    id: 'team-magma-hideout',
    label: 'Team Magma Hideout',
    areas: ['team-magma-hideout-area'],
    optional: true,
    notes: 'Omega Ruby main story'
  },
  {
    id: 'magma-hideout',
    label: 'Magma Hideout',
    areas: ['magma-hideout-area'],
    optional: true
  },
  {
    id: 'hoenn-route-124',
    label: 'Route 124',
    areas: ['hoenn-route-124-area', 'hoenn-route-124-underwater']
  },
  {
    id: 'mossdeep-city',
    label: 'Mossdeep City',
    areas: ['mossdeep-city-area', 'mossdeep-city-stevens-house'],
    optional: true
  },
  {
    id: 'hoenn-route-125',
    label: 'Route 125',
    areas: ['hoenn-route-125-area']
  },
  {
    id: 'shoal-cave',
    label: 'Shoal Cave',
    areas: ['shoal-cave-area', 'shoal-cave-b1f'],
    optional: true
  },
  {
    id: 'hoenn-route-126',
    label: 'Route 126',
    areas: ['hoenn-route-126-area', 'hoenn-route-126-underwater']
  },
  {
    id: 'sootopolis-city',
    label: 'Sootopolis City',
    areas: ['sootopolis-city-area']
  },
  {
    id: 'cave-of-origin',
    label: 'Cave of Origin',
    areas: [
      'cave-of-origin-1f',
      'cave-of-origin-b1f',
      'cave-of-origin-b2f',
      'cave-of-origin-b3f',
      'cave-of-origin-b4f',
      'cave-of-origin-entrance'
    ]
  },
  {
    id: 'hoenn-route-127',
    label: 'Route 127',
    areas: ['hoenn-route-127-area']
  },
  {
    id: 'hoenn-route-128',
    label: 'Route 128',
    areas: ['hoenn-route-128-area']
  },
  {
    id: 'seafloor-cavern',
    label: 'Seafloor Cavern',
    areas: ['seafloor-cavern-area']
  },
  {
    id: 'hoenn-route-129',
    label: 'Route 129',
    areas: ['hoenn-route-129-area']
  },
  {
    id: 'hoenn-route-130',
    label: 'Route 130',
    areas: ['hoenn-route-130-area']
  },
  {
    id: 'hoenn-route-131',
    label: 'Route 131',
    areas: ['hoenn-route-131-area']
  },
  {
    id: 'sky-pillar',
    label: 'Sky Pillar',
    areas: ['sky-pillar-1f', 'sky-pillar-3f', 'sky-pillar-5f', 'sky-pillar-apex']
  },
  {
    id: 'pacifidlog-town',
    label: 'Pacifidlog Town',
    areas: ['pacifidlog-town-area'],
    optional: true
  },
  {
    id: 'hoenn-route-132',
    label: 'Route 132',
    areas: ['hoenn-route-132-area']
  },
  {
    id: 'hoenn-route-133',
    label: 'Route 133',
    areas: ['hoenn-route-133-area']
  },
  {
    id: 'hoenn-route-134',
    label: 'Route 134',
    areas: ['hoenn-route-134-area']
  },
  {
    id: 'ever-grande-city',
    label: 'Ever Grande City',
    areas: ['ever-grande-city-area']
  },
  {
    id: 'hoenn-victory-road',
    label: 'Victory Road',
    areas: ['hoenn-victory-road-1f', 'hoenn-victory-road-b1f', 'hoenn-victory-road-b2f']
  },
  {
    id: 'soaring-in-the-sky',
    label: 'Soaring in the Sky',
    areas: ['soaring-in-the-sky-area'],
    optional: true
  },
  {
    id: 'southern-island',
    label: 'Southern Island',
    areas: ['southern-island-area'],
    optional: true
  },
  {
    id: 'hoenn-altering-cave',
    label: 'Hoenn Altering Cave',
    areas: [
      'hoenn-altering-cave-a',
      'hoenn-altering-cave-b',
      'hoenn-altering-cave-c',
      'hoenn-altering-cave-d',
      'hoenn-altering-cave-e',
      'hoenn-altering-cave-f',
      'hoenn-altering-cave-g',
      'hoenn-altering-cave-h',
      'hoenn-altering-cave-i'
    ],
    optional: true
  },
  {
    id: 'island-cave',
    label: 'Island Cave',
    areas: ['island-cave-area'],
    optional: true
  },
  {
    id: 'marine-cave',
    label: 'Marine Cave',
    areas: ['marine-cave-area'],
    optional: true
  },
  {
    id: 'terra-cave',
    label: 'Terra Cave',
    areas: ['terra-cave-area'],
    optional: true
  }
];
