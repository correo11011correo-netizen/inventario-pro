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
const APP_VERSION = "1.0.3"; 
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/correo11011correo-netizen/inventario-pro/main/version.json";

// --- MOTOR DE MONITOREO REMOTO "EXPO DEV STYLE" ---
async function report(event, message, level = "INFO") {
  try {
    let deviceId = await AsyncStorage.getItem('device_uuid');
    if (!deviceId) {
      deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      await AsyncStorage.setItem('device_uuid', deviceId);
    }
    
    // Log local para debug
    console.log(`[${level}] ${event}: ${message}`);

    await fetch(LOG_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        deviceId, 
        event: `${level}_${event}`, 
        message: message, 
        version: APP_VERSION,
        model: Constants.deviceName || 'Android', 
        os: `${Platform.OS} ${Platform.Version}` 
      })
    });
  } catch (e) {}
}

// --- GESTOR DE DESCARGAS ACELERADO ---
async function downloadUpdate(url, addLog, setProgress) {
  try {
    await report("UPDATE", "Iniciando descarga acelerada");
    const fileUri = FileSystem.documentDirectory + "StockPro_Update.apk";
    const download = FileSystem.createDownloadResumable(url, fileUri, {}, p => {
      setProgress(Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100));
    });
    const { uri } = await download.downloadAsync();
    await report("UPDATE", "Descarga completada, lanzando instalador");
    await Sharing.shareAsync(uri, { mimeType: 'application/vnd.android.package-archive' });
  } catch (e) {
    await report("ERROR", "Fallo descarga: " + e.message, "CRITICAL");
    Alert.alert("Error", "No se pudo bajar el archivo.");
  }
}

// --- VISTA DE DIAGNÓSTICO PROFESIONAL ---
function DiagnosticScreen({ logs, progress }) {
  return (
    <View style={styles.diagContainer}>
      <StatusBar style="light" />
      <Text style={styles.diagTitle}>📡 STOCKPRO REMOTE CONSOLE v{APP_VERSION}</Text>
      <ScrollView style={styles.diagScroll}>
        {logs.map((l, i) => <Text key={i} style={styles.diagLog}>{l}</Text>)}
        {progress > 0 && (
          <View style={styles.progBox}>
            <Text style={styles.progText}>BAJANDO ACTUALIZACIÓN: {progress}%</Text>
            <View style={[styles.progBar, { width: `${progress}%` }]} />
          </View>
        )}
      </ScrollView>
      <ActivityIndicator color="#6366f1" size="small" />
    </View>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const addLog = (m) => {
    const msg = `[${new Date().toLocaleTimeString()}] ${m}`;
    setLogs(prev => [...prev, msg]);
  };

  useEffect(() => {
    const init = async () => {
      try {
        addLog("Inicializando Kernel...");
        await report("BOOT", "Cargando sistema", "INFO");
        
        const inv = await getInventario();
        addLog(`Base de datos: ${inv.length} registros`);
        
        await Notifications.requestPermissionsAsync();
        addLog("Drivers de comunicación listos");

        await new Promise(r => setTimeout(r, 800));
        setIsReady(true);
        await report("BOOT", "Aplicación abierta correctamente", "SUCCESS");

        // Chequeo diferido de updates
        setTimeout(async () => {
          try {
            const res = await fetch(VERSION_CHECK_URL + "?t=" + Date.now());
            const data = await res.json();
            if (data.version !== APP_VERSION) {
              Alert.alert("🚀 Nueva Versión", data.notes, [
                { text: "Ahora no" },
                { text: "ACTUALIZAR", onPress: () => {
                  setIsReady(false);
                  downloadUpdate(data.url, addLog, setProgress);
                }}
              ]);
            }
          } catch (e) {}
        }, 3000);

      } catch (e) {
        await report("CRASH", e.message, "CRITICAL");
        addLog("ERROR CRÍTICO: " + e.message);
      }
    };
    init();
  }, []);

  if (!isReady) return <DiagnosticScreen logs={logs} progress={progress} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <NavigationContainer theme={MyTheme}><MyTabs /></NavigationContainer>
    </SafeAreaProvider>
  );
}

// CONFIGURACIÓN VISUAL (Mantenida)
const MyTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#020617', card: '#0f172a', text: '#ffffff', border: '#1e293b', primary: '#6366f1' } };
import StockScreen from './screens/StockScreen';
import VentasScreen from './screens/VentasScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';

function MyTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Stock"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900', textTransform: 'uppercase', fontSize: 12, color: '#818cf8' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = route.name === 'Stock' ? (focused?'cube':'cube-outline') : (route.name === 'Ventas' ? (focused?'cart':'cart-outline') : (route.name === 'Estadísticas' ? (focused?'stats-chart':'stats-chart-outline') : (focused?'settings':'settings-outline')));
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { position: 'absolute', bottom: insets.bottom > 10 ? insets.bottom : 15, left: 10, right: 10, backgroundColor: '#0f172a', borderRadius: 20, height: 60, elevation: 10, borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: '900', fontSize: 7, textTransform: 'uppercase', marginBottom: 8 },
      })}
    >
      <Tab.Screen name="Stock" component={StockScreen} options={{ title: '📦 STOCK' }} />
      <Tab.Screen name="Estadísticas" component={DashboardScreen} options={{ title: '📊 REPORTES' }} />
      <Tab.Screen name="Ventas" component={VentasScreen} options={{ title: '🛒 VENTA' }} />
      <Tab.Screen name="Local" component={SettingsScreen} options={{ title: '⚙️ AJUSTES' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  diagContainer: { flex: 1, backgroundColor: '#000', padding: 25, paddingTop: 60 },
  diagTitle: { color: '#6366f1', fontWeight: 'bold', fontSize: 14, marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  diagScroll: { flex: 1 },
  diagLog: { color: '#4ade80', fontFamily: 'monospace', fontSize: 10, marginBottom: 6 },
  progBox: { marginTop: 20, backgroundColor: '#0f172a', padding: 15, borderRadius: 15 },
  progText: { color: '#fff', fontSize: 9, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  progBar: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 }
});
