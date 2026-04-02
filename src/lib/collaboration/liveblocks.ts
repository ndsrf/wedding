import { Liveblocks } from '@liveblocks/node';

// Server-side Liveblocks client (requires LIVEBLOCKS_SECRET env var)
let _liveblocks: Liveblocks | null = null;

export function getLiveblocks(): Liveblocks {
  if (!_liveblocks) {
    const secret = process.env.LIVEBLOCKS_SECRET;
    if (!secret) {
      throw new Error('LIVEBLOCKS_SECRET environment variable is not set');
    }
    _liveblocks = new Liveblocks({ secret });
  }
  return _liveblocks;
}

/**
 * Create a Liveblocks access token for a specific room.
 * userId must be unique per collaborator (e.g. planner ID or a client share UUID).
 */
export async function createRoomToken(params: {
  roomId: string;
  userId: string;
  userInfo: {
    name: string;
    color?: string;
  };
}) {
  const liveblocks = getLiveblocks();
  const session = liveblocks.prepareSession(params.userId, {
    userInfo: params.userInfo,
  });
  session.allow(params.roomId, session.FULL_ACCESS);
  const { body, status } = await session.authorize();
  return { body, status };
}

/**
 * Generate a stable Liveblocks room ID for a contract.
 */
export function contractRoomId(contractId: string): string {
  return `contract-${contractId}`;
}

/**
 * Generate a stable Liveblocks room ID for a wedding notes block.
 */
export function notesRoomId(weddingId: string): string {
  return `notes-${weddingId}`;
}
