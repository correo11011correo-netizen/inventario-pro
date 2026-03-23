import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { getCajaEstado, abrirCaja, cerrarCaja, getUsuarioActivo, setUsuarioActivo } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen({ navigation }) {
  const [caja, setCaja] = useState({ abierta: false });
  const [monto, setMonto] = useState('');
  const [role, setRole] = useState('empleado');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const st = await getCajaEstado();
    const r = await getUsuarioActivo();
    setCaja(st);
    setRole(r);
    // Si la caja está cerrada, sugerimos el monto del último cierre
    if (!st.abierta && st.montoCierreReal) {
      setMonto(st.montoCierreReal.toString());
    }
  };

  const handleAbrir = async () => {
    if (!monto) return Alert.alert("Error", "Ingresa el monto inicial de caja");
    await abrirCaja(parseFloat(monto));
    setMonto('');
    loadData();
    Alert.alert("Caja Abierta", "Turno iniciado correctamente.");
  };

  const handleCerrar = async () => {
    Alert.prompt(
      "Cierre de Turno y Arqueo",
      "Ingresa el total de EFECTIVO FÍSICO en caja:",
      async (val) => {
        const montoReal = parseFloat(val) || 0;
        const resumen = await cerrarCaja(montoReal);
        const esperado = resumen.efectivoInicial + resumen.ventasTurno;
        const diferencia = montoReal - esperado;
        
        // Registrar en auditoría con lujo de detalles
        await registrarAuditoria('CIERRE_CONTABLE', 
          `Cerrado por: ${role.toUpperCase()}. Esperado: $${esperado}, Real: $${montoReal}, Dif: $${diferencia}`
        );

        Alert.alert(
          "✅ Turno Cerrado con Éxito",
          `RESUMEN DEL TURNO:\n\n` +
          `• Inicio: $${resumen.efectivoInicial}\n` +
          `• Ventas: $${resumen.ventasTurno}\n` +
          `• Esperado: $${esperado}\n` +
          `• Físico: $${montoReal}\n` +
          `• DIFERENCIA: $${diferencia >= 0 ? '+' : ''}${diferencia}\n\n` +
          `El monto de $${montoReal} queda registrado para el inicio del siguiente turno.`,
          [{ text: "ENTENDIDO", onPress: loadData }]
        );
      },
      'plain-text',
      '',
      'numeric'
    );
  };

  const toggleRole = async () => {
    const newRole = role === 'dueño' ? 'empleado' : 'dueño';
    if (newRole === 'dueño') {
      // Aquí podrías pedir una clave en el futuro
      Alert.alert("Modo Administrador", "Acceso total activado.");
    }
    await setUsuarioActivo(newRole);
    setRole(newRole);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>GESTIÓN DE LOCAL</Text>
        <TouchableOpacity style={[styles.roleBtn, role === 'dueño' ? styles.roleAdmin : styles.roleUser]} onPress={toggleRole}>
          <Text style={styles.roleText}>{role.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ESTADO DE CAJA (TURNO 24HS)</Text>
        <View style={[styles.statusCard, caja.abierta ? styles.statusOpen : styles.statusClosed]}>
          <Ionicons name={caja.abierta ? "lock-open" : "lock-closed"} size={24} color="#fff" />
          <View>
            <Text style={styles.statusLabel}>LA CAJA ESTÁ {caja.abierta ? 'ABIERTA' : 'CERRADA'}</Text>
            {caja.abierta && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.statusDetail}>💵 Efectivo: ${caja.efectivoInicial + (caja.ventasEfectivo || 0)}</Text>
                <Text style={styles.statusDetail}>💳 Digital: ${caja.ventasDigital || 0}</Text>
              </View>
            )}
          </View>
        </View>

        {!caja.abierta ? (
          <View style={styles.actionBox}>
            <TextInput 
              style={styles.input} 
              placeholder="Efectivo inicial ($)" 
              keyboardType="numeric" 
              value={monto} 
              onChangeText={setMonto}
              placeholderTextColor="#475569"
            />
            <TouchableOpacity style={styles.btnOpen} onPress={handleAbrir}>
              <Text style={styles.btnText}>ABRIR NUEVO TURNO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnClose} onPress={handleCerrar}>
            <Text style={styles.btnText}>CERRAR TURNO Y ARQUEO</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark" size={20} color="#818cf8" />
        <Text style={styles.infoText}>
          Sistema Anti-Robo Activo: Todas las modificaciones de stock y cierres de caja quedan registrados con usuario y hora.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  roleAdmin: { backgroundColor: '#ef4444' },
  roleUser: { backgroundColor: '#1e293b' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, gap: 15, marginBottom: 15 },
  statusOpen: { backgroundColor: '#16a34a' },
  statusClosed: { backgroundColor: '#334155' },
  statusLabel: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statusDetail: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 },
  actionBox: { gap: 10 },
  input: { backgroundColor: '#0f172a', padding: 16, borderRadius: 16, color: '#fff', borderWidth: 1, borderColor: '#1e293b' },
  btnOpen: { backgroundColor: '#4f46e5', padding: 18, borderRadius: 16, alignItems: 'center' },
  btnClose: { backgroundColor: '#ef4444', padding: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  infoBox: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 15, borderRadius: 16, gap: 12, marginTop: 20 },
  infoText: { color: '#94a3b8', fontSize: 11, flex: 1, lineHeight: 16 }
});
