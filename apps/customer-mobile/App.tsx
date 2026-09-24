import { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { api, tokens } from './src/api';

const Tab = createBottomTabNavigator();

function ListScreen({ title }: { title: string }) {
  const [rows, setRows] = useState<string[]>(['TODO: polish ' + title + ' from MAIN*-expo']);
  useEffect(() => {
    if (title === 'Home' || title === 'Explore') {
      api.projects.list().then((ps) => setRows(ps.map((p) => p.name))).catch(() => undefined);
    } else if (title === 'Leads') {
      api.leads.list().then((xs) => setRows(xs.map((l) => l.name + ' · ' + l.stage))).catch(() => undefined);
    } else if (title === 'Visits') {
      api.visits.list().then((xs) => setRows(xs.map((v) => v.scheduledAt + ' · ' + v.status))).catch(() => undefined);
    } else if (title === 'Payments') {
      api.payments.list().then((xs) => setRows(xs.map((p) => String(p.amountPaise)))).catch(() => undefined);
    }
  }, [title]);
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{title}</Text>
      <FlatList data={rows} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <Text style={{ paddingVertical: 8 }}>{item}</Text>} />
    </SafeAreaView>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('customer@bhairava.demo');
  const [password, setPassword] = useState('Demo@12345');
  const [err, setErr] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Bhairava Customer</Text>
      <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
      <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
      {err ? <Text style={{ color: '#b91c1c' }}>{err}</Text> : null}
      <Button
        title="Sign in"
        onPress={async () => {
          try {
            const s = await api.auth.login(email, password);
            await tokens.setTokens(s.accessToken, s.refreshToken ?? null);
            onDone();
          } catch (e: any) {
            setErr(e.message || 'Login failed');
          }
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    tokens.getAccessToken().then((t) => setAuthed(!!t));
  }, []);
  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator>
        <Tab.Screen name="Home" children={() => <ListScreen title="Home" />} />
        <Tab.Screen name="Explore" children={() => <ListScreen title="Explore" />} />
        <Tab.Screen name="My Property" children={() => <ListScreen title="My Property" />} />
        <Tab.Screen name="Payments" children={() => <ListScreen title="Payments" />} />
        <Tab.Screen name="Profile" children={() => <ListScreen title="Profile" />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
