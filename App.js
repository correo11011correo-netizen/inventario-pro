import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, AppState, Platform, Alert, Linking, TouchableOpacity } from 'react-native';
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
const MONITOR_URL = "https://script.google.com/macros/s/AKfycbyi4iuMkqdQ5GrY2ODzkjDYumosOJUhJHzD3fGS_PMW1K9RNv5YXKbIPbMrfaud-qiGyA/exec";
const APP_VERSION = "1.0.3"; // v18
const VERSION_URL = "https://raw.githubusercontent.com/correo11011correo-netizen/inventario-pro/main/version.json";

// --- MOTOR DE LOGS REMOTOS (RESILIENTE) ---
async function reportRemote(event, message, level = "INFO") {
  try {
    let deviceId = await AsyncStorage.getItem('device_uuid');
    if (!deviceId) {
      deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      await AsyncStorage.setItem('device_uuid', deviceId);
    }
    
    // Fetch con timeout para no bloquear la app si el servidor cae
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(MONITOR_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        deviceId, 
        event: `${level}_${event}`, 
        message, 
        version: APP_VERSION,
        model: Constants.deviceName || 'Android Device', 
        os: `${Platform.OS} ${Platform.Version}` 
      })
    }).finally(() => clearTimeout(timeout));
  } catch (e) {
    console.log("Log Offline:", event);
  }
}

// --- GESTOR DE DESCARGAS ACELERADO ---
async function startSmartDownload(url, setProgress, addLog) {
  try {
    addLog("Preparando túnel de descarga...");
    const fileUri = FileSystem.documentDirectory + "StockPro_Update.apk";
    
    const downloadResumable = FileSystem.createDownloadResumable(
      url, fileUri, {}, (p) => {
        const prg = p.totalBytesWritten / p.totalBytesExpectedToWrite;
        setProgress(Math.round(prg * 100));
      }
    );

    addLog("Descargando paquetes de actualización...");
    const { uri } = await downloadResumable.downloadAsync();
    
    addLog("✅ Descarga completa. Verificando...");
    await reportRemote("UPDATE", "Descarga finalizada con éxito", "SUCCESS");
    
    if (Platform.OS === 'android') {
      await Sharing.shareAsync(uri, { 
        mimeType: 'application/vnd.android.package-archive',
        dialogTitle: 'Instalar Actualización'
      });
    }
  } catch (e) {
    addLog("❌ Error en descarga: " + e.message);
    await reportRemote("UPDATE_ERROR", e.message, "CRITICAL");
    Alert.alert("Reintento", "La descarga falló. Revisa tu conexión.");
  }
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [newVersion, setNewVersion] = useState(null);

  const addLog = (m) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${m}`]);

  useEffect(() => {
    const kernelBoot = async () => {
      try {
        addLog("Iniciando Kernel v1.0.3...");
        await reportRemote("BOOT", "Arranque iniciado", "INFO");

        // Paso 1: Base de Datos
        addLog("Verificando persistencia...");
        const inv = await getInventario();
        addLog(`DB conectada: ${inv.length} productos.`);

        // Paso 2: Notificaciones
        addLog("Configurando drivers nativos...");
        await Notifications.requestPermissionsAsync();

        // Paso 3: Chequeo de Nube
        addLog("Sincronizando con satélite...");
        const res = await fetch(VERSION_URL + "?t=" + Date.now());
        const vData = await res.json();
        if (vData.version !== APP_VERSION) {
          setNewVersion(vData);
          addLog(`Nueva versión detectada: v${vData.version}`);
        }

        await new Promise(r => setTimeout(r, 800));
        addLog("Sistema estable. Abriendo interfaz.");
        setBooting(false);
        await reportRemote("BOOT", "Entrada exitosa a la App", "SUCCESS");

      } catch (e) {
        setError(e.message);
        await reportRemote("BOOT_ERROR", e.message, "CRITICAL");
        // Forzamos entrada tras 5 segundos aunque haya error (Inicio Seguro)
        setTimeout(() => setBooting(false), 5000);
      }
    };
    kernelBoot();
  }, []);

  if (booting) {
    return (
      <View style={styles.bootContainer}>
        <StatusBar style="light" />
        <Text style={styles.bootTitle}>🛰️ STOCKPRO CLOUD INFRASTRUCTURE</Text>
        <ScrollView style={styles.bootScroll}>
          {logs.map((l, i) => <Text key={i} style={styles.bootLog}>{l}</Text>)}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>SISTEMA EN MODO EMERGENCIA:</Text>
              <Text style={styles.errorDesc}>{error}</Text>
            </View>
          )}
        </ScrollView>
        {progress > 0 ? (
          <View style={styles.progBox}>
            <Text style={styles.progText}>DESCARGANDO ACTUALIZACIÓN: {progress}%</Text>
            <View style={[styles.progBar, { width: `${progress}%` }]} />
          </View>
        ) : <ActivityIndicator color="#6366f1" size="small" />}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      {newVersion && (
        <TouchableOpacity style={styles.updateBar} onPress={() => {
          setBooting(true);
          startSmartDownload(newVersion.url, setProgress, addLog);
        }}>
          <Text style={styles.updateBarText}>🚀 ACTUALIZACIÓN v{newVersion.version} DISPONIBLE. TOCAR AQUÍ PARA INSTALAR.</Text>
        </TouchableOpacity>
      )}
      <NavigationContainer theme={MyTheme}><MyTabs /></NavigationContainer>
    </SafeAreaProvider>
  );
}

// CONFIGURACIÓN Y PANTALLAS (Mantenidas)
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
  bootContainer: { flex: 1, backgroundColor: '#000', padding: 25, paddingTop: 60 },
  bootTitle: { color: '#6366f1', fontWeight: 'bold', fontSize: 13, marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  bootScroll: { flex: 1 },
  bootLog: { color: '#4ade80', fontFamily: 'monospace', fontSize: 10, marginBottom: 6 },
  errorBox: { backgroundColor: '#450a0a', padding: 15, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  errorDesc: { color: '#fff', fontSize: 10, fontFamily: 'monospace', marginTop: 5 },
  progBox: { marginTop: 20, backgroundColor: '#0f172a', padding: 20, borderRadius: 20, borderTopWidth: 2, borderTopColor: '#6366f1' },
  progText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  progBar: { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
  updateBar: { backgroundColor: '#6366f1', padding: 12, alignItems: 'center' },
  updateBarText: { color: '#fff', fontSize: 9, fontWeight: '900' }
});
