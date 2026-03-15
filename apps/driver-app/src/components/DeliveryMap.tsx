import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface Coords {
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  driverCoords?: Coords | null;
  pickupCoords?: Coords | null;
  dropoffCoords?: Coords | null;
  style?: object;
}

function getRegion(coords: (Coords | null | undefined)[]) {
  const valid = coords.filter(Boolean) as Coords[];
  if (valid.length === 0) return undefined;

  const lats = valid.map((c) => c.lat);
  const lngs = valid.map((c) => c.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const padding = 0.01;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + padding, 0.02),
    longitudeDelta: Math.max(maxLng - minLng + padding, 0.02),
  };
}

export function DeliveryMap({
  driverCoords,
  pickupCoords,
  dropoffCoords,
  style,
}: DeliveryMapProps) {
  const region = getRegion([driverCoords, pickupCoords, dropoffCoords]);

  const routeCoords = [driverCoords, pickupCoords, dropoffCoords]
    .filter(Boolean)
    .map((c) => ({ latitude: c!.lat, longitude: c!.lng }));

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {driverCoords && (
          <Marker
            coordinate={{ latitude: driverCoords.lat, longitude: driverCoords.lng }}
            title="You"
            pinColor="#4f46e5"
          />
        )}
        {pickupCoords && (
          <Marker
            coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
            title="Pickup"
            pinColor="#10b981"
          />
        )}
        {dropoffCoords && (
          <Marker
            coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lng }}
            title="Dropoff"
            pinColor="#ef4444"
          />
        )}
        {routeCoords.length >= 2 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#4f46e5"
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
