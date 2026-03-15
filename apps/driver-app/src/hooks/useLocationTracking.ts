import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Socket } from 'socket.io-client';

const LOCATION_INTERVAL_MS = 5000; // emit every 5 seconds

export function useLocationTracking(
  socket: Socket | null,
  deliveryId: string | null,
  active: boolean
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !socket || !deliveryId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      intervalRef.current = setInterval(async () => {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          socket.emit('driver:location_update', {
            delivery_id: deliveryId,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        } catch {
          // Location fetch failed — skip this interval
        }
      }, LOCATION_INTERVAL_MS);
    };

    startTracking();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, socket, deliveryId]);
}
