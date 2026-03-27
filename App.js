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
const APP_VERSION = "1.3.2";

const LATEST_CHANGELOG = [
  { type: 'fix', text: 'Eliminado sistema de bienvenida para mayor fluidez.' },
  { type: 'fix', text: 'Optimización del motor de arranque (Sin demoras).' },
  { type: 'add', text: 'Iconografía de Carnicería mejorada (🥩).' },
  { type: 'fix', text: 'Sistema de Novedades ahora muestra cambios actuales.' },
  { type: 'support', text: 'Soporte técnico y mejoras garantizadas cada semana.' }
];

// ... (reportarMonitor remains unchanged) ...

const Tab = createBottomTabNavigator();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [registroPendiente, setRegistroPendiente] = useState(false);
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
      setBooting(true);
      
      const perfilStr = await AsyncStorage.getItem('perfil_usuario');
      if (!perfilStr) {
        setRegistroPendiente(true);
        setBooting(false);
        return;
      }

      const user = JSON.parse(perfilStr);
      setNombre(user.nombre);
      setLocal(user.local);

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

      // Salida rápida del modo carga
      setBooting(false);
    } catch (e) {
      addLog(`Aviso: ${e.message}`);
      setBooting(false);
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
  btnConfirm: { flex: 2, backgroundColor: '#10b981', padding: 18, borderRadius: 15, alignItems: 'center' }
});
