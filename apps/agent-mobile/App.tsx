import { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, TextInput, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { api, tokens } from './src/api';

const Tab = createBottomTabNavigator();

function useLiveList(loader: () => Promise<string[]>) {
  const [rows, setRows] = useState<string[]>(['Loading...']);
  const [err, setErr] = useState('');
  useEffect(() => {
    loader()
      .then((xs) => setRows(xs.length ? xs : ['No rows']))
      .catch((e) => { setErr(String(e?.message || e)); setRows([]); });
  }, []);
  return { rows, err };
}

function ListScreen({ title, loader }: { title: string; loader: () => Promise<string[]> }) {
  const { rows, err } = useLiveList(loader);
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{title}</Text>
      {err ? <Text style={{ color: '#b91c1c' }}>{err}</Text> : null}
      <FlatList data={rows} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <Text style={{ paddingVertical: 8 }}>{item}</Text>} />
    </SafeAreaView>
  );
}

function MoreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>More</Text>
      <Text style={{ marginTop: 8, color: '#64748b' }}>SecureStore auth · live API ownership filters. Store signing BLOCKED BY EXTERNAL CREDENTIAL.</Text>
      <View style={{ height: 12 }} />
      <Button title="Sign out" onPress={async () => { try { await api.auth.logout(); } catch {} await tokens.clear(); }} />
    </SafeAreaView>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('agent@bhairava.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [err, setErr] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Bhairava Agent</Text>
      <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
      <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
      {err ? <Text style={{ color: '#b91c1c' }}>{err}</Text> : null}
      <Button title="Sign in" onPress={async () => { try { const s = await api.auth.login(email, password); await tokens.setTokens(s.accessToken, s.refreshToken ?? null); onDone(); } catch (e: any) { setErr(e.message || 'Login failed'); } }} />
    </SafeAreaView>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { tokens.getAccessToken().then((t) => setAuthed(!!t)); }, []);
  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator>
        <Tab.Screen name="Home" children={() => <ListScreen title="Home" loader={async () => { const [l, v, b] = await Promise.all([api.leads.list(), api.visits.list(), (api as any).bookings.list()]); return ['Leads ' + l.length, 'Visits ' + v.length, 'Bookings ' + b.length]; }} />} />
        <Tab.Screen name="Projects" children={() => <ListScreen title="Projects / plots" loader={async () => (await api.projects.list()).map((p: any) => p.name + ' · ' + (p.lifecycleStatus || ''))} />} />
        <Tab.Screen name="Leads" children={() => <ListScreen title="Leads" loader={async () => (await api.leads.list()).map((l: any) => l.name + ' · ' + l.stage)} />} />
        <Tab.Screen name="CRM" children={() => <ListScreen title="Customers / visits" loader={async () => { const [c, v] = await Promise.all([api.customers.list(), api.visits.list()]); return [...c.map((x: any) => 'Customer ' + x.name), ...v.map((x: any) => 'Visit ' + x.status)]; }} />} />
        <Tab.Screen name="Sales" children={() => <ListScreen title="Sales ops" loader={async () => { const [r, b, c, d, n] = await Promise.all([(api as any).reservations.list(), (api as any).bookings.list(), (api as any).commissions.list(), api.documents.list(), (api as any).notifications.list()]); return ['Reservations ' + r.length, 'Bookings ' + b.length, 'Commissions ' + c.length, 'Documents ' + d.length, 'Notifications ' + n.length]; }} />} />
        <Tab.Screen name="More" children={() => <MoreScreen />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
