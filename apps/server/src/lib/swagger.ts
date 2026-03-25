import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'OfficeStream API',
      version: '1.0.0',
      description: 'Real-time office communication platform API',
    },
    servers: [{ url: 'http://localhost:5000', description: 'Development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            status: { type: 'string', enum: ['online', 'away', 'busy', 'offline'] },
            role: { type: 'string', enum: ['owner', 'admin', 'member'] },
            officeId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Office: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            ownerId: { type: 'string' },
            members: { type: 'array', items: { type: 'string' } },
            inviteCode: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Recording: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            roomName: { type: 'string' },
            officeId: { type: 'string' },
            egressId: { type: 'string' },
            filename: { type: 'string' },
            size: { type: 'number' },
            duration: { type: 'number' },
            recordedBy: { type: 'string' },
            status: { type: 'string', enum: ['recording', 'processing', 'ready', 'failed'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string' },
            message: { type: 'string' },
            read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      // ── Health ──────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, ts: { type: 'number' } } } } } } },
        },
      },

      // ── Auth ────────────────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } } } } },
          responses: { 201: { description: 'User registered' }, 400: { description: 'Validation error' }, 409: { description: 'Email already exists' } },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email and password',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
          responses: { 200: { description: 'Login successful — returns accessToken + user', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token using httpOnly cookie',
          responses: { 200: { description: 'New access token', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' } } } } } }, 401: { description: 'Invalid or expired refresh token' } },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout and clear refresh token cookie',
          responses: { 200: { description: 'Logged out' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current authenticated user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, 401: { description: 'Unauthorized' } },
        },
      },
      '/api/auth/me/status': {
        patch: {
          tags: ['Auth'],
          summary: 'Update user status',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['online', 'away', 'busy', 'offline'] } } } } } },
          responses: { 200: { description: 'Status updated' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/api/auth/google': {
        get: {
          tags: ['Auth'],
          summary: 'Initiate Google OAuth flow',
          responses: { 302: { description: 'Redirects to Google login' } },
        },
      },
      '/api/auth/google/callback': {
        get: {
          tags: ['Auth'],
          summary: 'Google OAuth callback',
          responses: { 302: { description: 'Redirects to frontend with token' } },
        },
      },

      // ── Offices ─────────────────────────────────────────────────────
      '/api/offices': {
        post: {
          tags: ['Offices'],
          summary: 'Create a new office',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } } },
          responses: { 201: { description: 'Office created' }, 401: { description: 'Unauthorized' } },
        },
      },
      '/api/offices/me': {
        get: {
          tags: ['Offices'],
          summary: 'Get current user\'s office',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Office details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Office' } } } }, 404: { description: 'No office found' } },
        },
      },
      '/api/offices/join': {
        post: {
          tags: ['Offices'],
          summary: 'Join an office with invite code',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['inviteCode'], properties: { inviteCode: { type: 'string' } } } } } },
          responses: { 200: { description: 'Joined office' }, 400: { description: 'Invalid invite code' } },
        },
      },
      '/api/offices/{id}/invite': {
        post: {
          tags: ['Offices'],
          summary: 'Generate invite code for office',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Invite code generated', content: { 'application/json': { schema: { type: 'object', properties: { inviteCode: { type: 'string' }, expiresAt: { type: 'string' } } } } } } },
        },
      },
      '/api/offices/{id}/add-member': {
        post: {
          tags: ['Offices'],
          summary: 'Add member to office by email',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } } },
          responses: { 200: { description: 'Member added' }, 404: { description: 'User not found' } },
        },
      },
      '/api/offices/{id}/members/{memberId}/role': {
        patch: {
          tags: ['Offices'],
          summary: 'Update member role',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'memberId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['admin', 'member'] } } } } } },
          responses: { 200: { description: 'Role updated' } },
        },
      },

      // ── Notifications ───────────────────────────────────────────────
      '/api/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List user notifications',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Notification list', content: { 'application/json': { schema: { type: 'object', properties: { notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } } } },
        },
      },
      '/api/notifications/read-all': {
        patch: {
          tags: ['Notifications'],
          summary: 'Mark all notifications as read',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'All marked as read' } },
        },
      },
      '/api/notifications/{id}/read': {
        patch: {
          tags: ['Notifications'],
          summary: 'Mark a notification as read',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Marked as read' } },
        },
      },
      '/api/notifications/{id}': {
        delete: {
          tags: ['Notifications'],
          summary: 'Delete a notification',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },

      // ── Token (LiveKit) ─────────────────────────────────────────────
      '/api/token': {
        get: {
          tags: ['Token'],
          summary: 'Get LiveKit token for authenticated user',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'roomName', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'LiveKit JWT token', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' } } } } } } },
        },
      },
      '/api/token/guest': {
        post: {
          tags: ['Token'],
          summary: 'Get guest LiveKit token',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['roomName', 'participantName'], properties: { roomName: { type: 'string' }, participantName: { type: 'string' } } } } } },
          responses: { 200: { description: 'Guest LiveKit token' } },
        },
      },

      // ── Messages ────────────────────────────────────────────────────
      '/api/messages/unread': {
        get: {
          tags: ['Messages'],
          summary: 'Get unread message counts',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Unread counts per user' } },
        },
      },
      '/api/messages/{userId}': {
        get: {
          tags: ['Messages'],
          summary: 'Get conversation with a user',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Message list', content: { 'application/json': { schema: { type: 'object', properties: { messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } } } } },
        },
      },

      // ── Recording ───────────────────────────────────────────────────
      '/api/recording/start': {
        post: {
          tags: ['Recording'],
          summary: 'Start server-side recording (LiveKit Egress)',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['roomName'], properties: { roomName: { type: 'string' } } } } } },
          responses: { 200: { description: 'Recording started', content: { 'application/json': { schema: { type: 'object', properties: { recordingId: { type: 'string' }, egressId: { type: 'string' } } } } } }, 409: { description: 'Recording already in progress' } },
        },
      },
      '/api/recording/stop': {
        post: {
          tags: ['Recording'],
          summary: 'Stop an active recording',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['egressId'], properties: { egressId: { type: 'string' } } } } } },
          responses: { 200: { description: 'Recording stopped', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recording' } } } } },
        },
      },
      '/api/recording/upload': {
        post: {
          tags: ['Recording'],
          summary: 'Upload a recording file (browser fallback)',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file', 'roomName'], properties: { file: { type: 'string', format: 'binary' }, roomName: { type: 'string' }, duration: { type: 'string' } } } } } },
          responses: { 200: { description: 'Recording uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recording' } } } } },
        },
      },
      '/api/recording/status/{egressId}': {
        get: {
          tags: ['Recording'],
          summary: 'Get recording status by egress ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'egressId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Recording status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recording' } } } } },
        },
      },
      '/api/recording/list/{officeId}': {
        get: {
          tags: ['Recording'],
          summary: 'List all recordings for an office',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'officeId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Recording list', content: { 'application/json': { schema: { type: 'object', properties: { recordings: { type: 'array', items: { $ref: '#/components/schemas/Recording' } } } } } } } },
        },
      },
      '/api/recording/{id}/download': {
        get: {
          tags: ['Recording'],
          summary: 'Download a recording file',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'MP4 file download', content: { 'video/mp4': { schema: { type: 'string', format: 'binary' } } } }, 202: { description: 'Still processing' }, 404: { description: 'Not found' } },
        },
      },
      '/api/recording/{id}': {
        delete: {
          tags: ['Recording'],
          summary: 'Delete a recording',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
