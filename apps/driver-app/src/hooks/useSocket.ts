import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Disconnect stale connection if token changed
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, isAuthenticated]);

  return socketRef.current;
}
