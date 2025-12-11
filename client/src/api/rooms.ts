import type { RoomState, ServerRoomInit } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface CreateRoomResponse {
  roomId: string;
}

interface GetRoomResponse {
  roomId: string;
  hasState: boolean;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message;
    throw new Error(message ?? 'Request failed');
  }

  return payload as T;
};

export const createRoom = async (): Promise<CreateRoomResponse> => {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST'
  });

  return handleResponse<CreateRoomResponse>(response);
};

export const getRoom = async (roomId: string): Promise<GetRoomResponse> => {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`);
  return handleResponse<GetRoomResponse>(response);
};

export const buildRoomShareLink = (roomId: string): string => {
  const url = new URL(window.location.href);
  url.pathname = `/rooms/${roomId}`;
  url.search = '';
  url.hash = '';
  return url.toString();
};

export const toWebSocketUrl = (roomId: string) => {
  const base = new URL(API_BASE_URL);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = '/ws';
  base.searchParams.set('roomId', roomId);
  return base.toString();
};

export interface RoomConnectionState {
  roomId: string;
  init: ServerRoomInit;
  state: RoomState;
}
