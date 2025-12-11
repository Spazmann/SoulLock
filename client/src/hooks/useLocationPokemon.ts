import { useEffect, useState } from 'react';
import { getPokemonOptionsForLocation } from '../api/encounters';
import type { GameSeriesId } from '../types';

interface UseLocationPokemonResult {
  options: string[];
  status: 'idle' | 'loading' | 'success' | 'error';
}

export const useLocationPokemon = (locationId: string | null, series: GameSeriesId): UseLocationPokemonResult => {
  const [options, setOptions] = useState<string[]>([]);
  const [status, setStatus] = useState<UseLocationPokemonResult['status']>('idle');

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
    getPokemonOptionsForLocation(locationId, series)
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
  }, [locationId, series]);

  return { options, status };
};
