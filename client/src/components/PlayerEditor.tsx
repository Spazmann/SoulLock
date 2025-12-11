import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { PlayerState } from '../types';
import styles from './PlayerEditor.module.css';

interface PlayerEditorProps {
  player: PlayerState;
  currentClientId: string;
  onChange: (player: PlayerState) => void;
  onRemove: () => void;
  onToggleLock: (lock: boolean) => void;
}

const PlayerEditor = ({ player, currentClientId, onChange, onRemove, onToggleLock }: PlayerEditorProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isLockedByCurrentClient = player.lockedBy === currentClientId;
  const isLockedBySomeoneElse = Boolean(player.lockedBy) && !isLockedByCurrentClient;

  useEffect(() => {
    if (isLockedBySomeoneElse && isSettingsOpen) {
      setIsSettingsOpen(false);
    }
  }, [isLockedBySomeoneElse, isSettingsOpen]);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...player, name: event.target.value });
  };

  const handleToggleLock = () => {
    if (isLockedBySomeoneElse) {
      return;
    }

    onToggleLock(!isLockedByCurrentClient);
  };

  const handleToggleSettings = () => {
    if (isLockedBySomeoneElse) {
      return;
    }

    setIsSettingsOpen((previous) => !previous);
  };

  return (
    <div className={styles.card}>
      <div className={styles.mainRow}>
        <input
          className={styles.playerName}
          placeholder="Trainer name"
          value={player.name}
          onChange={handleNameChange}
          disabled={isLockedBySomeoneElse}
        />
        {player.lockedBy && (
          <span className={`${styles.badge} ${isLockedByCurrentClient ? styles.selfBadge : styles.lockedBadge}`}>
            {isLockedByCurrentClient ? 'This is you' : 'Locked'}
          </span>
        )}
        <button
          type="button"
          className={styles.settingsButton}
          onClick={handleToggleSettings}
          disabled={isLockedBySomeoneElse}
          aria-expanded={isSettingsOpen}
        >
          Settings
        </button>
      </div>
      {isSettingsOpen && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsActions}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.primaryAction}`}
              onClick={handleToggleLock}
            >
              {isLockedByCurrentClient ? 'Unlock slot' : 'Claim this slot'}
            </button>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.dangerAction}`}
              onClick={onRemove}
              disabled={isLockedBySomeoneElse}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerEditor;
