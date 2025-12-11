import { useCallback, useEffect, useRef, useState } from 'react';
import { toWebSocketUrl } from '../api/rooms';
import type { RoomState, ServerRoomInit } from '../types';

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseRoomConnectionResult {
  status: ConnectionStatus;
  roomState: RoomState | null;
  initPayload: ServerRoomInit | null;
  error: string | null;
  lastSyncedAt: number | null;
  syncState: (
    updater:
      | RoomState
      | ((previous: RoomState) => RoomState)
  ) => void;
}

export const useRoomConnection = (roomId: string): UseRoomConnectionResult => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [initPayload, setInitPayload] = useState<ServerRoomInit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setStatus('connecting');
    setError(null);

    const wsUrl = toWebSocketUrl(roomId);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setStatus('open');
      setError(null);
    });

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'init': {
            setInitPayload(data.payload);
            setRoomState(data.payload.state);
            setError(null);
            break;
          }
          case 'state_updated': {
            setRoomState(data.payload);
            setError(null);
            break;
          }
          case 'error': {
            setError(data.message ?? 'Unknown error');
            break;
          }
          case 'pong': {
            break;
          }
          default: {
            break;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse message');
      }
    });

    socket.addEventListener('error', () => {
      setStatus('error');
      setError('Connection error.');
    });

    socket.addEventListener('close', () => {
      setStatus('closed');
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (status !== 'open' || !socketRef.current) {
      return;
    }

    const interval = window.setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => {
      window.clearInterval(interval);
    };
  }, [status]);

  const syncState = useCallback<UseRoomConnectionResult['syncState']>((updater) => {
    setRoomState((current) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        return typeof updater === 'function' && current ? updater(current) : current;
      }

      const baseState = current ?? initPayload?.state;
      if (!baseState) {
        return current;
      }

      const nextState =
        typeof updater === 'function'
          ? updater(baseState)
          : updater;

      socketRef.current.send(
        JSON.stringify({
          type: 'sync_state',
          payload: nextState
        })
      );

      setInitPayload((previousInit) =>
        previousInit ? { ...previousInit, state: nextState } : previousInit
      );
      setLastSyncedAt(Date.now());
      return nextState;
    });
  }, [initPayload]);

  return {
    status,
    roomState,
    initPayload,
    error,
    lastSyncedAt,
    syncState
  };
};
