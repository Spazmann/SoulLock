export type PokemonStatus = 'active' | 'fainted' | 'boxed';
export type GameSeriesId = 'oras' | 'hgss' | 'sword_shield';
export type VanillaMode = 'standard' | 'randomizer' | 'multi_gen_randomizer';

export interface PokemonEntry {
  id: string;
  species: string;
  nickname: string;
  status: PokemonStatus;
  notes: string;
  slot: number;
  encounterId: string | null;
  trainerId: string | null;
}

export interface PlayerState {
  id: string;
  name: string;
  notes: string;
  team: PokemonEntry[];
  lockedBy: string | null;
}

export interface EncounterPokemonSelection {
  species: string | null;
  nickname: string;
  isDead: boolean;
}

export interface EncounterRow {
  id: string;
  locationId: string | null;
  pokemonSelections: Record<string, EncounterPokemonSelection>;
}

export interface RoomState {
  name: string;
  players: PlayerState[];
  encounters: EncounterRow[];
  gameSeries: GameSeriesId;
  vanillaMode: VanillaMode;
  roomGameId?: string | null;
  isConfigured?: boolean;
  createdAt?: number;
  lastUpdatedAt?: number;
}

export interface ServerRoomInit {
  roomId: string;
  state: RoomState;
}
