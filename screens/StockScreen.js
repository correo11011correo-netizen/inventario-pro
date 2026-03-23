import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import Scanner from '../components/Scanner';
import { getInventario, saveInventario, getUsuarioActivo } from '../utils/storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const CATEGORIAS = [
  { id: 'verduleria', label: 'Verduleria', icon: 'leaf', color: '#10b981' },
  { id: 'almacen', label: 'Almacén', icon: 'cart', color: '#f59e0b' },
  { id: 'bebidas', label: 'Bebidas', icon: 'beer', color: '#6366f1' },
  { id: 'limpieza', label: 'Limpieza', icon: 'water', color: '#06b6d4' },
  { id: 'otros', label: 'Otros', icon: 'apps', color: '#64748b' }
];

export default function StockScreen({ navigation }) {
  const [inventario, setInventario] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [categoria, setCategoria] = useState('almacen');
  const [role, setRole] = useState('empleado');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const data = await getInventario();
    const r = await getUsuarioActivo();
    setInventario(data);
    setRole(r);
  };

  const generarCodigoManual = () => {
    const prefijo = categoria.charAt(0).toUpperCase();
    const num = Math.floor(1000 + Math.random() * 9000);
    setCodigo(`${prefijo}-${num}`);
  };

  const handleSave = async () => {
    if (!codigo || !nombre || !precio) return Alert.alert('Error', 'Completa los campos obligatorios.');
    
    const newItem = {
      codigo,
      nombre,
      precio: parseFloat(precio),
      cantidad: parseInt(cantidad),
      categoria
    };

    let newInv = [...inventario];
    const idx = newInv.findIndex(i => i.codigo === codigo);
    idx > -1 ? newInv[idx] = newItem : newInv.push(newItem);

    await saveInventario(newInv, true);
    setInventario(newInv);
    clearForm();
    Alert.alert("Éxito", "Producto guardado.");
  };

  const clearForm = () => {
    setCodigo(''); setNombre(''); setPrecio(''); setCantidad('1');
  };

  const renderItem = ({ item }) => {
    const cat = CATEGORIAS.find(c => c.id === item.categoria) || CATEGORIAS[4];
    return (
      <View style={styles.card}>
        <View style={[styles.cardIcon, {backgroundColor: cat.color}]}>
          <Ionicons name={cat.icon} size={20} color="#fff" />
        </View>
        <View style={{flex:1}}>
          <Text style={styles.cardTitle}>{item.nombre}</Text>
          <Text style={styles.cardSubtitle}>{item.codigo} • {cat.label}</Text>
        </View>
        <View style={styles.cardPriceBox}>
          <Text style={styles.cardPrice}>${item.precio}</Text>
          <Text style={styles.cardStock}>Stock: {item.cantidad}</Text>
        </View>
      </View>
    );
  };

  if (role !== 'dueño') {
    return (
      <View style={styles.container}>
        <View style={styles.headerPro}><Text style={styles.headerTitle}>CONSULTA DE STOCK</Text></View>
        <FlatList data={[...inventario].reverse()} keyExtractor={i => i.codigo} renderItem={renderItem} contentContainerStyle={styles.list} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Scanner onScan={setCodigo} />
      
      <View style={styles.form}>
        <View style={styles.row}>
          <TextInput style={[styles.input, {flex:1, color:'#4ade80', fontWeight:'bold'}]} value={codigo} placeholder="CÓDIGO" placeholderTextColor="#475569" editable={false} />
          <TouchableOpacity style={styles.btnGen} onPress={generarCodigoManual}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre del Producto (ej: Tomates)" placeholderTextColor="#64748b" />
        
        <View style={styles.row}>
          <TextInput style={[styles.input, {flex:1}]} value={precio} onChangeText={setPrecio} placeholder="Precio $" keyboardType="numeric" placeholderTextColor="#64748b" />
          <TextInput style={[styles.input, {flex:1, marginLeft:10}]} value={cantidad} onChangeText={setCantidad} placeholder="Stock" keyboardType="numeric" placeholderTextColor="#64748b" />
        </View>

        <Text style={styles.label}>SELECCIONAR CATEGORÍA:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {CATEGORIAS.map(cat => (
            <TouchableOpacity key={cat.id} onPress={() => setCategoria(cat.id)} style={[styles.catBtn, categoria === cat.id && {borderColor: cat.color, backgroundColor: cat.color+'22'}]}>
              <Ionicons name={cat.icon} size={24} color={categoria === cat.id ? cat.color : '#475569'} />
              <Text style={[styles.catText, {color: categoria === cat.id ? '#fff' : '#475569'}]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
          <Text style={styles.btnSaveText}>GUARDAR PRODUCTO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>PRODUCTOS REGISTRADOS</Text>
      </View>

      <FlatList 
        scrollEnabled={false}
        data={[...inventario].reverse()} 
        keyExtractor={i => i.codigo} 
        renderItem={renderItem} 
        contentContainerStyle={styles.list} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  form: { padding: 20 },
  row: { flexDirection: 'row', marginBottom: 12 },
  input: { backgroundColor: '#0f172a', padding: 15, borderRadius: 15, color: '#fff', borderWidth: 1, borderColor: '#1e293b' },
  btnGen: { backgroundColor: '#6366f1', padding: 15, borderRadius: 15, marginLeft: 10, justifyContent: 'center' },
  label: { color: '#64748b', fontSize: 10, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  catRow: { flexDirection: 'row', marginBottom: 20 },
  catBtn: { alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 2, borderColor: '#1e293b', marginRight: 10, width: 100 },
  catText: { fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  btnSave: { backgroundColor: '#10b981', padding: 20, borderRadius: 20, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontWeight: '900' },
  listHeader: { paddingHorizontal: 20, marginTop: 20 },
  listTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
  list: { padding: 20, paddingBottom: 150 },
  card: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 15, borderRadius: 20, marginBottom: 10, alignItems: 'center', gap: 15 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontWeight: 'bold' },
  cardSubtitle: { color: '#64748b', fontSize: 10 },
  cardPriceBox: { alignItems: 'flex-end' },
  cardPrice: { color: '#4ade80', fontWeight: 'bold' },
  cardStock: { color: '#6366f1', fontSize: 10, fontWeight: 'bold' },
  headerPro: { padding: 20, paddingTop: 60, backgroundColor: '#0f172a' },
  headerTitle: { color: '#fff', fontWeight: 'bold', textAlign: 'center' }
});
