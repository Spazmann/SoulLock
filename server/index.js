const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { getRoomsCollection, closeClient } = require('./db');

const PORT = process.env.PORT || 4000;
const ALLOWED_STATUSES = new Set(['active', 'fainted', 'boxed']);
const ALLOWED_GAME_SERIES = new Set(['oras', 'hgss', 'sword_shield']);
const ALLOWED_VANILLA_MODES = new Set(['standard', 'randomizer']);
const DEFAULT_ROOM_NAME = 'Soul Lock Room';
const MAX_ROOM_NAME_LENGTH = 80;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const CLIENT_DIST_PATH = path.resolve(__dirname, '../client/dist');
const INDEX_HTML_PATH = path.join(CLIENT_DIST_PATH, 'index.html');
const HAS_CLIENT_BUILD = fs.existsSync(INDEX_HTML_PATH);

const activeRooms = new Map();

const getActiveRoomSockets = (roomId) => {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, new Set());
  }

  return activeRooms.get(roomId);
};

const createInitialState = () => ({
  name: DEFAULT_ROOM_NAME,
  players: [],
  encounters: [],
  gameSeries: 'oras',
  vanillaMode: 'standard',
  roomGameId: null,
  isConfigured: false,
  createdAt: Date.now(),
  lastUpdatedAt: Date.now()
});

const sanitizePokemon = (pokemon = {}, fallbackSlot = 0) => {
  const id = typeof pokemon.id === 'string' && pokemon.id ? pokemon.id : randomUUID();
  const rawSpecies =
    typeof pokemon.species === 'string'
      ? pokemon.species
      : typeof pokemon.name === 'string'
        ? pokemon.name
        : '';
  const species = rawSpecies.trim().slice(0, 40);
  const rawNickname = typeof pokemon.nickname === 'string' ? pokemon.nickname : '';
  const nickname = rawNickname.trim().slice(0, 40);
  const status = ALLOWED_STATUSES.has(pokemon.status) ? pokemon.status : 'active';
  const notes = typeof pokemon.notes === 'string' ? pokemon.notes : '';
  const rawSlot = Number.isInteger(pokemon.slot) ? pokemon.slot : fallbackSlot;
  const slot = Math.min(Math.max(rawSlot, 0), 5);
  const rawEncounterId = typeof pokemon.encounterId === 'string' ? pokemon.encounterId.trim() : '';
  const encounterId = rawEncounterId ? rawEncounterId.slice(0, 64) : null;
  const rawTrainerId = typeof pokemon.trainerId === 'string' ? pokemon.trainerId.trim() : '';
  const trainerId = rawTrainerId ? rawTrainerId.slice(0, 64) : null;

  return {
    id,
    species,
    nickname,
    status,
    notes,
    slot,
    encounterId,
    trainerId
  };
};

const sanitizePlayer = (player = {}) => ({
  id: typeof player.id === 'string' && player.id ? player.id : randomUUID(),
  name: typeof player.name === 'string' ? player.name : '',
  notes: typeof player.notes === 'string' ? player.notes : '',
  team: Array.isArray(player.team)
    ? player.team
        .slice(0, 6)
        .filter(Boolean)
        .map((entry, index) => sanitizePokemon(entry, index))
        .sort((a, b) => a.slot - b.slot)
    : [],
  lockedBy: typeof player.lockedBy === 'string' && player.lockedBy.trim() ? player.lockedBy.trim().slice(0, 64) : null
});

const sanitizeRoomName = (name, fallback = DEFAULT_ROOM_NAME) => {
  if (typeof name === 'string') {
    const trimmed = name.trim();
    if (trimmed) {
      return trimmed.slice(0, MAX_ROOM_NAME_LENGTH);
    }
  }
  return fallback;
};

const sanitizeGameSeries = (value, fallback = 'oras') => {
  if (typeof value === 'string' && ALLOWED_GAME_SERIES.has(value)) {
    return value;
  }
  return fallback;
};

const sanitizeVanillaMode = (value, fallback = 'standard') => {
  if (typeof value === 'string' && ALLOWED_VANILLA_MODES.has(value)) {
    return value;
  }
  return fallback;
};

const sanitizeRoomGameId = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 64) : null;
  }

  return null;
};

const sanitizeIsConfigured = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
};

const sanitizeEncounterSelection = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rawSpecies =
      typeof value.species === 'string'
        ? value.species
        : typeof value.name === 'string'
          ? value.name
          : null;
    const trimmedSpecies = rawSpecies ? rawSpecies.trim() : '';
    const species = trimmedSpecies ? trimmedSpecies.slice(0, 40) : null;

    const rawNickname = typeof value.nickname === 'string' ? value.nickname : '';
    const trimmedNickname = rawNickname.trim();
    const nickname = trimmedNickname ? trimmedNickname.slice(0, 40) : '';

    const isDead = Boolean(value.isDead);

    return { species, nickname, isDead };
  }

  if (typeof value === 'string') {
    const trimmedSpecies = value.trim();
    return {
      species: trimmedSpecies ? trimmedSpecies.slice(0, 40) : null,
      nickname: '',
      isDead: false
    };
  }

  return { species: null, nickname: '', isDead: false };
};

const sanitizeEncounter = (encounter = {}, players = []) => {
  const playerIds = new Set(players.map((player) => player.id));
  const id = typeof encounter.id === 'string' && encounter.id ? encounter.id : randomUUID();
  const locationId = typeof encounter.locationId === 'string' && encounter.locationId ? encounter.locationId : null;

  const rawSelections =
    encounter.pokemonSelections && typeof encounter.pokemonSelections === 'object' && !Array.isArray(encounter.pokemonSelections)
      ? encounter.pokemonSelections
      : {};

  const sanitizedSelections = {};
  players.forEach((player) => {
    if (!playerIds.has(player.id)) {
      return;
    }

    sanitizedSelections[player.id] = sanitizeEncounterSelection(rawSelections[player.id]);
  });

  return {
    id,
    locationId,
    pokemonSelections: sanitizedSelections
  };
};

const sanitizeState = (incoming, previous) => {
  const base = previous ?? createInitialState();
  const players = Array.isArray(incoming?.players)
    ? incoming.players.map(sanitizePlayer)
    : base.players;
  const name = sanitizeRoomName(incoming?.name, base.name ?? DEFAULT_ROOM_NAME);
  const gameSeries = sanitizeGameSeries(incoming?.gameSeries, base.gameSeries ?? 'oras');
  const vanillaMode = sanitizeVanillaMode(
    incoming?.vanillaMode ?? incoming?.vinnliaMode,
    base.vanillaMode ?? base.vinnliaMode ?? 'standard'
  );
  const roomGameId =
    sanitizeRoomGameId(incoming?.roomGameId ?? incoming?.gameId ?? incoming?.roomGame) ??
    base.roomGameId ??
    null;
  const isConfigured = sanitizeIsConfigured(incoming?.isConfigured, base.isConfigured ?? false);
  const encounters = Array.isArray(incoming?.encounters)
    ? incoming.encounters.map((encounter) => sanitizeEncounter(encounter, players))
    : Array.isArray(base.encounters)
      ? base.encounters
      : [];

  return {
    ...base,
    name,
    players,
    encounters,
    gameSeries,
    vanillaMode,
    roomGameId,
    isConfigured,
    lastUpdatedAt: Date.now()
  };
};

const generateRoomId = () => randomUUID().split('-')[0];

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/rooms', async (_req, res, next) => {
  try {
    const roomId = generateRoomId();
    const state = createInitialState();
    const roomsCollection = await getRoomsCollection();

    await roomsCollection.insertOne({
      _id: roomId,
      state,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({ roomId });
  } catch (error) {
    next(error);
  }
});

app.get('/rooms/:roomId', async (req, res, next) => {
  if (HAS_CLIENT_BUILD && (req.headers.accept || '').includes('text/html')) {
    return res.sendFile(INDEX_HTML_PATH);
  }

  try {
    const { roomId } = req.params;
    const roomsCollection = await getRoomsCollection();
    const room = await roomsCollection.findOne({ _id: roomId }, { projection: { state: 1 } });

    if (!room) {
      return res.status(404).json({
        error: 'room_not_found',
        message: 'The requested room does not exist.'
      });
    }

    res.json({
      roomId,
      hasState: Boolean(room.state)
    });
  } catch (error) {
    next(error);
  }
});

if (HAS_CLIENT_BUILD) {
  app.use(
    express.static(CLIENT_DIST_PATH, {
      setHeaders: (res, servedPath) => {
        if (path.extname(servedPath) === '.html') {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    })
  );

  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (req.path === '/health' || req.path.startsWith('/ws')) {
      return next();
    }

    const acceptHeader = req.headers.accept || '';
    if (!acceptHeader.includes('text/html')) {
      return next();
    }

    return res.sendFile(INDEX_HTML_PATH);
  });
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const safeSend = (ws, payload) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

const broadcastRoom = (roomId, payload, except) => {
  const sockets = activeRooms.get(roomId);
  if (!sockets) {
    return;
  }

  sockets.forEach((client) => {
    if (client !== except && client.readyState === client.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
};

wss.on('connection', (socket, req) => {
  const search = new URL(req.url, `http://${req.headers.host}`);
  const roomId = search.searchParams.get('roomId');
  (async () => {
    if (!roomId) {
      safeSend(socket, {
        type: 'error',
        error: 'room_not_found',
        message: 'Room does not exist.'
      });
      return socket.close(1008, 'Room not found');
    }

    const roomsCollection = await getRoomsCollection();
    const room = await roomsCollection.findOne({ _id: roomId });

    if (!room) {
      safeSend(socket, {
        type: 'error',
        error: 'room_not_found',
        message: 'Room does not exist.'
      });
      return socket.close(1008, 'Room not found');
    }

    const sockets = getActiveRoomSockets(roomId);
    sockets.add(socket);

    let currentState = room.state ?? createInitialState();
    const sanitizedPlayers = Array.isArray(currentState.players)
      ? currentState.players.map(sanitizePlayer)
      : [];
    currentState = {
      ...currentState,
      name: sanitizeRoomName(currentState.name, DEFAULT_ROOM_NAME),
      players: sanitizedPlayers,
      encounters: Array.isArray(currentState.encounters)
        ? currentState.encounters.map((encounter) => sanitizeEncounter(encounter, sanitizedPlayers))
        : [],
      gameSeries: sanitizeGameSeries(currentState.gameSeries, 'oras'),
      vanillaMode: sanitizeVanillaMode(
        currentState.vanillaMode ?? currentState.vinnliaMode,
        'standard'
      ),
      roomGameId: sanitizeRoomGameId(currentState.roomGameId ?? currentState.gameId ?? currentState.roomGame),
      isConfigured: sanitizeIsConfigured(currentState.isConfigured, true)
    };

    safeSend(socket, {
      type: 'init',
      payload: {
        roomId,
        state: currentState
      }
    });

    socket.on('message', async (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (error) {
        return safeSend(socket, {
          type: 'error',
          error: 'invalid_message',
          message: 'Messages must be valid JSON.'
        });
      }

      if (!data || typeof data.type !== 'string') {
        return safeSend(socket, {
          type: 'error',
          error: 'invalid_message',
          message: 'Messages must include a type field.'
        });
      }

      switch (data.type) {
        case 'sync_state': {
          if (data.payload && typeof data.payload === 'object') {
            try {
              currentState = sanitizeState(data.payload, currentState);
              await roomsCollection.updateOne(
                { _id: roomId },
                {
                  $set: {
                    state: currentState,
                    updatedAt: new Date()
                  }
                }
              );

              broadcastRoom(roomId, {
                type: 'state_updated',
                payload: currentState
              }, socket);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error('Failed to persist room state', error);
              safeSend(socket, {
                type: 'error',
                error: 'internal_error',
                message: 'Failed to save room state.'
              });
            }
          }
          break;
        }
        case 'ping': {
          safeSend(socket, { type: 'pong', at: Date.now() });
          break;
        }
        default: {
          safeSend(socket, {
            type: 'error',
            error: 'unsupported_type',
            message: `Unsupported message type: ${data.type}`
          });
        }
      }
    });

    socket.on('close', () => {
      sockets.delete(socket);
      if (sockets.size === 0) {
        activeRooms.delete(roomId);
      }
    });
  })().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('WebSocket connection error', error);
    safeSend(socket, {
      type: 'error',
      error: 'internal_error',
      message: 'The server encountered an error.'
    });
    socket.close(1011, 'Internal error');
  });
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'Something went wrong.'
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});

const gracefulShutdown = async () => {
  try {
    await closeClient();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to close MongoDB client during shutdown', error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
