import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Switch, Linking, DeviceEventEmitter } from 'react-native';
import { getCajaEstado, abrirCaja, cerrarCaja, getUsuarioActivo, setUsuarioActivo, registrarAuditoria, getInventario, getAliases, saveAliases } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen({ navigation }) {
  const [caja, setCaja] = useState({ abierta: false });
  const [monto, setMonto] = useState('');
  const [role, setRole] = useState('empleado');
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [montoCierre, setMontoCierre] = useState('');
  
  // Nuevos ajustes pro
  const [idioma, setIdioma] = useState('Español');
  const [notificaciones, setNotificaciones] = useState(true);

  // Alias Manager
  const [aliases, setAliases] = useState([]);
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasLimit, setNewAliasLimit] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const st = await getCajaEstado();
    const r = await getUsuarioActivo();
    const a = await getAliases();
    setCaja(st);
    setRole(r);
    setAliases(a);
    if (!st.abierta && st.montoCierreReal) setMonto(st.montoCierreReal.toString());
  };

  const handleAddAlias = async () => {
    if (!newAliasName || !newAliasLimit) return Alert.alert("Error", "Completa todos los campos");
    const newAlias = {
      id: Math.random().toString(36).substring(2),
      nombre: newAliasName,
      limite: parseFloat(newAliasLimit) || 0,
      acumulado: 0
    };
    const updated = [...aliases, newAlias];
    await saveAliases(updated);
    setAliases(updated);
    setShowAliasModal(false);
    setNewAliasName('');
    setNewAliasLimit('');
  };

  const handleDeleteAlias = async (id) => {
    const updated = aliases.filter(a => a.id !== id);
    await saveAliases(updated);
    setAliases(updated);
  };

  const exportarCSV = async () => {
    try {
      const inv = await getInventario();
      if (inv.length === 0) return Alert.alert("Error", "No hay productos para exportar.");
      
      let csv = "Codigo,Nombre,Precio,Cantidad,Categoria\n";
      inv.forEach(i => {
        csv += `${i.codigo},${i.nombre},${i.precio},${i.cantidad},${i.categoria}\n`;
      });

      const fileUri = FileSystem.documentDirectory + "inventario_stockpro.csv";
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert("Error", "No se pudo exportar el archivo.");
    }
  };

  const resetearApp = () => {
    if (role !== 'dueño') return Alert.alert("Denegado", "Solo el dueño puede borrar todo.");
    Alert.alert("🚨 ATENCIÓN", "¿Estás seguro de borrar TODA la base de datos? Esta acción es irreversible.", [
      { text: "Cancelar" },
      { text: "BORRAR TODO", style: "destructive", onPress: () => Alert.alert("Seguridad", "Escribe 'BORRAR' para confirmar.") }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
          <Ionicons name="settings-sharp" size={24} color="#6366f1" />
          <Text style={styles.title}>CONFIGURACIÓN</Text>
        </View>
        <TouchableOpacity style={[styles.roleBtn, role === 'dueño' ? styles.roleAdmin : styles.roleUser]} onPress={async () => {
          const newRole = role === 'dueño' ? 'empleado' : 'dueño';
          await setUsuarioActivo(newRole);
          setRole(newRole);
        }}>
          <Text style={styles.roleText}>{role.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* SECCIÓN CAJA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OPERACIONES DE CAJA</Text>
        <View style={[styles.statusCard, caja.abierta ? styles.statusOpen : styles.statusClosed]}>
          <Ionicons name={caja.abierta ? "rocket" : "moon"} size={24} color="#fff" />
          <View style={{flex:1}}>
            <Text style={styles.statusLabel}>{caja.abierta ? 'TURNO ACTIVO' : 'TURNO CERRADO'}</Text>
            {caja.abierta && <Text style={styles.statusDetail}>Efectivo en caja: ${caja.efectivoInicial + (caja.ventasEfectivo || 0)}</Text>}
          </View>
        </View>
        {!caja.abierta ? (
          <View>
            <TextInput style={styles.modalInput} placeholder="Monto Inicial $" keyboardType="numeric" value={monto} onChangeText={setMonto} placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.btnOpen} onPress={async () => {
                if(!monto) return Alert.alert("Error", "Ingresa el monto inicial");
                await abrirCaja(parseFloat(monto));
                loadData();
            }}><Text style={styles.btnText}>INICIAR DÍA</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnClose} onPress={() => setShowCierreModal(true)}><Text style={styles.btnText}>CERRAR TURNO</Text></TouchableOpacity>
        )}
      </View>

      {/* SECCIÓN AJUSTES PRO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREFERENCIAS</Text>
        
        <View style={styles.optionRow}>
          <View>
            <Text style={styles.optionTitle}>Versión de la App</Text>
            <Text style={styles.optionSub}>v1.0.3 (Enterprise)</Text>
          </View>
          <TouchableOpacity style={styles.updateBadge} onPress={() => Alert.alert("Actualizaciones", "Ya tienes la última versión.")}>
            <Text style={styles.updateBadgeText}>BUSCAR UPDATE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.optionRow}>
          <View>
            <Text style={styles.optionTitle}>Alertas de Stock</Text>
            <Text style={styles.optionSub}>Notificaciones nativas</Text>
          </View>
          <Switch value={notificaciones} onValueChange={setNotificaciones} trackColor={{ false: "#1e293b", true: "#6366f1" }} />
        </View>
      </View>

      {/* SECCIÓN GESTOR DE ALIAS */}
      <View style={styles.section}>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
          <Text style={styles.sectionTitle}>GESTOR DE ALIAS / QR</Text>
          <TouchableOpacity onPress={() => setShowAliasModal(true)}>
            <Ionicons name="add-circle" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>
        {aliases.length === 0 ? (
          <Text style={{color:'#64748b', fontSize:11}}>No hay alias configurados. Agrega uno con el botón +</Text>
        ) : (
          aliases.map(a => {
            const pct = Math.min((a.acumulado / a.limite) * 100, 100);
            return (
              <View key={a.id} style={{backgroundColor:'#1e293b', padding:15, borderRadius:12, marginBottom:10}}>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                  <Text style={{color:'#fff', fontWeight:'bold', fontSize:14}}>{a.nombre}</Text>
                  <TouchableOpacity onPress={() => handleDeleteAlias(a.id)}>
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={{color:'#94a3b8', fontSize:10, marginBottom:8}}>Recaudado: ${a.acumulado} / ${a.limite}</Text>
                <View style={{height:4, backgroundColor:'#0f172a', borderRadius:2}}>
                  <View style={{height:4, backgroundColor: pct > 90 ? '#ef4444' : '#10b981', width: `${pct}%`, borderRadius:2}} />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* SECCIÓN HERRAMIENTAS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASE DE DATOS Y EXPORTACIÓN</Text>
        <TouchableOpacity style={styles.toolBtn} onPress={exportarCSV}>
          <Ionicons name="document-text" size={20} color="#10b981" />
          <Text style={styles.toolText}>Exportar Inventario a Excel (CSV)</Text>
        </TouchableOpacity>
        
        {role === 'dueño' && (
          <TouchableOpacity style={[styles.toolBtn, {marginTop:10}]} onPress={resetearApp}>
            <Ionicons name="trash-bin" size={20} color="#ef4444" />
            <Text style={[styles.toolText, {color:'#ef4444'}]}>Borrar todos los datos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SECCIÓN SISTEMA Y SOPORTE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SISTEMA Y ACTUALIZACIONES</Text>
        <TouchableOpacity style={styles.toolBtn} onPress={() => {
          Alert.alert("Actualizaciones", "Verificando el servidor de la nube...");
          DeviceEventEmitter.emit('checkUpdateManual');
        }}>
          <Ionicons name="cloud-download-outline" size={20} color="#3b82f6" />
          <Text style={styles.toolText}>Buscar actualización del sistema</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.toolBtn, {marginTop:10}]} onPress={() => {
          Linking.openURL("https://wa.me/5493765245980?text=Hola%20Soporte%20Inventario%20Pro");
        }}>
          <Ionicons name="logo-whatsapp" size={20} color="#22c55e" />
          <Text style={styles.toolText}>WhatsApp: 3765245980</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.toolBtn, {marginTop:10}]} onPress={() => {
          Linking.openURL("mailto:delpianoadrian@gmail.com?subject=Soporte%20Inventario%20Pro");
        }}>
          <Ionicons name="mail-outline" size={20} color="#8b5cf6" />
          <Text style={styles.toolText}>Email: delpianoadrian@gmail.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerInfo}>
        <Text style={styles.footerText}>StockPro Enterprise Edition</Text>
        <Text style={styles.footerVersion}>Versión 1.1.1 • Build Inteligente</Text>
      </View>

      <Modal visible={showAliasModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Alias / QR</Text>
            <TextInput style={styles.modalInput} autoFocus value={newAliasName} onChangeText={setNewAliasName} placeholder="Nombre (ej. MiMP o Carlos.mp)" placeholderTextColor="#475569" />
            <TextInput style={styles.modalInput} keyboardType="numeric" value={newAliasLimit} onChangeText={setNewAliasLimit} placeholder="Límite en $ (ej. 300000)" placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.btnConfirm} onPress={handleAddAlias}>
              <Text style={{color:'#fff', fontWeight:'bold'}}>GUARDAR ALIAS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAliasModal(false)} style={{marginTop:15, alignItems:'center'}}>
              <Text style={{color:'#64748b'}}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCierreModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cierre Contable</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" autoFocus value={montoCierre} onChangeText={setMontoCierre} placeholder="$ 0.00" placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.btnConfirm} onPress={async () => {
               await cerrarCaja(parseFloat(montoCierre) || 0);
               setShowCierreModal(false);
               loadData();
            }}><Text style={{color:'#fff', fontWeight:'bold'}}>CONFIRMAR CIERRE</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCierreModal(false)} style={{marginTop:15, alignItems:'center'}}><Text style={{color:'#64748b'}}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems:'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  roleAdmin: { backgroundColor: '#6366f1' },
  roleUser: { backgroundColor: '#1e293b' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'black' },
  section: { backgroundColor: '#0f172a', padding: 20, borderRadius: 25, marginBottom: 20, borderWidth:1, borderColor:'#1e293b' },
  sectionTitle: { color: '#475569', fontSize: 9, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  statusCard: { flexDirection: 'row', padding: 15, borderRadius: 15, gap: 15, marginBottom: 15, alignItems: 'center' },
  statusOpen: { backgroundColor: '#10b98122', borderWidth: 1, borderColor: '#10b981' },
  statusClosed: { backgroundColor: '#33415522', borderWidth: 1, borderColor: '#475569' },
  statusLabel: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statusDetail: { color: '#94a3b8', fontSize: 11 },
  btnOpen: { backgroundColor: '#10b981', padding: 15, borderRadius: 15, alignItems: 'center' },
  btnClose: { backgroundColor: '#ef4444', padding: 15, borderRadius: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  optionTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  optionSub: { color: '#475569', fontSize: 11 },
  updateBadge: { backgroundColor: '#6366f1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  updateBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  toolText: { color: '#e2e8f0', fontSize: 13, fontWeight: '500' },
  footerInfo: { alignItems: 'center', marginTop: 10 },
  footerText: { color: '#475569', fontSize: 10, fontWeight: 'bold' },
  footerVersion: { color: '#1e293b', fontSize: 9, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#0f172a', padding: 30, borderRadius: 30 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#020617', padding: 20, borderRadius: 15, color: '#fff', fontSize: 24, textAlign: 'center', marginBottom: 20, borderWidth:1, borderColor:'#1e293b' },
  btnConfirm: { backgroundColor: '#6366f1', padding: 18, borderRadius: 15, alignItems: 'center' }
});
