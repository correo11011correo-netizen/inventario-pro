import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, AppState, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { getInventario, getUsuarioActivo, getCajaEstado } from './utils/storage';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Pantallas
import StockScreen from './screens/StockScreen';
import VentasScreen from './screens/VentasScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const LOG_SERVER_URL = "https://script.google.com/macros/s/AKfycbyi4iuMkqdQ5GrY2ODzkjDYumosOJUhJHzD3fGS_PMW1K9RNv5YXKbIPbMrfaud-qiGyA/exec";

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
      body: JSON.stringify({
        deviceId: deviceId,
        event: tipo,
        message: detalle,
        model: Constants.deviceName || 'Unknown Device',
        os: `${Platform.OS} ${Platform.Version}`
      })
    });
  } catch (e) {
    console.log("Servidor remoto offline");
  }
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
      {error && <Text style={styles.fixHint}>Toma una captura de esto para corregirlo</Text>}
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
    // 1. REGISTRO AL INICIAR LA APP
    enviarLogRemoto('INICIO', 'Aplicación iniciada/abierta');

    // 2. REGISTRO AL CERRAR O PASAR A SEGUNDO PLANO
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        enviarLogRemoto('CIERRE', 'La aplicación se envió a segundo plano o se cerró');
      }
      appState.current = nextAppState;
    });

    async function prepare() {
      try {
        addLog("Iniciando Kernel de StockPro v13...");
        await new Promise(r => setTimeout(r, 400));
        
        addLog("Verificando persistencia de datos (SQLite/Async)...");
        const inv = await getInventario();
        addLog(`Base de datos conectada: ${inv.length} productos cargados.`);
        
        addLog("Cargando motor de seguridad y roles...");
        const role = await getUsuarioActivo();
        addLog(`Perfil identificado: [${role.toUpperCase()}]`);

        addLog("Sincronizando estado de caja y turnos...");
        const caja = await getCajaEstado();
        addLog(caja.abierta ? "Caja detectada: ABIERTA (Turno en curso)" : "Caja detectada: CERRADA");

        addLog("Inicializando sistema de notificaciones nativas...");
        const { status } = await Notifications.requestPermissionsAsync();
        addLog(`Canal de notificaciones: ${status === 'granted' ? 'ACTIVO' : 'RESTRINGIDO'}`);

        addLog("Precargando librerías gráficas (ChartKit)...");
        await new Promise(r => setTimeout(r, 600));

        addLog("Configurando Safe Area para navegación flotante...");
        addLog("¡Arranque exitoso! Entrando a la interfaz...");
        await new Promise(r => setTimeout(r, 400));

        setIsReady(true);
      } catch (e) {
        const errorMsg = `FALLO EN BOOT: ${e.message}\nStack: ${e.stack?.split('\n')[0]}`;
        setError(errorMsg);
        await enviarLogRemoto("ERROR_CRITICO", errorMsg);
        console.error(e);
      }
    }
    prepare();

    return () => {
      subscription.remove();
    };
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

// --- RESTO DE CONFIGURACIÓN ---
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
          paddingBottom: 0,
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
