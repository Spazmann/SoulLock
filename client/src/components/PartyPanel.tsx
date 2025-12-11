import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { PokemonEntry } from '../types';
import { PARTY_DRAG_TYPE } from '../constants/dragTypes';
import { getCachedSprite, loadPokemonSprite } from '../utils/pokemonSprites';
import { loadNextEvolution } from '../utils/pokemonEvolution';
import styles from './PartyPanel.module.css';

interface DragPayload {
  type: string;
  trainerId: string;
  species: string;
  nickname?: string;
  encounterId?: string | null;
  slotIndex?: number;
}

interface PartyPanelProps {
  playerName: string;
  party: PokemonEntry[];
  currentPlayerId: string | null;
  canEdit: boolean;
  onAssign: (slotIndex: number, selection: { species: string; nickname: string; encounterId?: string | null }) => void;
  onClear: (slotIndex: number) => void;
  onKill: (slotIndex: number, payload: { encounterId?: string | null; trainerId?: string | null }) => void;
  onEvolve: (
    slotIndex: number,
    payload: { species: string; encounterId?: string | null; trainerId?: string | null }
  ) => void;
}

const SLOT_COUNT = 6;

const PartyPanel = ({
  playerName,
  party,
  currentPlayerId,
  canEdit,
  onAssign,
  onClear,
  onKill,
  onEvolve
}: PartyPanelProps) => {
  const slots = useMemo(() => {
    const slotMap = new Map<number, PokemonEntry>();
    party.forEach((entry, index) => {
      if (!entry) {
        return;
      }
      const slot = Number.isInteger(entry.slot) ? Math.min(Math.max(entry.slot, 0), SLOT_COUNT - 1) : index;
      slotMap.set(slot, { ...entry, slot });
    });
    return Array.from({ length: SLOT_COUNT }, (_, index) => slotMap.get(index) ?? null);
  }, [party]);

  const [sprites, setSprites] = useState<Record<number, string | null>>({});
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [isDraggingParty, setIsDraggingParty] = useState(false);
  const [graveHover, setGraveHover] = useState(false);
  const dropHandledRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const activeDragCircleRef = useRef<HTMLButtonElement | null>(null);
  const dragStartPositionRef = useRef({ clientX: 0, clientY: 0, screenX: 0, screenY: 0 });
  const dragLastPositionRef = useRef({ clientX: 0, clientY: 0, screenX: 0, screenY: 0 });
  const windowDragHandlerRef = useRef<((event: globalThis.DragEvent) => void) | null>(null);
  const [evolveTarget, setEvolveTarget] = useState<{ slotIndex: number; entry: PokemonEntry } | null>(null);
  const [evolutionState, setEvolutionState] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'error';
    nextSpecies: string | null;
    errorMessage: string | null;
  }>({
    status: 'idle',
    nextSpecies: null,
    errorMessage: null
  });
  const [evolutionSprite, setEvolutionSprite] = useState<string | null>(null);

  useEffect(() => {
    setSprites((previous) => {
      const next = { ...previous };
      for (let i = 0; i < SLOT_COUNT; i += 1) {
        if (!slots[i]) {
          delete next[i];
        }
      }
      return next;
    });

    let cancelled = false;

    slots.forEach((entry, index) => {
      if (!entry || !entry.species) {
        return;
      }

      const cached = getCachedSprite(entry.species);
      if (cached !== undefined) {
        setSprites((previous) => (previous[index] === cached ? previous : { ...previous, [index]: cached }));
        return;
      }

      loadPokemonSprite(entry.species)
        .then((url) => {
          if (cancelled) {
            return;
          }
          setSprites((previous) => ({ ...previous, [index]: url }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setSprites((previous) => ({ ...previous, [index]: null }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [slots]);

  const ownsTrainer = Boolean(currentPlayerId) && canEdit;

  const detachWindowDragHandlers = () => {
    if (typeof window === 'undefined' || !windowDragHandlerRef.current) {
      return;
    }
    window.removeEventListener('dragover', windowDragHandlerRef.current, true);
    window.removeEventListener('drag', windowDragHandlerRef.current, true);
    windowDragHandlerRef.current = null;
  };

  useEffect(() => {
    return () => {
      detachWindowDragHandlers();
      if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!evolveTarget) {
      setEvolutionState({ status: 'idle', nextSpecies: null, errorMessage: null });
      setEvolutionSprite(null);
      return;
    }

    let cancelled = false;
    setEvolutionState({ status: 'loading', nextSpecies: null, errorMessage: null });
    loadNextEvolution(evolveTarget.entry.species)
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (!result) {
          setEvolutionState({ status: 'error', nextSpecies: null, errorMessage: 'No evolution available.' });
          setEvolutionSprite(null);
          return;
        }
        setEvolutionState({ status: 'ready', nextSpecies: result, errorMessage: null });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setEvolutionState({ status: 'error', nextSpecies: null, errorMessage: 'Failed to load evolution data.' });
        setEvolutionSprite(null);
      });

    return () => {
      cancelled = true;
    };
  }, [evolveTarget]);

  useEffect(() => {
    if (!evolveTarget || evolutionState.status !== 'ready' || !evolutionState.nextSpecies) {
      setEvolutionSprite(null);
      return;
    }

    let cancelled = false;
    loadPokemonSprite(evolutionState.nextSpecies)
      .then((sprite) => {
        if (!cancelled) {
          setEvolutionSprite(sprite);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvolutionSprite(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [evolveTarget, evolutionState.status, evolutionState.nextSpecies]);

  useEffect(() => {
    if (!evolveTarget) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [evolveTarget]);

  const handleSlotDragStart = (
    event: ReactDragEvent<HTMLButtonElement>,
    slotIndex: number,
    entry: PokemonEntry | null,
    spriteUrl: string | null
  ) => {
    if (!entry || !entry.species || !currentPlayerId) {
      event.preventDefault();
      return;
    }

    const trainerRef = entry.trainerId ?? currentPlayerId;
    if (!ownsTrainer || trainerRef !== currentPlayerId) {
      event.preventDefault();
      return;
    }

    event.stopPropagation();

    dropHandledRef.current = false;
    dragMovedRef.current = false;
    detachWindowDragHandlers();
    setIsDraggingParty(true);
    setDraggedSlot(slotIndex);
    setDraggingSlot(slotIndex);
    setGraveHover(false);

    const payload: DragPayload = {
      type: 'party-pokemon',
      trainerId: currentPlayerId,
      species: entry.species,
      nickname: entry.nickname,
      encounterId: entry.encounterId,
      slotIndex
    };

    if (import.meta.env.DEV) {
      console.log('Party drag start', {
        slotIndex,
        species: entry.species,
        trainerId: entry.trainerId,
        currentPlayerId
      });
    }

    dragStartPositionRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY
    };
    dragLastPositionRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY
    };

    if (typeof window !== 'undefined') {
      const handleWindowDrag = (nativeEvent: globalThis.DragEvent) => {
        dragMovedRef.current = true;
        dragLastPositionRef.current = {
          clientX: nativeEvent.clientX,
          clientY: nativeEvent.clientY,
          screenX: nativeEvent.screenX,
          screenY: nativeEvent.screenY
        };

        if (import.meta.env.DEV) {
          console.log('Party drag move (window)', dragLastPositionRef.current);
        }
      };

      windowDragHandlerRef.current = handleWindowDrag;
      window.addEventListener('dragover', handleWindowDrag, true);
      window.addEventListener('drag', handleWindowDrag, true);
    }

    event.dataTransfer.setData(PARTY_DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', entry.species);
    event.dataTransfer.effectAllowed = 'copy';

    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }

    const preview = document.createElement('div');
    preview.className = styles.dragPreview;

    if (spriteUrl) {
      const image = document.createElement('img');
      image.src = spriteUrl;
      image.alt = `${entry.species} sprite`;
      image.className = styles.dragPreviewImage;
      preview.appendChild(image);
    } else {
      preview.textContent = entry.species.charAt(0).toUpperCase();
    }

    document.body.appendChild(preview);
    dragPreviewRef.current = preview;
    const rect = preview.getBoundingClientRect();
    event.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);

    const node = event.currentTarget as HTMLButtonElement | null;
    if (node) {
      node.dataset.dragging = 'true';
      activeDragCircleRef.current = node;
    }
  };

  const handleSlotDrag = (event: ReactDragEvent<HTMLButtonElement>) => {
    dragMovedRef.current = true;
    dragLastPositionRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY
    };

    if (import.meta.env.DEV) {
      console.log('Party drag move', dragLastPositionRef.current);
    }
  };

  const handleSlotDragEnd = (event: ReactDragEvent<HTMLButtonElement>, slotIndex: number) => {
    setIsDraggingParty(false);
    setGraveHover(false);
    setDraggedSlot(null);
    setDraggingSlot(null);
    detachWindowDragHandlers();

    if (import.meta.env.DEV) {
      console.log('Party drag end', {
        slotIndex,
        dropHandled: dropHandledRef.current,
        dragMoved: dragMovedRef.current,
        endClientX: event.clientX,
        endClientY: event.clientY,
        endScreenX: event.screenX,
        endScreenY: event.screenY
      });
    }

    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }

    if (activeDragCircleRef.current) {
      delete activeDragCircleRef.current.dataset.dragging;
      activeDragCircleRef.current = null;
    }

    const lastPosition = dragLastPositionRef.current;
    const effectiveEnd = {
      clientX: dragMovedRef.current ? lastPosition.clientX : event.clientX,
      clientY: dragMovedRef.current ? lastPosition.clientY : event.clientY,
      screenX: dragMovedRef.current ? lastPosition.screenX : event.screenX,
      screenY: dragMovedRef.current ? lastPosition.screenY : event.screenY
    };

    const start = dragStartPositionRef.current;
    const deltaClient = Math.max(Math.abs(effectiveEnd.clientX - start.clientX), Math.abs(effectiveEnd.clientY - start.clientY));
    const deltaScreen = Math.max(Math.abs(effectiveEnd.screenX - start.screenX), Math.abs(effectiveEnd.screenY - start.screenY));
    const movedEnough = dragMovedRef.current || deltaClient > 3 || deltaScreen > 3;

    if (!dropHandledRef.current && movedEnough) {
      onClear(slotIndex);
    }
  };

  const handleSlotClick = (event: ReactMouseEvent<HTMLButtonElement>, slotIndex: number, entry: PokemonEntry | null) => {
    if (!ownsTrainer || !entry || !entry.species) {
      return;
    }
    if (draggingSlot !== null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setEvolveTarget({ slotIndex, entry });
  };

  const closeEvolutionDialog = () => {
    setEvolveTarget(null);
    setEvolutionState({ status: 'idle', nextSpecies: null, errorMessage: null });
    setEvolutionSprite(null);
  };

  const handleConfirmEvolution = () => {
    if (!evolveTarget || evolutionState.status !== 'ready' || !evolutionState.nextSpecies) {
      return;
    }
    onEvolve(evolveTarget.slotIndex, {
      species: evolutionState.nextSpecies,
      encounterId: evolveTarget.entry.encounterId ?? null,
      trainerId: evolveTarget.entry.trainerId ?? currentPlayerId ?? null
    });
    closeEvolutionDialog();
  };

  const handleDragEnter = (slotIndex: number, event: ReactDragEvent<HTMLDivElement>) => {
    if (!ownsTrainer) {
      return;
    }
    const types = Array.from(event.dataTransfer.types || []);
    if (!types.includes(PARTY_DRAG_TYPE)) {
      return;
    }
    event.preventDefault();
    setDraggedSlot(slotIndex);
  };

  const handleDragOver = (slotIndex: number, event: ReactDragEvent<HTMLDivElement>) => {
    if (!ownsTrainer) {
      return;
    }
    const types = Array.from(event.dataTransfer.types || []);
    if (!types.includes(PARTY_DRAG_TYPE)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDraggedSlot(slotIndex);
  };

  const handleDragLeave = () => {
    setDraggedSlot(null);
  };

  const handleDrop = (slotIndex: number, event: ReactDragEvent<HTMLDivElement>) => {
    if (!ownsTrainer) {
      return;
    }
    event.preventDefault();
    setDraggedSlot(null);
    setIsDraggingParty(false);
    dragMovedRef.current = true;
    setDraggingSlot(null);
    detachWindowDragHandlers();

    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }

    if (activeDragCircleRef.current) {
      delete activeDragCircleRef.current.dataset.dragging;
      activeDragCircleRef.current = null;
    }

    const raw = event.dataTransfer.getData(PARTY_DRAG_TYPE);
    if (!raw) {
      return;
    }

    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch (error) {
      return;
    }

    if (payload.type !== 'encounter-pokemon' || payload.trainerId !== currentPlayerId || !payload.species) {
      return;
    }

    dropHandledRef.current = true;
    onAssign(slotIndex, {
      species: payload.species,
      nickname: payload.nickname?.trim() ?? '',
      encounterId: payload.encounterId ?? null
    });
  };

  const handleGraveDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!ownsTrainer || !isDraggingParty) {
      return;
    }
    const types = Array.from(event.dataTransfer.types || []);
    if (!types.includes(PARTY_DRAG_TYPE)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setGraveHover(true);
  };

  const handleGraveDragLeave = () => {
    setGraveHover(false);
  };

  const handleGraveDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!ownsTrainer || !isDraggingParty) {
      return;
    }

    event.preventDefault();
    setGraveHover(false);
    setIsDraggingParty(false);
    dragMovedRef.current = true;
    setDraggingSlot(null);
    detachWindowDragHandlers();

    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }

    if (activeDragCircleRef.current) {
      delete activeDragCircleRef.current.dataset.dragging;
      activeDragCircleRef.current = null;
    }

    const raw = event.dataTransfer.getData(PARTY_DRAG_TYPE);
    if (!raw) {
      return;
    }

    let payload: DragPayload;
    try {
      payload = JSON.parse(raw) as DragPayload;
    } catch (error) {
      return;
    }

    if (
      payload.type !== 'party-pokemon' ||
      payload.trainerId !== currentPlayerId ||
      typeof payload.slotIndex !== 'number'
    ) {
      return;
    }

    dropHandledRef.current = true;
    onKill(payload.slotIndex, { encounterId: payload.encounterId ?? null, trainerId: payload.trainerId ?? null });
  };

  return (
    <>
      <aside className={styles.partyDock} aria-label="Current party">
      <div className={styles.dockContent}>
        <div className={styles.panel}>
          <header className={styles.panelHeader}>
            <span className={styles.panelTitle}>Current party</span>
            <span className={styles.panelSubtitle}>{playerName || 'Unclaimed trainer'}</span>
          </header>
          {!ownsTrainer ? (
            <p className={styles.helperText}>Claim a trainer slot to build your party.</p>
          ) : null}
          <div className={styles.slotRow}>
            {slots.map((entry, index) => {
            const isActive = draggedSlot === index;
            const spriteUrl = sprites[index] ?? null;
            const displayName = entry?.nickname || entry?.species || '';
            const fallbackInitial = entry?.species ? entry.species.charAt(0).toUpperCase() : '+';
            const key = `${index}-${entry?.id ?? 'empty'}`;
            const status = entry?.status ?? 'active';

            const dropHandlers = ownsTrainer
              ? {
                  onDragEnter: (event: ReactDragEvent<HTMLDivElement>) => handleDragEnter(index, event),
                  onDragOver: (event: ReactDragEvent<HTMLDivElement>) => handleDragOver(index, event),
                  onDragLeave: handleDragLeave,
                  onDrop: (event: ReactDragEvent<HTMLDivElement>) => handleDrop(index, event)
                }
              : {};

            return (
              <div
                key={key}
                className={styles.slot}
                data-filled={entry ? 'true' : 'false'}
                data-active={isActive ? 'true' : 'false'}
                data-status={status}
                {...dropHandlers}
              >
                {entry ? (
                  <>
                    <button
                      type="button"
                      className={styles.slotCircle}
                      data-status={status}
                      draggable={ownsTrainer && Boolean(entry.species) && (!entry.trainerId || entry.trainerId === currentPlayerId)}
                      data-draggable={
                        ownsTrainer && Boolean(entry.species) && (!entry.trainerId || entry.trainerId === currentPlayerId)
                          ? 'true'
                          : 'false'
                      }
                      data-dragging={draggingSlot === index ? 'true' : 'false'}
                      onDragStart={(event) => handleSlotDragStart(event, index, entry, spriteUrl)}
                      onDrag={handleSlotDrag}
                      onDragEnd={(event) => handleSlotDragEnd(event, index)}
                      onClick={(event) => handleSlotClick(event, index, entry)}
                      aria-label={`Drag ${displayName || entry.species} from party`}
                    >
                      {spriteUrl ? (
                        <img
                          src={spriteUrl}
                          alt={`${entry.species} sprite`}
                          className={styles.slotSprite}
                          draggable={false}
                        />
                      ) : (
                        <span className={styles.slotInitial}>{fallbackInitial}</span>
                      )}
                    </button>
                    <span className={styles.slotLabel}>{displayName}</span>
                  </>
                ) : (
                  <>
                    <div className={styles.slotCircle}>
                      <span className={styles.slotInitial}>+</span>
                    </div>
                    <span className={styles.slotLabel}>Slot {index + 1}</span>
                  </>
                )}
              </div>
            );
          })}
          </div>
        </div>
        {ownsTrainer && (
          <div
            className={styles.graveyard}
            data-visible={isDraggingParty || graveHover ? 'true' : 'false'}
            data-hover={graveHover ? 'true' : 'false'}
            onDragOver={handleGraveDragOver}
            onDragLeave={handleGraveDragLeave}
            onDrop={handleGraveDrop}
          >
            <div className={styles.graveMark}>RIP</div>
            <span className={styles.graveLabel}>Send to grave</span>
          </div>
        )}
      </div>
      </aside>
      {evolveTarget
        ? createPortal(
            <div className={styles.evolveOverlay} role="presentation" onClick={closeEvolutionDialog}>
              <div
                className={styles.evolveCard}
                role="dialog"
                aria-modal="true"
                aria-labelledby="evolve-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h3 id="evolve-modal-title">Evolve {evolveTarget.entry.nickname || evolveTarget.entry.species}?</h3>
                <p className={styles.evolveHint}>
                  {evolutionState.status === 'loading'
                    ? 'Looking up the next evolution…'
                    : evolutionState.status === 'error'
                      ? evolutionState.errorMessage ?? 'Unable to find an evolution.'
                      : evolutionState.nextSpecies
                        ? `Next evolution: ${evolutionState.nextSpecies}`
                        : 'No evolution available.'}
                </p>
                {evolutionSprite ? (
                  <img
                    src={evolutionSprite}
                    alt={`${evolutionState.nextSpecies} sprite preview`}
                    className={styles.evolvePreview}
                  />
                ) : null}
                <div className={styles.evolveActions}>
                  <button type="button" className={styles.evolveCancelButton} onClick={closeEvolutionDialog}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.evolveConfirmButton}
                    onClick={handleConfirmEvolution}
                    disabled={evolutionState.status !== 'ready' || !evolutionState.nextSpecies}
                  >
                    {evolutionState.status === 'ready' && evolutionState.nextSpecies
                      ? `Evolve to ${evolutionState.nextSpecies}`
                      : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default PartyPanel;
