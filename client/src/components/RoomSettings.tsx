import { useId, useState, type ChangeEvent } from 'react';
import type { GameSeriesId, VanillaMode } from '../types';
import styles from './RoomSettings.module.css';

interface RoomSettingsProps {
  gameSeries: GameSeriesId;
  vanillaMode: VanillaMode;
  onGameSeriesChange: (series: GameSeriesId) => void;
  onVanillaChange: (mode: VanillaMode) => void;
}

const GAME_SERIES_OPTIONS: Array<{
  id: GameSeriesId;
  label: string;
  disabled?: boolean;
}> = [
  {
    id: 'oras',
    label: 'Pokémon Omega Ruby & Pokémon Alpha Sapphire'
  },
  {
    id: 'sword_shield',
    label: 'Other Games',
    disabled: true
  }
];

const VANILLA_OPTIONS: Array<{
  id: VanillaMode;
  label: string;
}> = [
  { id: 'standard', label: 'No randomizers' },
  { id: 'randomizer', label: 'Randomizer' }
];

const RoomSettings = ({ gameSeries, vanillaMode, onGameSeriesChange, onVanillaChange }: RoomSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelTitleId = useId();
  const gameSeriesSelectId = useId();
  const vanillaFieldsetId = useId();
  const handleToggle = () => {
    setIsOpen((previous) => !previous);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleGameSeriesChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as GameSeriesId;
    if (value === gameSeries) {
      return;
    }

    if (GAME_SERIES_OPTIONS.find((option) => option.id === value && option.disabled)) {
      return;
    }

    onGameSeriesChange(value);
  };

  const handleVanillaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as VanillaMode;
    if (value === vanillaMode) {
      return;
    }

    onVanillaChange(value);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        Room settings
      </button>

      {isOpen && (
        <div className={styles.panel} role="dialog" aria-modal="false" aria-labelledby={panelTitleId}>
          <div className={styles.panelHeader}>
            <h3 id={panelTitleId}>Room settings</h3>
            <button type="button" className={styles.closeButton} onClick={handleClose}>
              Close
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor={gameSeriesSelectId} className={styles.fieldLabel}>
              Game series
            </label>
            <select
              id={gameSeriesSelectId}
              className={styles.select}
              value={gameSeries}
              onChange={handleGameSeriesChange}
            >
              {GAME_SERIES_OPTIONS.map((option) => (
                <option key={option.id} value={option.id} disabled={option.disabled}>
                  {option.label}
                  {option.disabled ? ' (coming soon)' : ''}
                </option>
              ))}
            </select>
            <p className={styles.helperText}>Other Games support is coming soon.</p>
          </div>

          <fieldset className={styles.fieldGroup} aria-labelledby={vanillaFieldsetId}>
            <legend id={vanillaFieldsetId} className={styles.fieldLabel}>
              Vanilla gameplay
            </legend>
            <div className={styles.radioGroup}>
              {VANILLA_OPTIONS.map((option) => (
                <label key={option.id} className={styles.radioOption}>
                  <input
                    type="radio"
                    name="vanilla-mode"
                    value={option.id}
                    checked={vanillaMode === option.id}
                    onChange={handleVanillaChange}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
};

export default RoomSettings;
