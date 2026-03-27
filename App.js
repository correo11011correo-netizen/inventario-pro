import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Platform, Alert, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';

// --- CONFIGURACIÓN GLOBAL ---
global.DEBUG_LOGS = [];
const MONITOR_URL = "https://script.google.com/macros/s/AKfycbweUlhXJzUqqmcehuAkTs1MTJV4JVaYs3Y-UrMD6urtCdjP4SsyefgZAZo0AVFK6YU/exec";
const NEW_MONITOR_URL = "https://script.google.com/macros/s/AKfycbyi4iuMkqdQ5GrY2ODzkjDYumosOJUhJHzD3fGS_PMW1K9RNv5YXKbIPbMrfaud-qiGyA/exec";
const APP_VERSION = "1.3.0";

const LATEST_CHANGELOG = [
  { type: 'add', text: 'Pantalla de Bienvenida con guía de funciones.' },
  { type: 'add', text: 'Iconografía de Carnicería mejorada (🥩).' },
  { type: 'fix', text: 'Sistema de Novedades ahora muestra cambios actuales.' },
  { type: 'fix', text: 'Optimización de carga y respuesta de servidores.' },
  { type: 'support', text: 'Soporte técnico y mejoras garantizadas cada semana.' }
];

// --- MOTOR DE TELEMETRÍA (REFORZADO) ---
export const reportarMonitor = async (event, message, level = "INFO") => {
  const logStr = `[${new Date().toLocaleTimeString()}] ${level}: ${event} - ${message}`;
  global.DEBUG_LOGS = [logStr, ...global.DEBUG_LOGS].slice(0, 50);

  try {
    // 1. Asegurar ID de Dispositivo
    let deviceId = await AsyncStorage.getItem('device_uuid');
    if (!deviceId) {
      deviceId = 'ID-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      await AsyncStorage.setItem('device_uuid', deviceId);
    }
    
    // 2. Obtener Perfil
    const perfilRaw = await AsyncStorage.getItem('perfil_usuario');
    const user = perfilRaw ? JSON.parse(perfilRaw) : { nombre: 'Desconocido', local: 'Sin Local' };

    // 3. Obtener IP (Rápido)
    let ip = "0.0.0.0";
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
      const ipData = await ipRes.json();
      ip = ipData.ip;
    } catch(e) {}

    // 4. Envío de datos (Cuerpo exacto para AppsScript.gs)
    const payload = {
      deviceId: deviceId,
      event: `${level}_${event}`,
      message: message,
      version: APP_VERSION,
      usuario: `${user.nombre} (${user.local})`,
      model: Device.modelName || 'Dispositivo Nativo',
      os: `${Platform.OS} ${Platform.Version}`,
      ip: ip
    };

    const payloadNew = {
      ...payload,
      timestamp: new Date().toISOString(),
      nombreUsuario: user.nombre,
      nombreLocal: user.local,
      appVersion: APP_VERSION,
      brand: Device.brand || 'Desconocida',
      manufacturer: Device.manufacturer || 'Desconocido',
      isDevice: Device.isDevice,
      osName: Device.osName,
      osVersion: Device.osVersion,
      developerContact: "delpianoadrian@gmail.com"
    };

    // Envío a URL original
    fetch(MONITOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // Envío a URL nueva (con más datos y formato texto para evitar preflight CORS)
    fetch(NEW_MONITOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payloadNew)
    }).catch(() => {});

  } catch (e) {
    console.log("Error de telemetría:", e);
  }
};

const Tab = createBottomTabNavigator();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [registroPendiente, setRegistroPendiente] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [nombre, setNombre] = useState('');
  const [local, setLocal] = useState('');
  const [logsUI, setLogsUI] = useState([]);
  const [hayUpdate, setHayUpdate] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const addLog = (m) => {
    setLogsUI(prev => [...prev, `> ${m}`]);
    reportarMonitor("SISTEMA", m);
  };

  const kernelBoot = async (isManual = false) => {
    try {
      const perfil = await AsyncStorage.getItem('perfil_usuario');
      if (!perfil) {
        setRegistroPendiente(true);
        setBooting(false);
        return;
      }

      // Chequear si ya vio la bienvenida
      const yaVioBienvenida = await AsyncStorage.getItem('welcome_seen');
      if (!yaVioBienvenida) {
        setShowWelcome(true);
      }

      setBooting(true);
      addLog(`Motor v${APP_VERSION} Iniciado`);

      if (!__DEV__ && Updates.isEnabled) {
        addLog("Sincronizando con satélite...");
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          addLog("Actualización crítica detectada");
          setHayUpdate(true);
        } else {
          addLog("Nodos en línea. Sin cambios.");
          if (isManual) Alert.alert("Sistema al Día", "No hay actualizaciones pendientes.");
        }
      }

      setTimeout(() => setBooting(false), 1500);
    } catch (e) {
      addLog(`Aviso: ${e.message}`);
      setTimeout(() => setBooting(false), 2000);
    }
  };

  const descargarUpdate = async () => {
    setDescargando(true);
    try {
      await Updates.fetchUpdateAsync();
      await reportarMonitor("OTA_SUCCESS", "App actualizada exitosamente");
      Alert.alert("Éxito", "Actualización instalada. Reiniciando...", [
        { text: "OK", onPress: () => Updates.reloadAsync() }
      ]);
    } catch (e) {
      setDescargando(false);
      await reportarMonitor("OTA_ERROR", e.message, "ERROR");
      Alert.alert("Error", e.message);
    }
  };

  useEffect(() => {
    kernelBoot();
    const sub = DeviceEventEmitter.addListener('checkUpdateManual', () => kernelBoot(true));
    return () => sub.remove();
  }, []);

  if (registroPendiente) {
    return (
      <View style={styles.registroContainer}>
        <StatusBar style="light" />
        <Ionicons name="shield-checkmark" size={80} color="#6366f1" />
        <Text style={styles.registroTitulo}>Acceso al Sistema</Text>
        <Text style={{color:'#64748b', marginBottom:30, textAlign:'center'}}>Ingresa tus datos para habilitar la telemetría.</Text>
        <TextInput style={styles.registroInput} placeholder="Tu Nombre" placeholderTextColor="#475569" value={nombre} onChangeText={setNombre} />
        <TextInput style={styles.registroInput} placeholder="Nombre del Local" placeholderTextColor="#475569" value={local} onChangeText={setLocal} />
        <TouchableOpacity style={styles.btnRegistro} onPress={async () => {
          if(!nombre || !local) return Alert.alert("Error", "Completa los campos");
          await AsyncStorage.setItem('perfil_usuario', JSON.stringify({ nombre, local }));
          setRegistroPendiente(false);
          kernelBoot();
        }}>
          <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>REGISTRAR Y ENTRAR</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showWelcome) {
    return (
      <View style={styles.welcomeContainer}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={{padding: 30, paddingTop: 60}}>
          <Ionicons name="rocket" size={60} color="#6366f1" style={{alignSelf:'center', marginBottom: 20}} />
          <Text style={styles.welcomeTitle}>Bienvenido a StockPro</Text>
          <Text style={styles.welcomeSub}>Tu negocio, ahora más inteligente.</Text>

          <View style={styles.featureItem}>
            <Ionicons name="time-outline" size={24} color="#10b981" />
            <View style={{flex:1}}>
              <Text style={styles.featureTitle}>Soporte Continuo</Text>
              <Text style={styles.featureDesc}>Mejoras y actualizaciones garantizadas cada semana.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="swap-horizontal-outline" size={24} color="#6366f1" />
            <View style={{flex:1}}>
              <Text style={styles.featureTitle}>Cobro Inteligente</Text>
              <Text style={styles.featureDesc}>Rotación de Alias por límites de monto para transferencias.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="barcode-outline" size={24} color="#f59e0b" />
            <View style={{flex:1}}>
              <Text style={styles.featureTitle}>Escáner y Catálogo</Text>
              <Text style={styles.featureDesc}>Carga rápida con escáner y catálogo argentino integrado.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="people-outline" size={24} color="#8b5cf6" />
            <View style={{flex:1}}>
              <Text style={styles.featureTitle}>Gestión de Turnos</Text>
              <Text style={styles.featureDesc}>Control de inicio y cierre de caja para empleados y dueños.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnWelcome} onPress={async () => {
            await AsyncStorage.setItem('welcome_seen', 'true');
            setShowWelcome(false);
          }}>
            <Text style={{color:'#fff', fontWeight:'900', fontSize:16}}>¡EMPEZAR AHORA!</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (booting) {
    return (
      <View style={styles.bootContainer}>
        <StatusBar style="light" />
        <Text style={styles.bootTitle}>🛰️ STOCKPRO CLOUD INFRASTRUCTURE</Text>
        <ScrollView style={{flex:1}}>{logsUI.map((l, i) => <Text key={i} style={styles.bootLog}>{l}</Text>)}</ScrollView>
        <ActivityIndicator color="#6366f1" size="small" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Modal visible={hayUpdate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.updateCard}>
            <Ionicons name="sparkles" size={40} color="#6366f1" />
            <Text style={styles.updateTitle}>¡Nueva Versión v{APP_VERSION}!</Text>
            
            <View style={{backgroundColor: '#1e293b', padding: 15, borderRadius: 15, width: '100%', marginBottom: 20}}>
              <Text style={{color: '#fff', fontWeight: 'bold', marginBottom: 12, fontSize: 13}}>📦 Novedades de esta actualización:</Text>
              {LATEST_CHANGELOG.map((item, idx) => (
                <View key={idx} style={{flexDirection:'row', marginBottom: 8, alignItems:'center', gap: 8}}>
                  <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: item.type === 'add' ? '#10b981' : (item.type === 'fix' ? '#f59e0b' : (item.type === 'remove' ? '#ef4444' : '#6366f1'))}} />
                  <Text style={{color: '#cbd5e1', fontSize: 12, flex: 1}}>{item.text}</Text>
                </View>
              ))}
            </View>

            <Text style={{color:'#94a3b8', textAlign:'center', marginBottom:20, fontSize: 13}}>¿Deseas aplicar estos cambios ahora y reiniciar la app?</Text>
            {!descargando ? (
              <View style={{flexDirection:'row', gap:10, width:'100%'}}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setHayUpdate(false)}><Text style={{color:'#64748b', fontWeight:'bold'}}>LUEGO</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnConfirm} onPress={descargarUpdate}><Text style={{color:'#fff', fontWeight:'bold'}}>ACTUALIZAR</Text></TouchableOpacity>
              </View>
            ) : (
              <View style={{alignItems:'center'}}>
                <ActivityIndicator color="#6366f1" />
                <Text style={{color:'#6366f1', marginTop:10, fontSize:12, fontWeight:'bold'}}>INSTALANDO CÓDIGO...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <NavigationContainer theme={MyTheme}><MyTabs /></NavigationContainer>
    </SafeAreaProvider>
  );
}

const MyTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#020617', card: '#0f172a', text: '#ffffff', border: '#1e293b', primary: '#6366f1' } };
import StockScreen from './screens/StockScreen';
import VentasScreen from './screens/VentasScreen';
import DashboardScreen from './screens/DashboardScreen';
import SettingsScreen from './screens/SettingsScreen';

function MyTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900', textTransform: 'uppercase', fontSize: 11, color: '#818cf8' },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { position: 'absolute', bottom: insets.bottom > 10 ? insets.bottom : 15, left: 10, right: 10, backgroundColor: '#0f172a', borderRadius: 20, height: 60, elevation: 10, borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: '900', fontSize: 9, textTransform: 'uppercase', marginBottom: 8 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = route.name === 'Stock' ? (focused?'cube':'cube-outline') : (route.name === 'Ventas' ? (focused?'cart':'cart-outline') : (route.name === 'Estadísticas' ? (focused?'stats-chart':'stats-chart-outline') : (focused?'settings':'settings-outline')));
          return <Ionicons name={iconName} size={size + 4} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Stock" component={StockScreen} options={{ title: '📦 STOCK' }} />
      <Tab.Screen name="Estadísticas" component={DashboardScreen} options={{ title: '📊 REPORTES' }} />
      <Tab.Screen name="Ventas" component={VentasScreen} options={{ title: '🛒 VENTA' }} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} options={{ title: '⚙️ AJUSTES' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  registroContainer: { flex: 1, backgroundColor: '#020617', padding: 40, justifyContent: 'center', alignItems: 'center' },
  registroTitulo: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10, marginTop: 20 },
  registroInput: { width: '100%', backgroundColor: '#0f172a', padding: 18, borderRadius: 15, color: '#fff', marginBottom: 15, borderWidth: 1, borderColor: '#1e293b', fontSize: 16 },
  btnRegistro: { width: '100%', backgroundColor: '#6366f1', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 5 },
  bootContainer: { flex: 1, backgroundColor: '#000', padding: 30, paddingTop: 60 },
  bootTitle: { color: '#6366f1', fontWeight: 'bold', fontSize: 14, marginBottom: 25, textAlign: 'center' },
  bootLog: { color: '#4ade80', fontSize: 10, fontFamily: 'monospace', marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 25 },
  updateCard: { backgroundColor: '#0f172a', padding: 30, borderRadius: 25, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  updateTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginVertical: 15 },
  btnCancel: { flex: 1, padding: 18, alignItems: 'center' },
  btnConfirm: { flex: 2, backgroundColor: '#10b981', padding: 18, borderRadius: 15, alignItems: 'center' },
  welcomeContainer: { flex: 1, backgroundColor: '#020617' },
  welcomeTitle: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  welcomeSub: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 40 },
  featureItem: { flexDirection: 'row', gap: 15, marginBottom: 25, backgroundColor: '#0f172a', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  featureTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  featureDesc: { color: '#94a3b8', fontSize: 12 },
  btnWelcome: { backgroundColor: '#6366f1', padding: 22, borderRadius: 20, alignItems: 'center', marginTop: 20, elevation: 10 }
});
