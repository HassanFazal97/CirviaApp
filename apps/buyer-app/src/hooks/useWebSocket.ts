import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useWebSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(API_BASE, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  function joinRoom(room: string) {
    socketRef.current?.emit('join', room);
  }

  function leaveRoom(room: string) {
    socketRef.current?.emit('leave', room);
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }

  return { joinRoom, leaveRoom, on };
}
