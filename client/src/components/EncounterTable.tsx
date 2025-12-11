import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChangeEvent, DragEvent } from 'react';
import type { EncounterRow, GameSeriesId, PlayerState } from '../types';
import { getEncounterLocations, getLocationLabel, isValidLocationId } from '../api/encounters';
import { useLocationPokemon } from '../hooks/useLocationPokemon';
import { PARTY_DRAG_TYPE } from '../constants/dragTypes';
import { getCachedSprite, loadPokemonSprite, normalizeSpeciesKey } from '../utils/pokemonSprites';
import styles from './EncounterTable.module.css';

interface EncounterTableProps {
  gameSeries: GameSeriesId;
  players: PlayerState[];
  encounters: EncounterRow[];
  currentPlayerId: string | null;
  onAddEncounter: (locationId: string) => void;
  onRemoveEncounter: (encounterId: string) => void;
  onUpdateLocation: (encounterId: string, locationId: string | null) => void;
  onUpdatePokemonSpecies: (encounterId: string, trainerId: string, species: string | null) => void;
  onUpdatePokemonNickname: (encounterId: string, trainerId: string, nickname: string) => void;
  onReviveEncounter: (encounterId: string) => void;
}

interface EncounterRowProps {
  encounter: EncounterRow;
  players: PlayerState[];
  gameSeries: GameSeriesId;
  currentPlayerId: string | null;
  trainerColumnTemplate?: string;
  onRemove: (encounterId: string) => void;
  onLocationChange: (encounterId: string, locationId: string | null) => void;
  onPokemonSpeciesChange: (encounterId: string, trainerId: string, species: string | null) => void;
  onPokemonNicknameChange: (encounterId: string, trainerId: string, nickname: string) => void;
  onRevive: (encounterId: string) => void;
}

const EncounterRowView = ({
  encounter,
  players,
  gameSeries,
  currentPlayerId,
  trainerColumnTemplate,
  onRemove,
  onLocationChange,
  onPokemonSpeciesChange,
  onPokemonNicknameChange,
  onRevive
}: EncounterRowProps) => {
  const locationLabel = useMemo(
    () => getLocationLabel(encounter.locationId, gameSeries),
    [encounter.locationId, gameSeries]
  );
  const { options: pokemonOptions, status } = useLocationPokemon(encounter.locationId, gameSeries);
  const [hiddenSprites, setHiddenSprites] = useState<Record<string, boolean>>({});
  const [spriteMap, setSpriteMap] = useState<Record<string, string | null>>({});
  const [activeTrainerId, setActiveTrainerId] = useState<string | null>(null);
  const [draggingTrainerId, setDraggingTrainerId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'revive' | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const playerKey = useMemo(() => players.map((player) => player.id).join('|'), [players]);
  const locationIsSet = Boolean(encounter.locationId && isValidLocationId(encounter.locationId, gameSeries));
  const rowIsDead = useMemo(
    () => Object.values(encounter.pokemonSelections).some((selection) => selection?.isDead),
    [encounter.pokemonSelections]
  );
  const partyMembers = useMemo(() => {
    const members = new Set<string>();
    players.forEach((player) => {
      const team = Array.isArray(player.team) ? player.team : [];
      team.forEach((entry) => {
        if (entry?.encounterId === encounter.id && entry?.status !== 'boxed') {
          if (player.id) {
            members.add(player.id);
          }
        }
      });
    });
    return members;
  }, [players, encounter.id]);
  const rowHasPartyHighlight = !rowIsDead && partyMembers.size > 0;
  const speciesKeys = useMemo(() => {
    const keys = new Set<string>();
    players.forEach((player) => {
      const selection = encounter.pokemonSelections[player.id];
      if (selection?.species) {
        keys.add(normalizeSpeciesKey(selection.species));
      }
    });
    return Array.from(keys);
  }, [players, encounter.pokemonSelections]);

  useEffect(() => {
    setHiddenSprites({});
    setSpriteMap({});
  }, [encounter.locationId]);

  useEffect(() => {
    setHiddenSprites({});
    setSpriteMap({});
  }, [playerKey]);

  useEffect(() => {
    if (encounter.locationId && !locationIsSet) {
      onLocationChange(encounter.id, null);
    }
  }, [encounter.id, encounter.locationId, locationIsSet, onLocationChange]);

  useEffect(() => {
    if (!locationIsSet) {
      setActiveTrainerId(null);
    }
  }, [locationIsSet]);

  useEffect(() => {
    if (activeTrainerId && !players.some((player) => player.id === activeTrainerId)) {
      setActiveTrainerId(null);
    }
  }, [activeTrainerId, players]);

  useEffect(() => {
    if (speciesKeys.length === 0) {
      return;
    }

    let cancelled = false;

    speciesKeys.forEach((key) => {
      if (spriteMap[key] !== undefined) {
        return;
      }

      const cached = getCachedSprite(key);
      if (cached !== undefined) {
        setSpriteMap((previous) => (previous[key] !== undefined ? previous : { ...previous, [key]: cached }));
        return;
      }

      loadPokemonSprite(key)
        .then((spriteUrl) => {
          if (cancelled) {
            return;
          }
          setSpriteMap((previous) => (previous[key] !== undefined ? previous : { ...previous, [key]: spriteUrl }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setSpriteMap((previous) => (previous[key] !== undefined ? previous : { ...previous, [key]: null }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [speciesKeys, spriteMap]);

  useEffect(() => {
    return () => {
      if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
    };
  }, []);

  const updateSpecies = (trainerId: string, nextSpecies: string | null) => {
    onPokemonSpeciesChange(encounter.id, trainerId, nextSpecies);
    setHiddenSprites((previous) => {
      if (!nextSpecies) {
        if (!(trainerId in previous)) {
          return previous;
        }
        const next = { ...previous };
        delete next[trainerId];
        return next;
      }

      return {
        ...previous,
        [trainerId]: false
      };
    });
  };

  const handlePokemonChange = (event: ChangeEvent<HTMLSelectElement>, trainerId: string) => {
    const value = event.target.value;
    updateSpecies(trainerId, value === '' ? null : value);
  };

  const handleNicknameChange = (event: ChangeEvent<HTMLInputElement>, trainerId: string) => {
    onPokemonNicknameChange(encounter.id, trainerId, event.target.value);
  };

  const handleClearSelection = (trainerId: string) => {
    updateSpecies(trainerId, null);
    onPokemonNicknameChange(encounter.id, trainerId, '');
  };

  const handleOpenEditor = (trainerId: string) => {
    if (!locationIsSet) {
      return;
    }
    if (draggingTrainerId) {
      return;
    }
    setActiveTrainerId(trainerId);
  };

  const handleCloseEditor = () => {
    setActiveTrainerId(null);
  };

  const activePlayer = activeTrainerId ? players.find((player) => player.id === activeTrainerId) ?? null : null;
  const activeSelection = activeTrainerId ? encounter.pokemonSelections[activeTrainerId] : undefined;
  const activeSpecies = activeSelection?.species ?? '';
  const activeNickname = activeSelection?.nickname ?? '';
  const activeSpriteKey = activeSpecies ? normalizeSpeciesKey(activeSpecies) : '';
  const activeSpriteUrl = activeSpriteKey ? spriteMap[activeSpriteKey] ?? null : null;
  const activeSpriteHidden = activeTrainerId ? hiddenSprites[activeTrainerId] : false;

  const handleActiveSpeciesChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!activeTrainerId) {
      return;
    }
    handlePokemonChange(event, activeTrainerId);
  };

  const handleActiveNicknameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeTrainerId) {
      return;
    }
    handleNicknameChange(event, activeTrainerId);
  };

  const handleActiveClear = () => {
    if (!activeTrainerId) {
      return;
    }
    handleClearSelection(activeTrainerId);
  };

  const handleRemoveRow = () => {
    setConfirmAction('remove');
  };

  const handleReviveRow = () => {
    setConfirmAction('revive');
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'remove') {
      onRemove(encounter.id);
    } else if (confirmAction === 'revive') {
      onRevive(encounter.id);
    }
    setConfirmAction(null);
  };

  const handleCancelAction = () => {
    setConfirmAction(null);
  };

  useEffect(() => {
    if (confirmAction) {
      const { overflow } = document.body.style;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = overflow;
      };
    }
    return undefined;
  }, [confirmAction]);

  const handleCircleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    trainerId: string,
    species: string | null,
    nickname: string,
    spriteUrl: string | null,
    encounterId: string
  ) => {
    if (!species || trainerId !== currentPlayerId) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();

    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }

    const preview = document.createElement('div');
    preview.className = styles.dragPreview;

    if (spriteUrl) {
      const image = document.createElement('img');
      image.src = spriteUrl;
      image.alt = `${species} sprite`;
      image.className = styles.dragPreviewImage;
      preview.appendChild(image);
    } else {
      preview.textContent = species.charAt(0).toUpperCase();
    }

    document.body.appendChild(preview);
    dragPreviewRef.current = preview;

    const rect = preview.getBoundingClientRect();
    event.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);

    setDraggingTrainerId(trainerId);
    const payload = {
      type: 'encounter-pokemon',
      trainerId,
      species,
      nickname,
      encounterId
    };

    event.dataTransfer.setData(PARTY_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', species);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleCircleDragEnd = () => {
    setDraggingTrainerId(null);
    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }
  };

  return (
    <div className={`${styles.row} ${rowIsDead ? styles.rowDead : ''} ${rowHasPartyHighlight ? styles.rowParty : ''}`}>
      <div className={styles.locationColumn}>
        <div className={styles.locationValue} role="textbox" aria-readonly="true">
          {locationLabel || 'Unknown location'}
        </div>
        {status === 'loading' && locationIsSet && <span className={styles.statusBadge}>Loading Pokémon…</span>}
        {status === 'error' && locationIsSet && <span className={styles.errorBadge}>Failed to load encounters.</span>}
      </div>
      <div className={styles.pokemonColumn} style={trainerColumnTemplate ? { gridTemplateColumns: trainerColumnTemplate } : undefined}>
        {players.length === 0 ? (
          <p className={styles.helperText}>Add trainers to start tracking encounters.</p>
        ) : (
          players.map((player) => {
            const selection = encounter.pokemonSelections[player.id];
            const species = selection?.species ?? null;
            const nickname = selection?.nickname ?? '';
            const spriteKey = species ? normalizeSpeciesKey(species) : '';
            const spriteUrl = spriteKey ? spriteMap[spriteKey] ?? null : null;
            const isHidden = spriteUrl ? hiddenSprites[player.id] : false;
            const isActive = activeTrainerId === player.id;
            const isCurrentTrainer = currentPlayerId === player.id;
            const isDraggable = Boolean(species && isCurrentTrainer);
            const selectionIsDead = Boolean(selection?.isDead);

            const isInParty = !rowIsDead && partyMembers.has(player.id);
            return (
              <div
                key={player.id}
                className={`${styles.pokemonSlot} ${isInParty ? styles.pokemonSlotParty : ''}`}
                data-party={isInParty ? 'true' : 'false'}
              >
                <span className={styles.pokemonLabel}>{player.name || 'Trainer'}</span>
                <button
                  type="button"
                  className={styles.pokemonCircle}
                  onClick={() => handleOpenEditor(player.id)}
                  disabled={!locationIsSet}
                  aria-pressed={isActive}
                  draggable={isDraggable}
                  data-draggable={isDraggable ? 'true' : 'false'}
                  data-dragging={draggingTrainerId === player.id ? 'true' : 'false'}
                  data-dead={selectionIsDead ? 'true' : 'false'}
                  data-party={isInParty ? 'true' : 'false'}
                  onDragStart={(event) =>
                    handleCircleDragStart(event, player.id, species, nickname, spriteUrl, encounter.id)
                  }
                  onDragEnd={handleCircleDragEnd}
                  aria-label={
                    species
                      ? `Edit encounter for ${player.name || 'trainer'}`
                      : `Assign encounter for ${player.name || 'trainer'}`
                  }
                >
                  {species && spriteUrl && !isHidden ? (
                    <img
                      src={spriteUrl}
                      alt={`${species} sprite`}
                      className={styles.pokemonCircleImage}
                      loading="lazy"
                      onError={() => {
                        setHiddenSprites((previous) => ({
                          ...previous,
                          [player.id]: true
                        }));
                      }}
                    />
                  ) : (
                    <span className={styles.pokemonCircleIcon}>+</span>
                  )}
                </button>
                {species ? (
                  <div
                    className={`${styles.pokemonTooltip} ${selectionIsDead ? styles.pokemonTooltipDead : ''}`}
                    data-has-nickname={nickname ? 'true' : 'false'}
                  >
                    <span className={styles.tooltipSpecies}>{species}</span>
                    {nickname ? <span className={styles.tooltipNickname}>&ldquo;{nickname}&rdquo;</span> : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.removeRowButton} onClick={handleRemoveRow}>
          Remove
        </button>
        {rowIsDead && currentPlayerId && (
          <button type="button" className={styles.reviveRowButton} onClick={handleReviveRow}>
            Revive
          </button>
        )}
      </div>

      {activeTrainerId && (
        <div className={styles.selectionOverlay} role="presentation" onClick={handleCloseEditor}>
          <div
            className={styles.selectionCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`encounter-editor-${encounter.id}-${activeTrainerId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={`encounter-editor-${encounter.id}-${activeTrainerId}`}>Assign Pokémon</h3>
            {activePlayer && <p className={styles.selectionHint}>{activePlayer.name || 'Trainer'}</p>}
            <select className={styles.selectionSelect} value={activeSpecies} onChange={handleActiveSpeciesChange}>
              <option value="">Select Pokémon</option>
              {pokemonOptions.map((pokemonName) => (
                <option key={pokemonName} value={pokemonName}>
                  {pokemonName}
                </option>
              ))}
            </select>
            <input
              type="text"
              className={styles.nicknameInput}
              placeholder="Nickname"
              value={activeNickname}
              onChange={handleActiveNicknameChange}
              maxLength={40}
              disabled={!activeSpecies}
            />
            {activeSpecies && activeSpriteUrl && !activeSpriteHidden && (
              <img
                src={activeSpriteUrl}
                alt={`${activeSpecies} sprite preview`}
                className={styles.selectionSprite}
                loading="lazy"
                onError={() => {
                  if (activeTrainerId) {
                    setHiddenSprites((previous) => ({
                      ...previous,
                      [activeTrainerId]: true
                    }));
                  }
                }}
              />
            )}
            <div className={styles.selectionActions}>
              <button type="button" className={styles.clearButton} onClick={handleActiveClear}>
                Clear
              </button>
              <button type="button" className={styles.confirmButton} onClick={handleCloseEditor}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction
        ? createPortal(
            <div className={styles.confirmOverlay} role="presentation" onClick={handleCancelAction}>
              <div
                className={styles.confirmCard}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`confirm-${encounter.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id={`confirm-${encounter.id}`}>Confirm action</h3>
                <p className={styles.confirmMessage}>
                  {confirmAction === 'remove' ? 'You sure you want to remove?' : 'You sure you want to revive?'}
                </p>
                <div className={styles.confirmActions}>
                  <button type="button" className={styles.cancelButton} onClick={handleCancelAction}>
                    Cancel
                  </button>
                  <button type="button" className={styles.confirmButton} onClick={handleConfirmAction}>
                    Confirm
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

const EncounterTable = ({
  gameSeries,
  players,
  encounters,
  currentPlayerId,
  onAddEncounter,
  onRemoveEncounter,
  onUpdateLocation,
  onUpdatePokemonSpecies,
  onUpdatePokemonNickname,
  onReviveEncounter
}: EncounterTableProps) => {
  const locationOptions = useMemo(() => getEncounterLocations(gameSeries), [gameSeries]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<string>(locationOptions[0]?.id ?? '');
  const addDisabled = locationOptions.length === 0;
  const trainerColumnTemplate = useMemo(
    () => (players.length > 0 ? `repeat(${players.length}, minmax(150px, 1fr))` : undefined),
    [players.length]
  );

  useEffect(() => {
    if (locationOptions.length === 0) {
      setPickerSelection('');
      setIsPickerOpen(false);
    } else if (!locationOptions.find((option) => option.id === pickerSelection)) {
      setPickerSelection(locationOptions[0]?.id ?? '');
    }
  }, [locationOptions, pickerSelection]);

  const openPicker = () => {
    if (addDisabled) {
      return;
    }
    setPickerSelection(locationOptions[0]?.id ?? '');
    setIsPickerOpen(true);
  };

  const closePicker = () => {
    setIsPickerOpen(false);
  };

  const confirmPicker = () => {
    if (!pickerSelection) {
      return;
    }
    onAddEncounter(pickerSelection);
    setIsPickerOpen(false);
  };

  const handlePickerChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPickerSelection(event.target.value);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>Encounters</h2>
          <p className={styles.subtitle}>Add a route and log what everyone catches.</p>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={openPicker}
          disabled={addDisabled}
          title={addDisabled ? 'No locations available for this game yet.' : undefined}
        >
          Add encounter
        </button>
      </header>

      {encounters.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No encounters yet.</p>
          <p>Add an encounter to start tracking Pokémon for your Soul Lock run.</p>
        </div>
      ) : (
        <div className={styles.rows}>
          {players.length > 0 && (
            <div className={styles.tableHeader}>
              <span className={styles.tableHeaderLocation}>Location</span>
              <div
                className={styles.tableHeaderPlayers}
                style={trainerColumnTemplate ? { gridTemplateColumns: trainerColumnTemplate } : undefined}
              >
                {players.map((player) => (
                  <span key={player.id} className={styles.tableHeaderTrainer}>
                    {player.name || 'Trainer'}
                  </span>
                ))}
              </div>
              <span className={styles.tableHeaderActions}>Actions</span>
            </div>
          )}
          {encounters.map((encounter) => (
            <EncounterRowView
              key={encounter.id}
              encounter={encounter}
              players={players}
              gameSeries={gameSeries}
              currentPlayerId={currentPlayerId}
              trainerColumnTemplate={trainerColumnTemplate}
              onRemove={onRemoveEncounter}
              onLocationChange={onUpdateLocation}
              onPokemonSpeciesChange={onUpdatePokemonSpecies}
              onPokemonNicknameChange={onUpdatePokemonNickname}
              onRevive={onReviveEncounter}
            />
          ))}
        </div>
      )}

      {isPickerOpen && (
        <div className={styles.pickerOverlay} role="presentation">
          <div className={styles.pickerCard} role="dialog" aria-modal="true" aria-labelledby="add-encounter-title">
            <h3 id="add-encounter-title">Select a location</h3>
            <p className={styles.pickerHint}>Choose a location for this encounter row.</p>
            <select className={styles.pickerSelect} value={pickerSelection} onChange={handlePickerChange}>
              {locationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className={styles.pickerActions}>
              <button type="button" className={styles.confirmButton} onClick={confirmPicker}>
                Add encounter
              </button>
              <button type="button" className={styles.cancelButton} onClick={closePicker}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EncounterTable;
