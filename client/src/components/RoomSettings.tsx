import { useId, useState, type ChangeEvent } from 'react';
import type { VanillaMode } from '../types';
import { GAME_GROUPS, ROOM_SUPPORTED_GAME_IDS, getGameGroupForGameId } from '../constants/games';
import styles from './RoomSettings.module.css';

interface RoomSettingsProps {
  vanillaMode: VanillaMode;
  roomGameId: string | null;
  onVanillaChange: (mode: VanillaMode) => void;
  onRoomGameChange: (gameId: string) => void;
  variant?: 'popover' | 'inline';
  showGamePicker?: boolean;
}

const VANILLA_OPTIONS: Array<{
  id: VanillaMode;
  label: string;
}> = [
  { id: 'standard', label: 'No randomizers' },
  { id: 'randomizer', label: 'Randomizer' },
  { id: 'multi_gen_randomizer', label: 'Multi-Gen Randomizer' }
];

const RoomSettings = ({
  vanillaMode,
  roomGameId,
  onVanillaChange,
  onRoomGameChange,
  variant = 'popover',
  showGamePicker = true
}: RoomSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelTitleId = useId();
  const roomGameSelectId = useId();
  const vanillaFieldsetId = useId();
  const handleToggle = () => {
    setIsOpen((previous) => !previous);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleVanillaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as VanillaMode;
    if (value === vanillaMode) {
      return;
    }

    onVanillaChange(value);
  };

  const handleRoomGameChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const groupId = event.target.value;
    if (!groupId) {
      return;
    }

    const group = GAME_GROUPS.find((entry) => entry.id === groupId) ?? null;
    if (!group) {
      return;
    }

    const nextGameId = group.defaultGameId;

    if (nextGameId === roomGameId) {
      return;
    }

    if (!ROOM_SUPPORTED_GAME_IDS.has(nextGameId as never)) {
      return;
    }

    onRoomGameChange(nextGameId);
  };

  const panelContent = (
    <div
      className={`${styles.panel} ${variant === 'inline' ? styles.inlinePanel : ''}`}
      role={variant === 'popover' ? 'dialog' : undefined}
      aria-modal="false"
      aria-labelledby={panelTitleId}
    >
      <div className={styles.panelHeader}>
        <h3 id={panelTitleId}>Room settings</h3>
        {variant === 'popover' && (
          <button type="button" className={styles.closeButton} onClick={handleClose}>
            Close
          </button>
        )}
      </div>

      {showGamePicker && (
        <div className={styles.fieldGroup}>
          <label htmlFor={roomGameSelectId} className={styles.fieldLabel}>
            Pokémon game
          </label>
          <select
            id={roomGameSelectId}
            className={styles.select}
            value={getGameGroupForGameId(roomGameId)?.id ?? ''}
            onChange={handleRoomGameChange}
          >
            <option value="" disabled>
              Select a game…
            </option>
            {GAME_GROUPS.map((option) => {
              const supported = option.gameIds.some((id) => ROOM_SUPPORTED_GAME_IDS.has(id as never));
              return (
                <option key={option.id} value={option.id} disabled={!supported}>
                  {option.label}
                  {!supported ? ' (coming soon)' : ''}
                </option>
              );
            })}
          </select>
          <p className={styles.helperText}>More games will unlock as encounter tables are added.</p>
        </div>
      )}

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

      {vanillaMode !== 'standard' && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Randomizer preset
          </label>
          <select className={styles.select} value="coming_soon" disabled>
            <option value="coming_soon">Coming soon</option>
          </select>
          <p className={styles.helperText}>Randomizer configuration will be added next.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.wrapper}>
      {variant === 'popover' && (
        <button
          type="button"
          className={styles.trigger}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={handleToggle}
        >
          Room settings
        </button>
      )}

      {variant === 'inline' ? panelContent : isOpen ? panelContent : null}
    </div>
  );
};

export default RoomSettings;
