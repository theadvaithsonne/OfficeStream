'use client';
import { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';

export function useRecording(roomName: string | undefined) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const { socket } = useSocket();
  const egressIdRef = useRef<string | null>(null);

  const start = useCallback(async () => {
    if (!roomName) {
      setError('Room name not available');
      return;
    }
    setError('');
    try {
      const { data } = await api.post('/api/recording/start', { roomName });
      egressIdRef.current = data.egressId;
      setRecording(true);
      socket?.emit('recording:started', { roomName });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to start recording';
      // If already recording, treat as success
      if (e?.response?.status === 409) {
        egressIdRef.current = e.response.data.egressId;
        setRecording(true);
        return;
      }
      setError(msg);
      setRecording(false);
    }
  }, [roomName, socket]);

  const stop = useCallback(async () => {
    if (!recording || !egressIdRef.current) return;
    try {
      await api.post('/api/recording/stop', { egressId: egressIdRef.current });
      setRecording(false);
      socket?.emit('recording:stopped', { roomName });
      egressIdRef.current = null;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to stop recording';
      setError(msg);
      // Still mark as stopped on client side so user isn't stuck
      setRecording(false);
      egressIdRef.current = null;
    }
  }, [recording, roomName, socket]);

  return { recording, start, stop, error };
}
