import type { PokemonStatus } from '../types';

export const POKEMON_STATUSES: { value: PokemonStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'fainted', label: 'Fainted' },
  { value: 'boxed', label: 'Boxed' }
];
