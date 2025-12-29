export const SUPPORTED_GAMES = [
  { id: 'red', label: 'Pokémon Red' },
  { id: 'blue', label: 'Pokémon Blue' },
  { id: 'yellow', label: 'Pokémon Yellow' },
  { id: 'gold', label: 'Pokémon Gold' },
  { id: 'silver', label: 'Pokémon Silver' },
  { id: 'crystal', label: 'Pokémon Crystal' },
  { id: 'ruby', label: 'Pokémon Ruby' },
  { id: 'sapphire', label: 'Pokémon Sapphire' },
  { id: 'emerald', label: 'Pokémon Emerald' },
  { id: 'firered', label: 'Pokémon FireRed' },
  { id: 'leafgreen', label: 'Pokémon LeafGreen' },
  { id: 'diamond', label: 'Pokémon Diamond' },
  { id: 'pearl', label: 'Pokémon Pearl' },
  { id: 'platinum', label: 'Pokémon Platinum' },
  { id: 'heartgold', label: 'Pokémon HeartGold' },
  { id: 'soulsilver', label: 'Pokémon SoulSilver' },
  { id: 'black', label: 'Pokémon Black' },
  { id: 'white', label: 'Pokémon White' },
  { id: 'black2', label: 'Pokémon Black 2' },
  { id: 'white2', label: 'Pokémon White 2' },
  { id: 'x', label: 'Pokémon X' },
  { id: 'y', label: 'Pokémon Y' },
  { id: 'omega_ruby', label: 'Pokémon Omega Ruby' },
  { id: 'alpha_sapphire', label: 'Pokémon Alpha Sapphire' },
  { id: 'sun', label: 'Pokémon Sun' },
  { id: 'moon', label: 'Pokémon Moon' },
  { id: 'ultra_sun', label: 'Pokémon Ultra Sun' },
  { id: 'ultra_moon', label: 'Pokémon Ultra Moon' },
  { id: 'lets_go_pikachu', label: "Pokémon: Let's Go, Pikachu!" },
  { id: 'lets_go_eevee', label: "Pokémon: Let's Go, Eevee!" },
  { id: 'sword', label: 'Pokémon Sword' },
  { id: 'shield', label: 'Pokémon Shield' },
  { id: 'brilliant_diamond', label: 'Pokémon Brilliant Diamond' },
  { id: 'shining_pearl', label: 'Pokémon Shining Pearl' },
  { id: 'legends_arceus', label: 'Pokémon Legends: Arceus' },
  { id: 'scarlet', label: 'Pokémon Scarlet' },
  { id: 'violet', label: 'Pokémon Violet' }
] as const;

export type GameId = (typeof SUPPORTED_GAMES)[number]['id'];

export const ROOM_SUPPORTED_GAME_IDS = new Set<GameId>(['omega_ruby', 'alpha_sapphire', 'heartgold', 'soulsilver']);

export type GameGroupId =
  | 'gen1_rby'
  | 'gen2_gsc'
  | 'gen3_rs'
  | 'gen3_emerald'
  | 'gen3_frlg'
  | 'gen4_dp'
  | 'gen4_platinum'
  | 'gen4_hgss'
  | 'gen5_bw'
  | 'gen5_b2w2'
  | 'gen6_xy'
  | 'gen6_oras'
  | 'gen7_sm'
  | 'gen7_usum'
  | 'gen7_lets_go'
  | 'gen8_swsh'
  | 'gen8_bdsp'
  | 'gen8_pla'
  | 'gen9_sv';

export interface GameGroup {
  id: GameGroupId;
  label: string;
  gameIds: GameId[];
  defaultGameId: GameId;
}

export const GAME_GROUPS: GameGroup[] = [
  {
    id: 'gen1_rby',
    label: 'Red / Blue / Yellow',
    gameIds: ['red', 'blue', 'yellow'],
    defaultGameId: 'red'
  },
  {
    id: 'gen2_gsc',
    label: 'Gold / Silver / Crystal',
    gameIds: ['gold', 'silver', 'crystal'],
    defaultGameId: 'gold'
  },
  {
    id: 'gen3_rs',
    label: 'Ruby / Sapphire',
    gameIds: ['ruby', 'sapphire'],
    defaultGameId: 'ruby'
  },
  {
    id: 'gen3_emerald',
    label: 'Emerald',
    gameIds: ['emerald'],
    defaultGameId: 'emerald'
  },
  {
    id: 'gen3_frlg',
    label: 'FireRed / LeafGreen',
    gameIds: ['firered', 'leafgreen'],
    defaultGameId: 'firered'
  },
  {
    id: 'gen4_dp',
    label: 'Diamond / Pearl',
    gameIds: ['diamond', 'pearl'],
    defaultGameId: 'diamond'
  },
  {
    id: 'gen4_platinum',
    label: 'Platinum',
    gameIds: ['platinum'],
    defaultGameId: 'platinum'
  },
  {
    id: 'gen4_hgss',
    label: 'HeartGold / SoulSilver',
    gameIds: ['heartgold', 'soulsilver'],
    defaultGameId: 'heartgold'
  },
  {
    id: 'gen5_bw',
    label: 'Black / White',
    gameIds: ['black', 'white'],
    defaultGameId: 'black'
  },
  {
    id: 'gen5_b2w2',
    label: 'Black 2 / White 2',
    gameIds: ['black2', 'white2'],
    defaultGameId: 'black2'
  },
  {
    id: 'gen6_xy',
    label: 'X / Y',
    gameIds: ['x', 'y'],
    defaultGameId: 'x'
  },
  {
    id: 'gen6_oras',
    label: 'Omega Ruby / Alpha Sapphire',
    gameIds: ['omega_ruby', 'alpha_sapphire'],
    defaultGameId: 'omega_ruby'
  },
  {
    id: 'gen7_sm',
    label: 'Sun / Moon',
    gameIds: ['sun', 'moon'],
    defaultGameId: 'sun'
  },
  {
    id: 'gen7_usum',
    label: 'Ultra Sun / Ultra Moon',
    gameIds: ['ultra_sun', 'ultra_moon'],
    defaultGameId: 'ultra_sun'
  },
  {
    id: 'gen7_lets_go',
    label: "Let's Go, Pikachu! / Let's Go, Eevee!",
    gameIds: ['lets_go_pikachu', 'lets_go_eevee'],
    defaultGameId: 'lets_go_pikachu'
  },
  {
    id: 'gen8_swsh',
    label: 'Sword / Shield',
    gameIds: ['sword', 'shield'],
    defaultGameId: 'sword'
  },
  {
    id: 'gen8_bdsp',
    label: 'Brilliant Diamond / Shining Pearl',
    gameIds: ['brilliant_diamond', 'shining_pearl'],
    defaultGameId: 'brilliant_diamond'
  },
  {
    id: 'gen8_pla',
    label: 'Legends: Arceus',
    gameIds: ['legends_arceus'],
    defaultGameId: 'legends_arceus'
  },
  {
    id: 'gen9_sv',
    label: 'Scarlet / Violet',
    gameIds: ['scarlet', 'violet'],
    defaultGameId: 'scarlet'
  }
];

export const getGameGroupForGameId = (gameId: string | null | undefined): GameGroup | null => {
  if (!gameId) {
    return null;
  }

  return GAME_GROUPS.find((group) => group.gameIds.includes(gameId as GameId)) ?? null;
};
