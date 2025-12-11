import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import PlayerEditor from '../components/PlayerEditor';
import EncounterTable from '../components/EncounterTable';
import PartyPanel from '../components/PartyPanel';
import RoomSettings from '../components/RoomSettings';
import { buildRoomShareLink, getRoom } from '../api/rooms';
import { useRoomConnection } from '../hooks/useRoomConnection';
import { generateId } from '../utils/id';
import { getClientId } from '../utils/clientId';
import type {
  EncounterRow,
  GameSeriesId,
  PlayerState,
  PokemonEntry,
  PokemonStatus,
  VanillaMode
} from '../types';
import styles from './RoomPage.module.css';

const DEFAULT_ROOM_NAME = 'Soul Lock Room';

const RoomPage = () => {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const [isCheckingRoom, setIsCheckingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);

  const { status, roomState, error: socketError, syncState, lastSyncedAt } = useRoomConnection(roomId);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(DEFAULT_ROOM_NAME);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isTrainerModalOpen, setIsTrainerModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsCheckingRoom(true);
    setRoomError(null);

    getRoom(roomId)
      .catch((err) => {
        if (isMounted) {
          setRoomError(err instanceof Error ? err.message : 'Room not found.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingRoom(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const shareLink = useMemo(() => buildRoomShareLink(roomId), [roomId]);
  const clientId = useMemo(() => getClientId(), []);
  const players = roomState?.players ?? [];
  const currentPlayer = useMemo(
    () => players.find((player) => player.lockedBy === clientId) ?? null,
    [players, clientId]
  );
  const currentPlayerId = currentPlayer?.id ?? null;

  useEffect(() => {
    if (roomState && !isEditingName) {
      setNameDraft(roomState.name ?? DEFAULT_ROOM_NAME);
    }
  }, [roomState, isEditingName]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const handleStartEditingName = () => {
    if (!roomState) {
      return;
    }
    setIsEditingName(true);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNameDraft(event.target.value);
  };

  const commitRoomName = () => {
    if (!roomState) {
      setIsEditingName(false);
      return;
    }

    const trimmed = nameDraft.trim().slice(0, 80);
    const nextName = trimmed || DEFAULT_ROOM_NAME;

    if (nextName !== roomState.name) {
      syncState((previous) => ({
        ...previous,
        name: nextName
      }));
    }

    setNameDraft(nextName);
    setIsEditingName(false);
  };

  const handleNameInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRoomName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (roomState) {
        setNameDraft(roomState.name);
      } else {
        setNameDraft(DEFAULT_ROOM_NAME);
      }
      setIsEditingName(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        window.prompt('Copy this link', shareLink);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlayer = () => {
    if (!roomState) {
      return;
    }

    const newPlayer: PlayerState = {
      id: generateId(),
      name: 'Trainer',
      notes: '',
      team: [],
      lockedBy: null
    };

    syncState((previous) => ({
      ...previous,
      players: [...previous.players, newPlayer]
    }));
  };

  const handleRemovePlayer = (playerId: string) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => ({
      ...previous,
      players: previous.players.filter((player) => player.id !== playerId)
    }));
  };

  const handleUpdatePlayer = (nextPlayer: PlayerState) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => ({
      ...previous,
      players: previous.players.map((player) => (player.id === nextPlayer.id ? nextPlayer : player))
    }));
  };

  const handleToggleLock = (playerId: string, shouldLock: boolean) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => ({
      ...previous,
      players: previous.players.map((player) => {
        if (player.id === playerId) {
          return {
            ...player,
            lockedBy: shouldLock ? clientId : null
          };
        }

        if (shouldLock && player.lockedBy === clientId) {
          return {
            ...player,
            lockedBy: null
          };
        }

        return player;
      })
    }));
  };

  const handleUpdateGameSeries = (series: GameSeriesId) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => ({
      ...previous,
      gameSeries: series,
      encounters: []
    }));
  };

  const handleUpdateVanillaMode = (mode: VanillaMode) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => ({
      ...previous,
      vanillaMode: mode
    }));
  };

  const openTrainerModal = () => {
    setIsTrainerModalOpen(true);
  };

  const closeTrainerModal = () => {
    setIsTrainerModalOpen(false);
  };

  useEffect(() => {
    if (!isTrainerModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsTrainerModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTrainerModalOpen]);

  const buildSelectionSeed = (
    playerList: PlayerState[],
    existingSelections: EncounterRow['pokemonSelections'] = {}
  ) => {
    return playerList.reduce<EncounterRow['pokemonSelections']>((acc, player) => {
      const current = existingSelections[player.id];
      acc[player.id] = {
        species: current?.species ?? null,
        nickname: current?.nickname ?? '',
        isDead: Boolean(current?.species && current?.isDead)
      };
      return acc;
    }, {} as EncounterRow['pokemonSelections']);
  };

  const handleAddEncounter = (locationId: string) => {
    if (!roomState) {
      return;
    }

    if (!locationId) {
      return;
    }

    syncState((previous) => {
      const currentEncounters = Array.isArray(previous.encounters) ? previous.encounters : [];
      const selectionSeed = buildSelectionSeed(previous.players);
      return {
        ...previous,
        encounters: [
          ...currentEncounters,
          {
            id: generateId(),
            locationId,
            pokemonSelections: selectionSeed
          }
        ]
      };
    });
  };

  const handleRemoveEncounter = (encounterId: string) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => {
      const currentEncounters = Array.isArray(previous.encounters) ? previous.encounters : [];
      return {
        ...previous,
        encounters: currentEncounters.filter((encounter) => encounter.id !== encounterId)
      };
    });
  };

  const handleUpdateEncounterLocation = (encounterId: string, locationId: string | null) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => {
      const currentEncounters = Array.isArray(previous.encounters) ? previous.encounters : [];
      const nextEncounters = currentEncounters.map((encounter) => {
        if (encounter.id !== encounterId) {
          return encounter;
        }

        return {
          ...encounter,
          locationId,
          pokemonSelections: buildSelectionSeed(previous.players)
        };
      });

      return {
        ...previous,
        encounters: nextEncounters
      };
    });
  };

  const handleUpdateEncounterPokemonSpecies = (
    encounterId: string,
    trainerId: string,
    species: string | null
  ) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => {
      const currentEncounters = Array.isArray(previous.encounters) ? previous.encounters : [];
      const sanitizedSpecies = species && species.trim() ? species.trim() : null;

      const nextEncounters = currentEncounters.map((encounter) => {
        if (encounter.id !== encounterId) {
          return encounter;
        }

        const baseSelections = buildSelectionSeed(previous.players, encounter.pokemonSelections);
        const currentSelection = baseSelections[trainerId] ?? { species: null, nickname: '', isDead: false };
        const shouldPreserveDeath =
          Boolean(sanitizedSpecies) && sanitizedSpecies === currentSelection.species && currentSelection.isDead;

        return {
          ...encounter,
          pokemonSelections: {
            ...baseSelections,
            [trainerId]: {
              species: sanitizedSpecies,
              nickname: sanitizedSpecies ? currentSelection.nickname : '',
              isDead: shouldPreserveDeath
            }
          }
        };
      });

      return {
        ...previous,
        encounters: nextEncounters
      };
    });
  };

  const handleUpdateEncounterPokemonNickname = (
    encounterId: string,
    trainerId: string,
    nickname: string
  ) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => {
      const currentEncounters = Array.isArray(previous.encounters) ? previous.encounters : [];
      const sanitizedNickname = typeof nickname === 'string' ? nickname.trim().slice(0, 40) : '';

      const nextEncounters = currentEncounters.map((encounter) => {
        if (encounter.id !== encounterId) {
          return encounter;
        }

        const baseSelections = buildSelectionSeed(previous.players, encounter.pokemonSelections);
        const currentSelection = baseSelections[trainerId] ?? { species: null, nickname: '', isDead: false };

        return {
          ...encounter,
          pokemonSelections: {
            ...baseSelections,
            [trainerId]: {
              species: currentSelection.species,
              nickname: currentSelection.species ? sanitizedNickname : '',
              isDead: currentSelection.isDead && Boolean(currentSelection.species)
            }
          }
        };
      });

      return {
        ...previous,
        encounters: nextEncounters
      };
    });
  };

  const normalizeTeamForUpdate = (team: PlayerState['team']): PokemonEntry[] => {
    if (!Array.isArray(team)) {
      return [];
    }

    return team.slice(0, 6).map((entry, index) => {
      const legacyName = (entry as unknown as { name?: string })?.name ?? '';
      const species = typeof entry?.species === 'string' ? entry.species : legacyName;
      const nickname = typeof entry?.nickname === 'string' ? entry.nickname : '';
      const rawStatus = entry?.status;
      const status: PokemonStatus = rawStatus === 'fainted' || rawStatus === 'boxed' ? rawStatus : 'active';
      const notes = typeof entry?.notes === 'string' ? entry.notes : '';
      const slot = Number.isInteger(entry?.slot) ? Math.min(Math.max(entry.slot, 0), 5) : index;
      const id = typeof entry?.id === 'string' && entry.id ? entry.id : generateId();
      const encounterId = typeof entry?.encounterId === 'string' && entry.encounterId ? entry.encounterId : null;
      const trainerRef = typeof entry?.trainerId === 'string' && entry.trainerId ? entry.trainerId : null;

      return {
        id,
        species,
        nickname,
        status,
        notes,
        slot,
        encounterId,
        trainerId: trainerRef
      };
    });
  };

  const handleAssignPartySlot = (
    slotIndex: number,
    selection: { species: string; nickname: string; encounterId?: string | null }
  ) => {
    if (!roomState) {
      return;
    }

    const sanitizedSlot = Math.min(Math.max(slotIndex, 0), 5);
    const trimmedSpecies = selection.species.trim();

    if (!trimmedSpecies || !currentPlayerId) {
      return;
    }

    const trimmedNickname = selection.nickname.trim().slice(0, 40);
    const encounterLink = typeof selection.encounterId === 'string' && selection.encounterId ? selection.encounterId : null;

    syncState((previous) => {
      const targetPlayer = previous.players.find((player) => player.id === currentPlayerId);
      if (!targetPlayer) {
        return previous;
      }

      const normalizedTeam = normalizeTeamForUpdate(targetPlayer.team);
      const filteredTeam = normalizedTeam.filter((entry) => entry.slot !== sanitizedSlot);
      const existingEntry = normalizedTeam.find((entry) => entry.slot === sanitizedSlot);
      const duplicateSpecies = filteredTeam.some(
        (entry) => entry.species.trim().toLowerCase() === trimmedSpecies.toLowerCase()
      );

      if (duplicateSpecies) {
        return previous;
      }
      const status: PokemonStatus = existingEntry?.status ?? 'active';
      const nextEntry: PokemonEntry = {
        id: existingEntry?.id ?? generateId(),
        species: trimmedSpecies,
        nickname: trimmedNickname,
        status,
        notes: existingEntry?.notes ?? '',
        slot: sanitizedSlot,
        encounterId: encounterLink ?? existingEntry?.encounterId ?? null,
        trainerId: currentPlayerId
      };

      const nextTeam = [...filteredTeam, nextEntry].sort((a, b) => a.slot - b.slot);

      return {
        ...previous,
        players: previous.players.map((player) =>
          player.id === currentPlayerId
            ? {
                ...player,
                team: nextTeam
              }
            : player
        )
      };
    });
  };

  const handleClearPartySlot = (slotIndex: number) => {
    if (!roomState || !currentPlayerId) {
      return;
    }

    const sanitizedSlot = Math.min(Math.max(slotIndex, 0), 5);

    syncState((previous) => {
      const targetPlayer = previous.players.find((player) => player.id === currentPlayerId);
      if (!targetPlayer) {
        return previous;
      }

      const normalizedTeam = normalizeTeamForUpdate(targetPlayer.team);
      const nextTeam = normalizedTeam
        .filter((entry) => entry.slot !== sanitizedSlot)
        .sort((a, b) => a.slot - b.slot);

      return {
        ...previous,
        players: previous.players.map((player) =>
          player.id === currentPlayerId
            ? {
                ...player,
                team: nextTeam
              }
            : player
        )
      };
    });
  };

  const handleKillPartySlot = (
    slotIndex: number,
    payload: { encounterId?: string | null; trainerId?: string | null }
  ) => {
    if (!roomState || !currentPlayerId) {
      return;
    }

    const sanitizedSlot = Math.min(Math.max(slotIndex, 0), 5);
    const payloadEncounterId = typeof payload.encounterId === 'string' && payload.encounterId ? payload.encounterId : null;

    syncState((previous) => {
      const targetPlayer = previous.players.find((player) => player.id === currentPlayerId);
      if (!targetPlayer) {
        return previous;
      }

      const normalizedTeam = normalizeTeamForUpdate(targetPlayer.team);
      const existingEntry = normalizedTeam.find((entry) => entry.slot === sanitizedSlot);
      if (!existingEntry) {
        return previous;
      }

      const nextEntry: PokemonEntry = {
        ...existingEntry,
        status: 'fainted',
        encounterId: existingEntry.encounterId ?? payloadEncounterId,
        trainerId: currentPlayerId
      };

      const targetEncounterId = nextEntry.encounterId ?? null;
      const nextEncounters = Array.isArray(previous.encounters) && targetEncounterId
        ? previous.encounters.map((encounter) => {
            if (encounter.id !== targetEncounterId) {
              return encounter;
            }

            const baseSelections = buildSelectionSeed(previous.players, encounter.pokemonSelections);
            const updatedSelections = Object.keys(baseSelections).reduce<EncounterRow['pokemonSelections']>((acc, key) => {
              const selection = baseSelections[key];
              acc[key] = selection.species
                ? {
                    ...selection,
                    isDead: true
                  }
                : selection;
              return acc;
            }, {} as EncounterRow['pokemonSelections']);

            return {
              ...encounter,
              pokemonSelections: updatedSelections
            };
          })
        : previous.encounters;

      const nextPlayers = previous.players.map((player) => {
        const playerTeam = normalizeTeamForUpdate(player.team);

        if (player.id === currentPlayerId) {
          const updatedTeam = [...playerTeam.filter((entry) => entry.slot !== sanitizedSlot), nextEntry].sort(
            (a, b) => a.slot - b.slot
          );

          return {
            ...player,
            team: updatedTeam
          };
        }

        if (!targetEncounterId) {
          return player;
        }

        let teamChanged = false;
        const updatedTeam = playerTeam
          .map((entry) => {
            if (entry.encounterId === targetEncounterId && entry.status !== 'fainted') {
              teamChanged = true;
              const faintedStatus: PokemonStatus = 'fainted';
              return {
                ...entry,
                status: faintedStatus
              };
            }
            return entry;
          })
          .sort((a, b) => a.slot - b.slot);

        if (!teamChanged) {
          return player;
        }

        return {
          ...player,
          team: updatedTeam
        };
      });

      return {
        ...previous,
        players: nextPlayers,
        encounters: nextEncounters
      };
    });
  };

  const handleEvolvePartySlot = (
    slotIndex: number,
    payload: { species: string; encounterId?: string | null; trainerId?: string | null }
  ) => {
    if (!roomState || !currentPlayerId) {
      return;
    }

    const sanitizedSlot = Math.min(Math.max(slotIndex, 0), 5);
    const nextSpecies = payload.species.trim();
    if (!nextSpecies) {
      return;
    }

    const targetEncounterId = typeof payload.encounterId === 'string' && payload.encounterId ? payload.encounterId : null;

    syncState((previous) => {
      const updatedPlayers = previous.players.map((player) => {
        if (player.id !== currentPlayerId) {
          return player;
        }
        const normalizedTeam = normalizeTeamForUpdate(player.team);
        const nextTeam = normalizedTeam
          .map((entry) => (entry.slot === sanitizedSlot ? { ...entry, species: nextSpecies } : entry))
          .sort((a, b) => a.slot - b.slot);

        return {
          ...player,
          team: nextTeam
        };
      });

      const nextEncounters = targetEncounterId
        ? previous.encounters.map((encounter) => {
            if (encounter.id !== targetEncounterId) {
              return encounter;
            }
            const baseSelections = buildSelectionSeed(previous.players, encounter.pokemonSelections);
            const currentSelection = baseSelections[currentPlayerId] ?? {
              species: null,
              nickname: '',
              isDead: false
            };

            return {
              ...encounter,
              pokemonSelections: {
                ...baseSelections,
                [currentPlayerId]: {
                  ...currentSelection,
                  species: nextSpecies
                }
              }
            };
          })
        : previous.encounters;

      return {
        ...previous,
        players: updatedPlayers,
        encounters: nextEncounters
      };
    });
  };

  const handleReviveEncounter = (encounterId: string) => {
    if (!roomState) {
      return;
    }

    syncState((previous) => {
      const currentEncounters = Array.isArray(previous.encounters) ? previous.encounters : [];
      const targetEncounter = currentEncounters.find((encounter) => encounter.id === encounterId);
      if (!targetEncounter) {
        return previous;
      }

      let encountersChanged = false;
      const nextEncounters = currentEncounters.map((encounter) => {
        if (encounter.id !== encounterId) {
          return encounter;
        }

        const baseSelections = buildSelectionSeed(previous.players, encounter.pokemonSelections);
        let selectionChanged = false;
        const revivedSelections = Object.keys(baseSelections).reduce<EncounterRow['pokemonSelections']>((acc, key) => {
          const selection = baseSelections[key];
          if (selection.species && selection.isDead) {
            selectionChanged = true;
            acc[key] = {
              ...selection,
              isDead: false
            };
          } else {
            acc[key] = selection;
          }
          return acc;
        }, {} as EncounterRow['pokemonSelections']);

        if (!selectionChanged) {
          return encounter;
        }

        encountersChanged = true;
        return {
          ...encounter,
          pokemonSelections: revivedSelections
        };
      });

      let playersChanged = false;
      const nextPlayers = previous.players.map((player) => {
        const normalizedTeam = normalizeTeamForUpdate(player.team);
        let teamChanged = false;
        const revivedTeam = normalizedTeam
          .map((entry) => {
            if (entry.encounterId === encounterId && entry.status === 'fainted') {
              teamChanged = true;
              const revivedStatus: PokemonStatus = 'active';
              return {
                ...entry,
                status: revivedStatus
              };
            }
            return entry;
          })
          .sort((a, b) => a.slot - b.slot);

        if (!teamChanged) {
          return player;
        }

        playersChanged = true;
        return {
          ...player,
          team: revivedTeam
        };
      });

      if (!encountersChanged && !playersChanged) {
        return previous;
      }

      return {
        ...previous,
        players: playersChanged ? nextPlayers : previous.players,
        encounters: encountersChanged ? nextEncounters : previous.encounters
      };
    });
  };

  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  if (isCheckingRoom) {
    return <p className={styles.message}>Loading room…</p>;
  }

  if (roomError) {
    return (
      <div className={styles.messageCard}>
        <h2>Room unavailable</h2>
        <p>{roomError}</p>
        <button type="button" className={styles.primaryButton} onClick={() => navigate('/')}>Return home</button>
      </div>
    );
  }

  if (!roomState) {
    return <p className={styles.message}>Waiting for room sync…</p>;
  }

  return (
    <div className={styles.container}>
      <section className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <p className={styles.roomCode}>Room ID: {roomId}</p>
          <h1 className={styles.roomTitle}>
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                className={styles.roomTitleInput}
                value={nameDraft}
                onChange={handleNameChange}
                onBlur={commitRoomName}
                onKeyDown={handleNameInputKeyDown}
                maxLength={80}
                aria-label="Room title"
              />
            ) : (
              <button
                type="button"
                className={styles.roomTitleButton}
                onClick={handleStartEditingName}
                aria-label="Edit room title"
                title="Click to rename room"
              >
                {roomState.name || DEFAULT_ROOM_NAME}
              </button>
            )}
          </h1>
        </div>
        <div className={styles.metaBar}>
          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>Connection</span>
            <span className={styles.statusIndicator} data-status={status}>
              {status}
            </span>
            {socketError && <span className={styles.errorText}>{socketError}</span>}
            {lastSyncedAt && (
              <span className={styles.syncedAt}>Updated {new Date(lastSyncedAt).toLocaleTimeString()}</span>
            )}
          </div>
          <div className={`${styles.metaGroup} ${styles.shareGroup}`}>
            <span className={styles.metaLabel}>Share</span>
            <code className={styles.shareLink} title={shareLink}>
              {shareLink}
            </code>
            <button type="button" className={styles.secondaryButton} onClick={handleCopyLink}>
              Copy link
            </button>
          </div>
          <div className={styles.settingsSlot}>
            <RoomSettings
              gameSeries={roomState.gameSeries}
              vanillaMode={roomState.vanillaMode}
              onGameSeriesChange={handleUpdateGameSeries}
              onVanillaChange={handleUpdateVanillaMode}
            />
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.manageTrainersButton}`}
              onClick={openTrainerModal}
            >
              Manage trainers
            </button>
          </div>
        </div>
      </section>

      <div className={styles.mainContent}>
        <section className={styles.encountersSection}>
          <EncounterTable
            gameSeries={roomState.gameSeries}
            players={players}
            encounters={roomState.encounters ?? []}
            currentPlayerId={currentPlayerId}
            onAddEncounter={handleAddEncounter}
            onRemoveEncounter={handleRemoveEncounter}
            onUpdateLocation={handleUpdateEncounterLocation}
            onUpdatePokemonSpecies={handleUpdateEncounterPokemonSpecies}
            onUpdatePokemonNickname={handleUpdateEncounterPokemonNickname}
            onReviveEncounter={handleReviveEncounter}
          />
        </section>
      </div>

      {isTrainerModalOpen && (
        <div className={styles.modalOverlay} role="presentation" onClick={closeTrainerModal}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trainer-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <h2 id="trainer-modal-title">Manage trainers</h2>
                <p className={styles.modalHint}>Add or rename trainers for this room.</p>
              </div>
              <button
                type="button"
                className={`${styles.secondaryButton} ${styles.modalCloseButton}`}
                onClick={closeTrainerModal}
              >
                Close
              </button>
            </header>
            <div className={styles.modalBody}>
              <div className={styles.modalActions}>
                <button type="button" className={styles.primaryButton} onClick={handleAddPlayer}>
                  Add trainer
                </button>
              </div>
              <div className={`${styles.modalScroll} ${styles.playersGrid}`}>
                {players.length > 0 ? (
                  players.map((player) => (
                    <PlayerEditor
                      key={player.id}
                      player={player}
                      currentClientId={clientId}
                      onChange={handleUpdatePlayer}
                      onRemove={() => handleRemovePlayer(player.id)}
                      onToggleLock={(lock) => handleToggleLock(player.id, lock)}
                    />
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    <p>No trainers yet.</p>
                    <p>Add trainers for everyone in the run so they can log encounters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <PartyPanel
        playerName={currentPlayer?.name ?? ''}
        party={currentPlayer?.team ?? []}
        currentPlayerId={currentPlayerId}
        canEdit={Boolean(currentPlayer)}
        onAssign={handleAssignPartySlot}
        onClear={handleClearPartySlot}
        onKill={handleKillPartySlot}
        onEvolve={handleEvolvePartySlot}
      />
    </div>
  );
};

export default RoomPage;
