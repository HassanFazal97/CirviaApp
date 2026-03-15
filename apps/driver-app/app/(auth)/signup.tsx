import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthResponse, VehicleType } from '@cirvia/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const VEHICLE_TYPES: VehicleType[] = ['bicycle', 'motorcycle', 'car', 'van', 'truck'];

export default function SignupScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!fullName.trim() || !email.trim() || !password || !vehiclePlate.trim() || !licenseNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Register user account
      const registerRes = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: 'driver',
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        throw new Error(registerData.message ?? 'Registration failed');
      }

      const { user, tokens } = registerData as AuthResponse;

      // Step 2: Create driver profile
      const driverRes = await fetch(`${API_BASE}/api/v1/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify({
          vehicle_type: vehicleType,
          vehicle_plate: vehiclePlate.trim().toUpperCase(),
          license_number: licenseNumber.trim(),
        }),
      });

      const driverData = await driverRes.json();
      if (!driverRes.ok) {
        throw new Error(driverData.message ?? 'Failed to create driver profile');
      }

      await setAuth(user, tokens);
      router.replace('/(app)/jobs');
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Personal Info</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Smith"
            autoComplete="name"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
            placeholderTextColor="#9ca3af"
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Vehicle Info</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.pillRow}>
            {VEHICLE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.pill, vehicleType === type && styles.pillSelected]}
                onPress={() => setVehicleType(type)}
              >
                <Text style={[styles.pillText, vehicleType === type && styles.pillTextSelected]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>License Plate</Text>
          <TextInput
            style={styles.input}
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            placeholder="ABC 1234"
            autoCapitalize="characters"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Driver's License Number</Text>
          <TextInput
            style={styles.input}
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            placeholder="DL12345678"
            autoCapitalize="characters"
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  pillSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  pillText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
