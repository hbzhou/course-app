/// <reference types="node" />
import * as http from 'node:http';
import * as crypto from 'node:crypto';
import type { Socket } from 'node:net';

const PORT = Number(process.env.MOCK_API_PORT || 18081);

type AnyRecord = Record<string, unknown>;

type CrudEntity = {
  id: number;
} & AnyRecord;

const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-signature.mock-payload';
const SESSION_COOKIE = 'MOCK_SESSION_ID';

const roles = [
  { id: 1, name: 'ROLE_ADMIN' },
  { id: 2, name: 'ROLE_USER' },
];

const authors = [
  { id: 1, name: 'John Doe' },
  { id: 2, name: 'Jane Smith' },
];

const tags = [
  { id: 1, name: 'Frontend', color: '#0ea5e9' },
  { id: 2, name: 'Backend', color: '#22c55e' },
];

const courses = [
  {
    id: 1,
    title: 'React Fundamentals',
    description: 'Build modern React apps',
    creationDate: '10/04/2026',
    duration: 120,
    authors: [authors[0]],
    tags: [tags[0]],
  },
  {
    id: 2,
    title: 'Spring Boot Essentials',
    description: 'API development with Spring Boot',
    creationDate: '10/04/2026',
    duration: 180,
    authors: [authors[1]],
    tags: [tags[1]],
  },
];

const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    roles: [roles[0]],
  },
  {
    id: 2,
    username: 'user',
    email: 'user@example.com',
    roles: [roles[1]],
  },
];

const sessions = new Map<string, { name: string; email: string }>();

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || rawValue.length === 0) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

const getSessionFromRequest = (req: http.IncomingMessage) => {
  const cookieHeader = Array.isArray(req.headers.cookie) ? req.headers.cookie.join('; ') : req.headers.cookie;
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies[SESSION_COOKIE];
  if (!sessionId) return undefined;
  return sessions.get(sessionId);
};

const parseJsonBody = async <T extends AnyRecord = AnyRecord>(
  req: http.IncomingMessage
): Promise<T | undefined> =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer | string) => {
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(body) as T);
      } catch {
        resolve(undefined);
      }
    });
  });

const json = (res: http.ServerResponse, statusCode: number, payload: unknown) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const notFound = (res: http.ServerResponse) => json(res, 404, { message: 'Not found' });

const withCors = (res: http.ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
};

const createCrudHandlers = <T extends CrudEntity>(
  collectionRef: () => T[],
  requiredFields: Array<keyof T> = []
) => ({
  list: (res: http.ServerResponse) => json(res, 200, collectionRef()),
  create: async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const body = (await parseJsonBody<AnyRecord>(req)) ?? {};
    const nextId = Math.max(0, ...collectionRef().map((item) => Number(item.id) || 0)) + 1;

    for (const field of requiredFields) {
      if (!body[String(field)]) {
        json(res, 400, { message: `${String(field)} is required` });
        return;
      }
    }

    const newItem = { ...(body as T), id: nextId };
    collectionRef().push(newItem);
    json(res, 201, newItem);
  },
  update: async (req: http.IncomingMessage, res: http.ServerResponse, id: number) => {
    const body = (await parseJsonBody<AnyRecord>(req)) ?? {};
    const items = collectionRef();
    const index = items.findIndex((item) => Number(item.id) === id);
    if (index < 0) {
      notFound(res);
      return;
    }

    items[index] = { ...items[index], ...body, id };
    json(res, 200, items[index]);
  },
  remove: (res: http.ServerResponse, id: number) => {
    const items = collectionRef();
    const index = items.findIndex((item) => Number(item.id) === id);
    if (index < 0) {
      notFound(res);
      return;
    }

    items.splice(index, 1);
    res.writeHead(204);
    res.end();
  },
});

const authorHandlers = createCrudHandlers(() => authors, ['name']);
const tagHandlers = createCrudHandlers(() => tags, ['name', 'color']);
const courseHandlers = createCrudHandlers(() => courses, ['title', 'description', 'creationDate', 'duration']);
const userHandlers = createCrudHandlers(() => users, ['username', 'email', 'roles']);

const wsClients = new Set<Socket>();

const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const getWebSocketAccept = (key: string) =>
  crypto.createHash('sha1').update(`${key}${WS_MAGIC}`).digest('base64');

const cleanupSocket = (socket: Socket) => {
  wsClients.delete(socket);
};

const encodeWsTextFrame = (text: string): Buffer => {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;

  if (len <= 125) {
    return Buffer.concat([Buffer.from([0x81, len]), payload]);
  }

  if (len <= 0xffff) {
    const header = Buffer.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  // Only set low 32 bits for simplicity; sufficient for our tiny STOMP frames.
  header.writeUInt32BE(0, 2);
  header.writeUInt32BE(len, 6);
  return Buffer.concat([header, payload]);
};

type DecodedFrame = {
  opcode: number;
  payload: Buffer;
};

const decodeClientTextFrames = (buffer: Buffer): { frames: DecodedFrame[]; consumed: number } => {
  const frames: DecodedFrame[] = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const masked = (byte2 & 0x80) !== 0;
    let payloadLen = byte2 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      const high = buffer.readUInt32BE(offset + 2);
      const low = buffer.readUInt32BE(offset + 6);
      if (high !== 0) {
        // Frames this large are not expected for mock STOMP traffic.
        break;
      }
      payloadLen = low;
      headerLen = 10;
    }

    const maskLen = masked ? 4 : 0;
    const frameLen = headerLen + maskLen + payloadLen;
    if (offset + frameLen > buffer.length) break;

    const payloadStart = offset + headerLen + maskLen;
    let payload = buffer.subarray(payloadStart, payloadStart + payloadLen);

    if (masked) {
      const maskKeyStart = offset + headerLen;
      const maskKey = buffer.subarray(maskKeyStart, maskKeyStart + 4);
      const unmasked = Buffer.alloc(payloadLen);
      for (let i = 0; i < payloadLen; i += 1) {
        unmasked[i] = payload[i] ^ maskKey[i % 4];
      }
      payload = unmasked;
    }

    frames.push({ opcode, payload });
    offset += frameLen;
  }

  return { frames, consumed: offset };
};

const stompConnectedFrame = [
  'CONNECTED',
  'version:1.2',
  'heart-beat:0,0',
  '',
  '',
].join('\n');

const maybeHandleStomp = (socket: Socket, payloadText: string) => {
  const frames = payloadText.split('\0').map((part) => part.trim()).filter(Boolean);

  for (const frame of frames) {
    if (frame.startsWith('CONNECT\n') || frame.startsWith('STOMP\n')) {
      socket.write(encodeWsTextFrame(`${stompConnectedFrame}\0`));
      return;
    }
  }
};

const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!req.url) {
    notFound(res);
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const { pathname } = url;

  if (pathname === '/health') {
    json(res, 200, { status: 'ok' });
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = (await parseJsonBody(req)) || {};
    const valid = body.username === 'admin' && body.password === 'admin123';

    if (!valid) {
      json(res, 401, { message: 'Invalid username or password' });
      return;
    }

    const sessionId = crypto.randomUUID();
    const user = {
      name: 'Admin User',
      email: 'admin@example.com',
    };
    sessions.set(sessionId, user);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax`);

    json(res, 200, {
      token: fakeJwt,
      user,
    });
    return;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = (await parseJsonBody(req)) || {};
    json(res, 201, {
      token: fakeJwt,
      user: {
        name: body.name || 'Registered User',
        email: body.email || 'user@example.com',
      },
    });
    return;
  }

  if (pathname === '/api/auth/logout' && req.method === 'DELETE') {
    const cookieHeader = Array.isArray(req.headers.cookie) ? req.headers.cookie.join('; ') : req.headers.cookie;
    const cookies = parseCookies(cookieHeader);
    const sessionId = cookies[SESSION_COOKIE];
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const sessionUser = getSessionFromRequest(req);
    if (!sessionUser) {
      json(res, 401, { message: 'Unauthorized' });
      return;
    }

    json(res, 200, {
      name: sessionUser.name,
      email: sessionUser.email,
      provider: 'legacy',
      authType: 'session',
      permissions: [
        'COURSE_VIEW',
        'COURSE_EDIT',
        'AUTHOR_EDIT',
        'TAG_EDIT',
        'USER_MANAGE',
        'ROLE_MANAGE',
      ],
    });
    return;
  }

  if (pathname === '/api/roles' && req.method === 'GET') {
    json(res, 200, roles);
    return;
  }

  if (pathname === '/api/courses' && req.method === 'GET') return courseHandlers.list(res);
  if (pathname === '/api/courses' && req.method === 'POST') return courseHandlers.create(req, res);
  if (pathname === '/api/authors' && req.method === 'GET') return authorHandlers.list(res);
  if (pathname === '/api/authors' && req.method === 'POST') return authorHandlers.create(req, res);
  if (pathname === '/api/tags' && req.method === 'GET') return tagHandlers.list(res);
  if (pathname === '/api/tags' && req.method === 'POST') return tagHandlers.create(req, res);
  if (pathname === '/api/users' && req.method === 'GET') return userHandlers.list(res);
  if (pathname === '/api/users' && req.method === 'POST') return userHandlers.create(req, res);

  const courseMatch = pathname.match(/^\/api\/courses\/(\d+)$/);
  if (courseMatch) {
    const id = Number(courseMatch[1]);
    if (req.method === 'PUT') return courseHandlers.update(req, res, id);
    if (req.method === 'DELETE') return courseHandlers.remove(res, id);
  }

  const authorMatch = pathname.match(/^\/api\/authors\/(\d+)$/);
  if (authorMatch) {
    const id = Number(authorMatch[1]);
    if (req.method === 'PUT') return authorHandlers.update(req, res, id);
    if (req.method === 'DELETE') return authorHandlers.remove(res, id);
  }

  const tagMatch = pathname.match(/^\/api\/tags\/(\d+)$/);
  if (tagMatch) {
    const id = Number(tagMatch[1]);
    if (req.method === 'PUT') return tagHandlers.update(req, res, id);
    if (req.method === 'DELETE') return tagHandlers.remove(res, id);
  }

  const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    if (req.method === 'GET') {
      const user = users.find((item) => Number(item.id) === id);
      if (!user) {
        notFound(res);
        return;
      }
      json(res, 200, user);
      return;
    }
    if (req.method === 'PUT') return userHandlers.update(req, res, id);
    if (req.method === 'DELETE') return userHandlers.remove(res, id);
  }

  notFound(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-api] running on http://127.0.0.1:${PORT}`);
});

server.on('upgrade', (req: http.IncomingMessage, socket: Socket) => {
  if (!req.url || !req.url.startsWith('/ws')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const keyHeader = req.headers['sec-websocket-key'];
  const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
  if (!key) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  const accept = getWebSocketAccept(key);
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ].join('\r\n')
  );

  socket.setKeepAlive(true, 30000);
  wsClients.add(socket);

  let pending = Buffer.alloc(0);

  socket.on('data', (chunk: Buffer) => {
    pending = Buffer.concat([pending, chunk]);
    const { frames, consumed } = decodeClientTextFrames(pending);
    if (consumed > 0) {
      pending = pending.subarray(consumed);
    }

    for (const frame of frames) {
      if (frame.opcode === 0x1) {
        maybeHandleStomp(socket, frame.payload.toString('utf8'));
      } else if (frame.opcode === 0x8) {
        socket.end();
      }
    }
  });
  socket.on('end', () => cleanupSocket(socket));
  socket.on('close', () => cleanupSocket(socket));
  socket.on('error', () => cleanupSocket(socket));
});
