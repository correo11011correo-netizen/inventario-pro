import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert, Linking, Modal, ScrollView } from 'react-native';
import Scanner from '../components/Scanner';
import { getInventario, saveInventario, saveVenta } from '../utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function VentasScreen({ navigation }) {
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [nombreCli, setNombreCli] = useState('');
  const [telefonoCli, setTelefonoCli] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPesoModal, setShowPesoModal] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [pesoIngresado, setPesoIngresado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [pagaCon, setPagaCon] = useState('');
  const [alias, setAlias] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const data = await getInventario();
    setInventario(data);
  };

  const agregarAlCarrito = (producto) => {
    if (producto.esPeso) {
      setProductoActual(producto);
      setShowPesoModal(true);
      return;
    }
    
    setCarrito(prev => {
      const existing = prev.find(c => c.codigo === producto.codigo);
      if (existing) return prev.map(c => c.codigo === producto.codigo ? { ...c, cantidad: c.cantidad + 1 } : c);
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setShowManual(false);
  };

  const confirmarPeso = () => {
    const pesoKilos = parseFloat(pesoIngresado) / 1000;
    if (isNaN(pesoKilos) || pesoKilos <= 0) return Alert.alert("Error", "Ingresa un peso válido en gramos.");
    
    setCarrito(prev => [...prev, { ...productoActual, cantidad: pesoKilos, totalItem: productoActual.precio * pesoKilos }]);
    setShowPesoModal(false);
    setPesoIngresado('');
    setProductoActual(null);
    setShowManual(false);
  };

  const totalVenta = carrito.reduce((sum, item) => sum + (item.totalItem || (item.precio * item.cantidad)), 0);
  const vuelto = parseFloat(pagaCon) > totalVenta ? parseFloat(pagaCon) - totalVenta : 0;

  const finalizarProcesoVenta = async () => {
    if (metodoPago === 'Efectivo' && parseFloat(pagaCon) < totalVenta) return Alert.alert("Error", "Monto insuficiente.");
    const ventaData = { items: carrito, total: totalVenta, cliente: nombreCli, metodoPago, pagaCon: parseFloat(pagaCon) || 0, vuelto, alias, fecha: new Date().toISOString() };
    await saveVenta(ventaData);

    let newInv = [...inventario];
    carrito.forEach(item => {
      const idx = newInv.findIndex(i => i.codigo === item.codigo);
      if (idx > -1) {
        newInv[idx].cantidad -= item.cantidad; // Resta la cantidad real (unidades o kilos)
      }
    });
    await saveInventario(newInv);
    setShowCheckout(false);
    
    Alert.alert("Venta ✅", `Total: $${totalVenta.toFixed(2)}`, [
      { text: "Cerrar", onPress: () => limpiarVenta() },
      { text: "WhatsApp", onPress: () => {
        let msg = `*COMPROBANTE STOCKPRO*\n` + carrito.map(i => `• ${i.esPeso ? i.cantidad.toFixed(3)+'kg' : i.cantidad+'u'} x ${i.nombre} ($${(i.totalItem || i.precio*i.cantidad).toFixed(2)})`).join('\n') + `\n*TOTAL: $${totalVenta.toFixed(2)}* (${metodoPago})`;
        Linking.openURL(`whatsapp://send?phone=${telefonoCli.replace(/\D/g, "")}&text=${encodeURIComponent(msg)}`).then(limpiarVenta);
      }}
    ]);
  };

  const limpiarVenta = () => {
    setCarrito([]); setNombreCli(''); setTelefonoCli(''); setPagaCon(''); setAlias('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerTools}>
        <View style={{flex:1}}><Scanner onScan={(d) => {
          const p = inventario.find(i => i.codigo === d);
          if (p) agregarAlCarrito(p);
        }} /></View>
        <TouchableOpacity style={styles.sideBtn} onPress={() => setShowManual(true)}><Ionicons name="search" size={20} color="#fff" /><Text style={styles.sideBtnText}>BUSCAR</Text></TouchableOpacity>
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
        <Text style={styles.totalAmount}>${totalVenta.toFixed(2)}</Text>
      </View>

      <FlatList data={carrito} renderItem={({item, index}) => (
        <View style={styles.cartItem}>
          <Text style={styles.cartText}>{item.esPeso ? item.cantidad.toFixed(3)+' kg' : item.cantidad+' u.'} {item.nombre}</Text>
          <Text style={styles.cartPrice}>${(item.totalItem || item.precio*item.cantidad).toFixed(2)}</Text>
          <TouchableOpacity onPress={() => setCarrito(prev => prev.filter((_,i)=>i!==index))}><Ionicons name="trash" size={18} color="#ef4444" /></TouchableOpacity>
        </View>
      )} contentContainerStyle={{padding: 20}} />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPay} onPress={() => carrito.length > 0 && setShowCheckout(true)}><Text style={styles.btnPayText}>💰 COBRAR VENTA</Text></TouchableOpacity>
      </View>

      {/* MODAL PESO (CALCULADORA GRAMOS) */}
      <Modal visible={showPesoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutCard}>
            <Text style={styles.modalTitle}>Venta por Peso ⚖️</Text>
            <Text style={styles.inputLabel}>{productoActual?.nombre} - $ {productoActual?.precio}/kg</Text>
            <TextInput style={styles.modalInput} placeholder="Ingresa GRAMOS (ej: 1200)" keyboardType="numeric" autoFocus value={pesoIngresado} onChangeText={setPesoIngresado} placeholderTextColor="#475569" />
            <Text style={styles.resumenPeso}>Total: $ {((parseFloat(pesoIngresado)/1000) * (productoActual?.precio || 0)).toFixed(2)}</Text>
            <View style={styles.payRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowPesoModal(false)}><Text style={{color:'#fff'}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={confirmarPeso}><Text style={{color:'#fff', fontWeight:'bold'}}>AGREGAR</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CHECKOUT */}
      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.checkoutCard}>
            <Text style={styles.modalTitle}>Confirmar Pago</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.sumLabel}>A COBRAR</Text>
              <Text style={styles.sumAmount}>${totalVenta.toFixed(2)}</Text>
            </View>
            <View style={styles.payRow}>
              {['Efectivo', 'Tarjeta', 'Transferencia'].map(m => (
                <TouchableOpacity key={m} onPress={() => setMetodoPago(m)} style={[styles.payOption, metodoPago === m && styles.payOptionActive]}>
                  <Text style={[styles.payOptionText, metodoPago === m && {color:'#fff'}]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {metodoPago === 'Efectivo' && (
              <View style={styles.cashBox}>
                <TextInput style={styles.modalInput} placeholder="Paga con ($)" keyboardType="numeric" value={pagaCon} onChangeText={setPagaCon} placeholderTextColor="#475569" />
                <View style={styles.vueltoBox}><Text style={styles.vueltoLabel}>VUELTO:</Text><Text style={styles.vueltoAmount}>${vuelto.toFixed(2)}</Text></View>
              </View>
            )}
            <TextInput style={styles.modalInput} placeholder="WhatsApp (Opcional)" keyboardType="phone-pad" value={telefonoCli} onChangeText={setTelefonoCli} placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.btnFinish} onPress={finalizarProcesoVenta}><Text style={styles.btnFinishText}>FINALIZAR VENTA ✅</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCheckout(false)} style={{marginTop:15, alignItems:'center'}}><Text style={{color:'#64748b'}}>Volver al carrito</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL BUSQUEDA MANUAL */}
      <Modal visible={showManual} animationType="fade" transparent>
        <View style={styles.modalOverlay}><View style={styles.checkoutCard}>
          <TextInput style={styles.modalInput} placeholder="🔍 Buscar producto..." onChangeText={setSearch} placeholderTextColor="#475569" />
          <FlatList data={inventario.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()))} renderItem={({item}) => (
            <TouchableOpacity style={styles.manualItem} onPress={() => agregarAlCarrito(item)}>
              <Text style={{color:'#fff', fontWeight:'bold'}}>{item.nombre}</Text>
              <Text style={{color:'#6366f1'}}>{item.esPeso ? '$'+item.precio+'/kg' : '$'+item.precio}</Text>
            </TouchableOpacity>
          )} />
          <TouchableOpacity onPress={() => setShowManual(false)} style={{marginTop:10, alignItems:'center'}}><Text style={{color:'#fff', fontWeight:'bold'}}>CERRAR</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerTools: { flexDirection: 'row', alignItems: 'center', paddingRight: 15 },
  sideBtn: { backgroundColor: '#1e293b', padding: 15, borderRadius: 20, alignItems: 'center', justifyContent: 'center', height: 140, width: 80, marginTop: 12 },
  sideBtnText: { color: '#fff', fontSize: 9, fontWeight: 'bold', marginTop: 5 },
  totalBox: { backgroundColor: '#0f172a', margin: 16, padding: 20, borderRadius: 24, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#6366f1', elevation: 5 },
  totalLabel: { color: '#818cf8', fontSize: 10, fontWeight: 'bold' },
  totalAmount: { color: '#fff', fontSize: 42, fontWeight: '900' },
  cartItem: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 15, borderRadius: 15, marginBottom: 8, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1e293b' },
  cartText: { color: '#fff', flex: 1, fontWeight: 'bold', fontSize: 13 },
  cartPrice: { color: '#4ade80', fontWeight: '900' },
  footer: { padding: 16, paddingBottom: 110 },
  btnPay: { backgroundColor: '#6366f1', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 10 },
  btnPayText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 15 },
  checkoutCard: { backgroundColor: '#0f172a', padding: 25, borderRadius: 30, borderTopWidth: 4, borderTopColor: '#6366f1' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  summaryBox: { backgroundColor: '#020617', padding: 20, borderRadius: 20, alignItems: 'center', marginVertical: 20 },
  sumLabel: { color: '#6366f1', fontSize: 10, fontWeight: 'bold' },
  sumAmount: { color: '#fff', fontSize: 40, fontWeight: '900' },
  inputLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 15 },
  payRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  payOption: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  payOptionActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  payOptionText: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
  modalInput: { backgroundColor: '#020617', padding: 18, borderRadius: 15, color: '#fff', fontSize: 18, marginBottom: 15, borderWidth: 1, borderColor: '#1e293b' },
  vueltoBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#10b98111', borderRadius: 15, marginBottom: 15 },
  vueltoLabel: { color: '#10b981', fontWeight: 'bold', fontSize: 12 },
  vueltoAmount: { color: '#fff', fontSize: 24, fontWeight: '900' },
  btnFinish: { backgroundColor: '#10b981', padding: 20, borderRadius: 20, alignItems: 'center' },
  btnFinishText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  manualItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  resumenPeso: { color: '#4ade80', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  btnCancel: { flex: 1, padding: 15, alignItems: 'center' },
  btnConfirm: { flex: 2, backgroundColor: '#6366f1', padding: 15, borderRadius: 15, alignItems: 'center' }
});
