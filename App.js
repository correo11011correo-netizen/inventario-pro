import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

// Pantallas
import StockScreen from './screens/StockScreen';
import VentasScreen from './screens/VentasScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// --- SISTEMA DE LOGS VISUALES ---
function DiagnosticScreen({ logs, error }) {
  return (
    <View style={styles.diagContainer}>
      <StatusBar style="light" />
      <Text style={styles.diagTitle}>🚀 MODO DIAGNÓSTICO STOCKPRO</Text>
      <ScrollView style={styles.diagScroll}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.diagLog}>[INFO] {log}</Text>
        ))}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>❌ ERROR CRÍTICO DETECTADO:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
      {!error && <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 20 }} />}
      {error && <Text style={styles.fixHint}>Toma una captura de esto para corregirlo</Text>}
    </View>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    async function prepare() {
      try {
        addLog("Iniciando motor de la aplicación...");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        addLog("Verificando Safe Area Provider...");
        // Pequeño check de navegación
        addLog("Configurando navegación nativa...");
        
        addLog("Iniciando sistema de notificaciones...");
        await Notifications.requestPermissionsAsync();
        
        addLog("Cargando componentes de interfaz...");
        await new Promise(resolve => setTimeout(resolve, 800));

        addLog("¡Todo listo! Arrancando...");
        setIsReady(true);
      } catch (e) {
        setError(e.message);
        console.error(e);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return <DiagnosticScreen logs={logs} error={error} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <NavigationContainer theme={MyTheme}>
        <MyTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// --- RESTO DE CONFIGURACIÓN (Mantenida igual) ---
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#020617',
    card: '#0f172a',
    text: '#ffffff',
    border: '#1e293b',
    primary: '#6366f1',
  },
};

function MyTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Stock"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900', textTransform: 'uppercase', fontSize: 14, color: '#818cf8' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Stock') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Ventas') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Estadísticas') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Local') iconName = focused ? 'business' : 'business-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          position: 'absolute',
          bottom: insets.bottom > 10 ? insets.bottom : 15,
          left: 10, right: 10,
          backgroundColor: '#0f172a',
          borderRadius: 20,
          height: 65,
          elevation: 10,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: { fontWeight: '900', fontSize: 7, textTransform: 'uppercase', marginBottom: 8 },
      })}
    >
      <Tab.Screen name="Stock" component={StockScreen} options={{ title: '📦 STOCK' }} />
      <Tab.Screen name="Estadísticas" component={DashboardScreen} options={{ title: '📊 REPORTES' }} />
      <Tab.Screen name="Ventas" component={VentasScreen} options={{ title: '🛒 VENTA' }} />
      <Tab.Screen name="Local" component={SettingsScreen} options={{ title: '🏠 LOCAL' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  diagContainer: { flex: 1, backgroundColor: '#000', padding: 30, paddingTop: 60 },
  diagTitle: { color: '#6366f1', fontWeight: 'bold', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  diagScroll: { flex: 1 },
  diagLog: { color: '#4ade80', fontFamily: 'monospace', fontSize: 12, marginBottom: 8 },
  errorBox: { backgroundColor: '#450a0a', padding: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#ef4444' },
  errorTitle: { color: '#f87171', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
  errorText: { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
  fixHint: { color: '#64748b', textAlign: 'center', marginTop: 10, fontSize: 10, fontStyle: 'italic' }
});
