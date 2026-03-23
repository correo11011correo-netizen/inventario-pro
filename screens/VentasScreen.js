import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert, Linking, Modal } from 'react-native';
import Scanner from '../components/Scanner';
import { getInventario, saveInventario, saveVenta } from '../utils/storage';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

export default function VentasScreen({ navigation }) {
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [nombreCli, setNombreCli] = useState('');
  const [telefonoCli, setTelefonoCli] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const data = await getInventario();
    setInventario(data);
  };

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existing = prev.find(c => c.codigo === producto.codigo);
      if (existing) {
        return prev.map(c => c.codigo === producto.codigo ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    if(showManual) setShowManual(false);
  };

  const handleScan = (scannedData) => {
    const producto = inventario.find(i => i.codigo === scannedData);
    if (!producto) return Alert.alert('No encontrado', 'El producto no existe en stock.');
    agregarAlCarrito(producto);
  };

  const procesarVentaFinal = async (metodo) => {
    const total = totalVenta;
    const cleanPhone = telefonoCli.replace(/\D/g, "");
    await saveVenta({ items: carrito, total, cliente: nombreCli, metodoPago: metodo });
    
    let newInventario = [...inventario];
    carrito.forEach(item => {
      const idx = newInventario.findIndex(i => i.codigo === item.codigo);
      if (idx > -1) newInventario[idx].cantidad -= item.cantidad;
    });
    await saveInventario(newInventario);

    if (cleanPhone) {
      Alert.alert("Éxito", "¿Enviar por WhatsApp?", [
        { text: "No", onPress: () => setCarrito([]) },
        { text: "Sí", onPress: () => {
          let msg = `*Compra en StockPro*\n\n` + carrito.map(i => `• ${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`).join('\n') + `\n\n*TOTAL: $${total}* (${metodo})`;
          Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`).then(() => setCarrito([]));
        }}
      ]);
    } else {
      Alert.alert("Hecho", "Venta guardada.", [{ text: "OK", onPress: () => setCarrito([]) }]);
    }
  };

  const totalVenta = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.manualCard} onPress={() => agregarAlCarrito(item)}>
      <View style={[styles.avatar, {backgroundColor: ['#6366f1','#ec4899','#f59e0b','#10b981'][Math.floor(Math.random()*4)]}]}>
        <Text style={styles.avatarText}>{item.nombre.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{flex:1}}>
        <Text style={styles.manualName}>{item.nombre}</Text>
        <Text style={styles.manualPrice}>$ {item.precio} • Stock: {item.cantidad}</Text>
      </View>
      <Ionicons name="add-circle" size={24} color="#6366f1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerTools}>
        <View style={{flex:1}}><Scanner onScan={handleScan} /></View>
        <TouchableOpacity style={styles.manualBtn} onPress={() => setShowManual(true)}>
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.manualBtnText}>MANUAL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>TOTAL A COBRAR</Text>
        <Text style={styles.totalAmount}>${totalVenta}</Text>
      </View>

      <FlatList 
        data={carrito} 
        keyExtractor={(item, index) => index.toString()} 
        renderItem={({item, index}) => (
          <View style={styles.cartItem}>
            <Text style={styles.cartText}>{item.cantidad}x {item.nombre}</Text>
            <Text style={styles.cartPrice}>${item.precio * item.cantidad}</Text>
            <TouchableOpacity onPress={() => setCarrito(prev => prev.filter((_,i)=>i!==index))}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )} 
        contentContainerStyle={styles.list}
      />

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.wsBtn} onPress={() => {
          if (carrito.length === 0) return;
          Alert.alert("Cobrar", "Medodo de pago:", [
            { text: "💵 Efectivo", onPress: () => procesarVentaFinal('Efectivo') },
            { text: "💳 Tarjeta", onPress: () => procesarVentaFinal('Tarjeta') },
            { text: "Cancelar", style: "cancel" }
          ]);
        }}>
          <Text style={styles.wsBtnText}>✔️ FINALIZAR VENTA</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL BUSQUEDA MANUAL */}
      <Modal visible={showManual} animationType="slide" transparent={true}>
        <View style={styles.modalBG}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Producto</Text>
              <TouchableOpacity onPress={() => setShowManual(false)}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
            </View>
            <TextInput style={styles.searchBar} placeholder="Buscar por nombre..." placeholderTextColor="#64748b" onChangeText={setSearch} />
            <FlatList 
              data={inventario.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()))} 
              keyExtractor={item => item.codigo} 
              renderItem={renderProductItem} 
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  headerTools: { flexDirection: 'row', alignItems: 'center', paddingRight: 15 },
  manualBtn: { backgroundColor: '#1e293b', padding: 15, borderRadius: 20, alignItems: 'center', justifyContent: 'center', height: 140, width: 80, marginTop: 12 },
  manualBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  totalBox: { backgroundColor: '#0f172a', margin: 16, padding: 20, borderRadius: 24, alignItems: 'center', borderLeftWidth: 5, borderLeftColor: '#6366f1' },
  totalLabel: { color: '#818cf8', fontSize: 10, fontWeight: 'bold' },
  totalAmount: { color: '#fff', fontSize: 42, fontWeight: '900' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  cartItem: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 15, borderRadius: 15, marginBottom: 8, alignItems: 'center', gap: 10 },
  cartText: { color: '#fff', flex: 1, fontWeight: 'bold' },
  cartPrice: { color: '#818cf8', fontWeight: '900' },
  footerRow: { padding: 16, paddingBottom: 110 },
  wsBtn: { backgroundColor: '#4f46e5', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 5 },
  wsBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  modalBG: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchBar: { backgroundColor: '#020617', padding: 15, borderRadius: 15, color: '#fff', marginBottom: 15, borderWidth: 1, borderColor: '#1e293b' },
  manualCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1e293b', borderRadius: 15, marginBottom: 10, gap: 12 },
  avatar: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  manualName: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  manualPrice: { color: '#64748b', fontSize: 12 }
});
