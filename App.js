import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, AppState, Platform, Alert, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { getInventario, getUsuarioActivo, getCajaEstado } from './utils/storage';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const Tab = createBottomTabNavigator();
const LOG_SERVER_URL = "https://script.google.com/macros/s/AKfycbyi4iuMkqdQ5GrY2ODzkjDYumosOJUhJHzD3fGS_PMW1K9RNv5YXKbIPbMrfaud-qiGyA/exec";
const APP_VERSION = "1.0.0"; 
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/correo11011correo-netizen/inventario-pro/main/version.json";

// --- FUNCIÓN DE ACTUALIZACIÓN ---
async function checkUpdates(addLog) {
  try {
    addLog("Buscando actualizaciones en la nube...");
    const response = await fetch(VERSION_CHECK_URL + "?cache=" + Date.now());
    const data = await response.json();

    if (data.version !== APP_VERSION) {
      addLog(`¡Nueva versión ${data.version} detectada!`);
      Alert.alert(
        "🚀 Actualización Disponible",
        `Hay una nueva versión (${data.version}) lista para descargar.\n\nCambios: ${data.notes}`,
        [
          { text: "Más tarde", style: "cancel" },
          { text: "ACTUALIZAR AHORA", onPress: () => descargarEInstalar(data.url, addLog) }
        ]
      );
    } else {
      addLog("App actualizada a la última versión.");
    }
  } catch (e) {
    addLog("No se pudo verificar actualizaciones.");
  }
}

async function descargarEInstalar(url, addLog) {
  try {
    addLog("Descargando actualización...");
    const fileUri = FileSystem.documentDirectory + "StockPro-Update.apk";
    const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
    const { uri } = await downloadResumable.downloadAsync();
    
    addLog("Descarga completa. Lanzando instalador...");
    if (Platform.OS === 'android') {
      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.android.package-archive', dialogTitle: 'Actualizar StockPro' });
    } else {
      Linking.openURL(url);
    }
  } catch (e) {
    Alert.alert("Error de descarga", "No se pudo bajar el archivo. Revisa tu conexión.");
  }
}

// --- FUNCIÓN DE MONITOREO REMOTO ---
async function enviarLogRemoto(tipo, detalle) {
  try {
    let deviceId = await AsyncStorage.getItem('device_uuid');
    if (!deviceId) {
      deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      await AsyncStorage.setItem('device_uuid', deviceId);
    }
    const role = await getUsuarioActivo();
    await fetch(LOG_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, event: tipo, message: detalle, model: Constants.deviceName || 'Android', os: `${Platform.OS} ${Platform.Version}` })
    });
  } catch (e) {}
}

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
    </View>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const appState = useRef(AppState.currentState);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    enviarLogRemoto('INICIO', 'App abierta');
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/active/) && next.match(/inactive|background/)) enviarLogRemoto('CIERRE', 'App en 2do plano');
      appState.current = next;
    });

    async function prepare() {
      try {
        addLog("Iniciando Kernel StockPro v15...");
        await new Promise(r => setTimeout(r, 400));
        addLog("Conectando base de datos local...");
        const inv = await getInventario();
        addLog(`DB lista: ${inv.length} productos.`);
        const role = await getUsuarioActivo();
        addLog(`Rol detectado: [${role.toUpperCase()}]`);
        const caja = await getCajaEstado();
        addLog(caja.abierta ? "Caja: ABIERTA" : "Caja: CERRADA");
        await Notifications.requestPermissionsAsync();
        addLog("Servicios de nube verificados.");
        await checkUpdates(addLog);
        addLog("¡Arranque exitoso!");
        await new Promise(r => setTimeout(r, 500));
        setIsReady(true);
      } catch (e) {
        setError(`FALLO EN BOOT: ${e.message}`);
        await enviarLogRemoto("ERROR_CRITICO", e.message);
      }
    }
    prepare();
    return () => sub.remove();
  }, []);

  if (!isReady) return <DiagnosticScreen logs={logs} error={error} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <NavigationContainer theme={MyTheme}>
        <MyTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const MyTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#020617', card: '#0f172a', text: '#ffffff', border: '#1e293b', primary: '#6366f1' } };

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
        tabBarStyle: { position: 'absolute', bottom: insets.bottom > 10 ? insets.bottom : 15, left: 10, right: 10, backgroundColor: '#0f172a', borderRadius: 20, height: 65, elevation: 10, borderTopWidth: 0 },
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
  diagLog: { color: '#4ade80', fontFamily: 'monospace', fontSize: 11, marginBottom: 8 },
  errorBox: { backgroundColor: '#450a0a', padding: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#ef4444' },
  errorTitle: { color: '#f87171', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
  errorText: { color: '#fff', fontSize: 12, fontFamily: 'monospace' }
});
