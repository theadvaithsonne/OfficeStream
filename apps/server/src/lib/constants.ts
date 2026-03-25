/** JWT access token lifetime (short-lived, attached to every API request). */
export const ACCESS_TOKEN_EXPIRY = '15m';

/** JWT refresh token lifetime (long-lived, stored in httpOnly cookie). */
export const REFRESH_TOKEN_EXPIRY = '7d';

/** Maximum number of concurrent refresh token sessions per user. */
export const REFRESH_TOKEN_MAX_SESSIONS = 5;

/** Refresh token cookie path — scoped so the browser only sends it to /api/auth. */
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Invite code TTL in milliseconds (7 days). */
export const INVITE_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Invite code random-string length (nanoid). */
export const INVITE_CODE_LENGTH = 10;

/** Maximum number of notifications returned per list query. */
export const MAX_NOTIFICATIONS = 50;

/** Valid user presence statuses. */
export const USER_STATUSES = ['online', 'away', 'busy', 'offline'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Valid user roles within an office. */
export const USER_ROLES = ['owner', 'admin', 'member'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Valid notification event types. */
export const NOTIFICATION_TYPES = [
  'incoming_knock',
  'invite_received',
  'room_started',
  'recording_ready',
  'member_joined',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Default LiveKit room max-participants for conference rooms. */
export const DEFAULT_MAX_ROOM_PARTICIPANTS = 100;
