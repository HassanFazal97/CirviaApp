import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {user.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{user.full_name}</Text>
      <Text style={styles.email}>{user.email}</Text>
      {user.phone && <Text style={styles.phone}>{user.phone}</Text>}

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Role</Text>
          <Text style={styles.rowValue}>{user.role}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', padding: 24 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 4 },
  email: { fontSize: 15, color: '#6B7280', marginBottom: 2 },
  phone: { fontSize: 15, color: '#6B7280' },
  section: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 32,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 15, color: '#6B7280', textTransform: 'capitalize' },
  logoutBtn: {
    marginTop: 32,
    width: '100%',
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
});
