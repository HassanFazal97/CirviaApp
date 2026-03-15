import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useApi } from '../../../src/hooks/useApi';
import { useDeliveryStore } from '../../../src/stores/delivery.store';
import type { Delivery } from '@cirvia/types';

interface StatusUpdateResponse {
  delivery: Delivery;
}

export default function ProofScreen() {
  const router = useRouter();
  const { request } = useApi();
  const queryClient = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const activeDelivery = useDeliveryStore((s) => s.activeDelivery);
  const setActiveDelivery = useDeliveryStore((s) => s.setActiveDelivery);
  const clearDelivery = useDeliveryStore((s) => s.clearDelivery);

  const confirmMutation = useMutation({
    mutationFn: (proofUrl: string) =>
      request<StatusUpdateResponse>(
        `/drivers/deliveries/${activeDelivery!.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'delivered', proof_photo_url: proofUrl }),
        }
      ),
    onSuccess: () => {
      clearDelivery();
      queryClient.invalidateQueries({ queryKey: ['available-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      Alert.alert('Delivery Complete!', 'Proof photo uploaded. Great work!', [
        { text: 'OK', onPress: () => router.replace('/(app)/jobs') },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  async function takePhoto() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
      if (photo) setPhotoUri(photo.uri);
    } catch {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  }

  async function uploadAndConfirm() {
    if (!photoUri || !activeDelivery) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        name: `proof_${activeDelivery.id}.jpg`,
        type: 'image/jpeg',
      } as any);

      const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
      const uploadRes = await fetch(`${API_BASE}/api/v1/uploads/proof`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      const { url } = await uploadRes.json();
      await confirmMutation.mutateAsync(url);
    } catch (err: any) {
      // Fallback: confirm delivery without photo URL if upload endpoint not available
      Alert.alert(
        'Upload Failed',
        'Could not upload photo. Mark delivery as complete without proof?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Anyway',
            onPress: () => confirmMutation.mutate(photoUri),
          },
        ]
      );
    } finally {
      setUploading(false);
    }
  }

  if (!permission) return <View style={styles.center}><ActivityIndicator /></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#9ca3af" />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionSubtitle}>
          We need camera access to capture proof of delivery.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photoUri) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        <View style={styles.previewActions}>
          <Text style={styles.previewHint}>Does this clearly show the delivered items?</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.retakeButton]}
              onPress={() => setPhotoUri(null)}
            >
              <Ionicons name="refresh-outline" size={20} color="#374151" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={uploadAndConfirm}
              disabled={uploading || confirmMutation.isPending}
            >
              {uploading || confirmMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={20} color="#fff" />
                  <Text style={styles.confirmText}>Confirm Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraHint}>Point at the delivered items</Text>
        </View>
      </CameraView>
      <View style={styles.captureBar}>
        <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  cameraHint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captureBar: {
    height: 100,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  preview: { flex: 1 },
  previewActions: {
    backgroundColor: '#fff',
    padding: 20,
    gap: 12,
  },
  previewHint: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
  },
  retakeButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  retakeText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  confirmButton: { backgroundColor: '#10b981' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  permissionSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
