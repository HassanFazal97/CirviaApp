import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
}

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setState({ lat: null, lng: null, loading: false, error: 'Location permission denied' });
        }
        return;
      }

      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, loading: false, error: null });
        }
      } catch {
        if (!cancelled) {
          setState({ lat: null, lng: null, loading: false, error: 'Unable to get location' });
        }
      }
    }

    fetchLocation();
    return () => { cancelled = true; };
  }, []);

  return state;
}
