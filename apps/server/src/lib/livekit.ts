import { AccessToken, RoomServiceClient, EgressClient } from 'livekit-server-sdk';

/** Room name for a single office conference room. */
export function officeRoomName(officeId: string): string {
  return `office-room-${officeId}`;
}

/** Room name for a P2P call. */
export function p2pRoomName(callId: string): string {
  return `call-${callId}`;
}

export interface TokenOptions {
  roomName: string;
  participantName: string;
  canPublish?: boolean;
  canPublishData?: boolean;
}

/** Generates a signed LiveKit JWT for a room participant. toJwt() is async in SDK v2. */
export async function generateLiveKitToken(opts: TokenOptions): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('LiveKit API credentials not configured');

  const token = new AccessToken(apiKey, apiSecret, {
    identity: opts.participantName,
    ttl: '4h',
  });

  token.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: opts.canPublish ?? true,
    canSubscribe: true,
    canPublishData: opts.canPublishData ?? true,
  });

  return token.toJwt();
}

/** RoomServiceClient for server-side room management. */
export function getRoomServiceClient(): RoomServiceClient {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) throw new Error('LiveKit credentials not configured');
  return new RoomServiceClient(url, apiKey, apiSecret);
}

/** Convert ws(s):// LiveKit URL to http(s):// for REST API clients. */
function toHttpUrl(url: string): string {
  return url.replace(/^ws(s?):\/\//, 'http$1://');
}

/** EgressClient for recording and live streaming. */
export function getEgressClient(): EgressClient {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new Error('LiveKit credentials not configured');
  }
  const httpUrl = toHttpUrl(url);
  return new EgressClient(httpUrl, apiKey, apiSecret);
}
