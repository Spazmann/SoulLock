import { useEffect, useState } from 'react';
import { getAllPokemonSpeciesOptions, getPokemonOptionsForLocation, getPokemonOptionsForSeries } from '../api/encounters';
import type { GameSeriesId, VanillaMode } from '../types';

interface UseEncounterPokemonOptionsResult {
  options: string[];
  status: 'idle' | 'loading' | 'success' | 'error';
}

export const useEncounterPokemonOptions = (
  locationId: string | null,
  series: GameSeriesId,
  vanillaMode: VanillaMode
): UseEncounterPokemonOptionsResult => {
  const [options, setOptions] = useState<string[]>([]);
  const [status, setStatus] = useState<UseEncounterPokemonOptionsResult['status']>('idle');

  useEffect(() => {
    let cancelled = false;

    if (!locationId) {
      setOptions([]);
      setStatus('idle');
      return () => {
        cancelled = true;
      };
    }

    setStatus('loading');

    const loader =
      vanillaMode === 'multi_gen_randomizer'
        ? getAllPokemonSpeciesOptions()
        : vanillaMode === 'randomizer'
          ? getPokemonOptionsForSeries(series)
          : getPokemonOptionsForLocation(locationId, series);

    loader
      .then((pokemon) => {
        if (!cancelled) {
          setOptions(pokemon);
          setStatus('success');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, series, vanillaMode]);

  return { options, status };
};
