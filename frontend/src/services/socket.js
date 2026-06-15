/**
 * Socket.io Client — Singleton
 * Manages a single persistent WebSocket connection to the backend.
 *
 * Usage:
 *   import { getSocket, connectSocket, disconnectSocket } from './socket';
 *
 *   // In a component
 *   const socket = getSocket();
 *   socket.emit('subscribe:campaign', campaignId);
 *   socket.on('campaign:progress', handler);
 *
 *   // Cleanup on unmount
 *   return () => socket.off('campaign:progress', handler);
 */

import { io } from 'socket.io-client';

let socket = null;

// Backend WS URL — same server as API but via direct connection (not through Vite proxy for WS)
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Get or create the singleton socket instance.
 * Passes the JWT token in the auth handshake.
 */
export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: false, // Connect explicitly via connectSocket()
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return socket;
};

/**
 * Connect the socket (call once after login)
 */
export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
};

/**
 * Disconnect and destroy the socket instance (call on logout)
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected and cleaned up');
  }
};
