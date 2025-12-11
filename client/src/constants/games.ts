export const SUPPORTED_GAMES = [
  { id: 'omega_ruby', label: 'Pokémon Omega Ruby' },
  { id: 'alpha_sapphire', label: 'Pokémon Alpha Sapphire' }
] as const;

export type GameId = (typeof SUPPORTED_GAMES)[number]['id'];
