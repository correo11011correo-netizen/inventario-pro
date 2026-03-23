import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Modal } from 'react-native';
import { getCajaEstado, abrirCaja, cerrarCaja, getUsuarioActivo, setUsuarioActivo, registrarAuditoria } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }) {
  const [caja, setCaja] = useState({ abierta: false });
  const [monto, setMonto] = useState('');
  const [role, setRole] = useState('empleado');
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [montoCierre, setMontoCierre] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const st = await getCajaEstado();
    const r = await getUsuarioActivo();
    setCaja(st);
    setRole(r);
    if (!st.abierta && st.montoCierreReal) setMonto(st.montoCierreReal.toString());
  };

  const handleAbrir = async () => {
    if (!monto) return Alert.alert("Error", "Ingresa el monto inicial");
    await abrirCaja(parseFloat(monto));
    setMonto('');
    loadData();
  };

  const ejecutarCierre = async () => {
    const val = parseFloat(montoCierre) || 0;
    const resumen = await cerrarCaja(val);
    const esperado = resumen.efectivoInicial + resumen.ventasEfectivo;
    const dif = val - esperado;
    
    await registrarAuditoria('CIERRE_CONTABLE', `Cerrado por: ${role}. Ef: ${val}, Dif: ${dif}`);
    setShowCierreModal(false);
    setMontoCierre('');
    loadData();

    Alert.alert("Turno Cerrado", `Esperado: $${esperado}\nReal: $${val}\nDiferencia: $${dif}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>CONFIGURACIÓN</Text>
        <TouchableOpacity style={[styles.roleBtn, role === 'dueño' ? styles.roleAdmin : styles.roleUser]} onPress={async () => {
          const newRole = role === 'dueño' ? 'empleado' : 'dueño';
          await setUsuarioActivo(newRole);
          setRole(newRole);
        }}>
          <Text style={styles.roleText}>{role.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SISTEMA DE CAJA</Text>
        <View style={[styles.statusCard, caja.abierta ? styles.statusOpen : styles.statusClosed]}>
          <Ionicons name={caja.abierta ? "cash" : "lock-closed"} size={30} color="#fff" />
          <View style={{flex:1}}>
            <Text style={styles.statusLabel}>{caja.abierta ? 'CAJA EN SERVICIO' : 'CAJA CERRADA'}</Text>
            {caja.abierta && <Text style={styles.statusDetail}>Efectivo: ${caja.efectivoInicial + (caja.ventasEfectivo || 0)}</Text>}
          </View>
        </View>

        {!caja.abierta ? (
          <View style={styles.actionBox}>
            <TextInput style={styles.input} placeholder="Efectivo inicial ($)" keyboardType="numeric" value={monto} onChangeText={setMonto} placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.btnOpen} onPress={handleAbrir}><Text style={styles.btnText}>ABRIR TURNO</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnClose} onPress={() => setShowCierreModal(true)}><Text style={styles.btnText}>CERRAR CAJA Y ARQUEO</Text></TouchableOpacity>
        )}
      </View>

      {/* Modal de Cierre de Caja */}
      <Modal visible={showCierreModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Arqueo de Caja</Text>
            <Text style={styles.modalSub}>Ingresa el total de dinero físico que hay en el cajón:</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" autoFocus value={montoCierre} onChangeText={setMontoCierre} placeholder="$ 0.00" placeholderTextColor="#475569" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowCierreModal(false)}><Text style={{color:'#fff'}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={ejecutarCierre}><Text style={{color:'#fff', fontWeight:'bold'}}>CERRAR TURNO</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  roleBtn: { padding: 8, borderRadius: 10 },
  roleAdmin: { backgroundColor: '#6366f1' },
  roleUser: { backgroundColor: '#1e293b' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  statusCard: { flexDirection: 'row', padding: 25, borderRadius: 24, gap: 20, marginBottom: 15, alignItems: 'center' },
  statusOpen: { backgroundColor: '#10b981' },
  statusClosed: { backgroundColor: '#334155' },
  statusLabel: { color: '#fff', fontWeight: '900', fontSize: 16 },
  statusDetail: { color: '#fff', opacity: 0.8, fontSize: 12 },
  input: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, color: '#fff', marginBottom: 10, borderWidth:1, borderColor:'#1e293b' },
  btnOpen: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center' },
  btnClose: { backgroundColor: '#ef4444', padding: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#0f172a', padding: 30, borderRadius: 30, borderWidth: 1, borderColor: '#1e293b' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalSub: { color: '#64748b', fontSize: 14, marginBottom: 20 },
  modalInput: { backgroundColor: '#020617', padding: 20, borderRadius: 15, color: '#fff', fontSize: 24, textAlign: 'center', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  modalActions: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
  btnConfirm: { flex: 2, backgroundColor: '#4f46e5', padding: 15, borderRadius: 15, alignItems: 'center' }
});
