import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert, ScrollView, Modal } from 'react-native';
import Scanner from '../components/Scanner';
import { getInventario, saveInventario, getUsuarioActivo } from '../utils/storage';
import { PRODUCTOS_ARGENTINOS } from '../utils/catalog';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const CATEGORIAS = [
  { id: 'verduleria', label: 'Verduleria', icon: 'leaf', color: '#10b981' },
  { id: 'carniceria', label: 'Carnicería', icon: 'pizza', color: '#ef4444' },
  { id: 'almacen', label: 'Almacén', icon: 'cart', color: '#f59e0b' },
  { id: 'bebidas', label: 'Bebidas', icon: 'beer', color: '#6366f1' },
  { id: 'limpieza', label: 'Limpieza', icon: 'water', color: '#06b6d4' },
  { id: 'sueltos', label: 'Sueltos', icon: 'egg', color: '#8b5cf6' },
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
  const [editingItem, setEditingItem] = useState(null);
  const [esPeso, setEsPeso] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  // Auto-selección de peso para Verdulería
  useEffect(() => {
    if (categoria === 'verduleria') {
      setEsPeso(true);
    }
  }, [categoria]);

  const loadData = async () => {
    const data = await getInventario();
    const r = await getUsuarioActivo();
    setInventario(data);
    setRole(r);
  };

  const generarCodigoManual = () => {
    if (editingItem) return;
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
      cantidad: parseFloat(cantidad),
      categoria,
      esPeso: esPeso
    };

    let newInv = [...inventario];
    const idx = newInv.findIndex(i => i.codigo === codigo);
    
    if (idx > -1) {
      newInv[idx] = newItem;
    } else {
      newInv.push(newItem);
    }

    await saveInventario(newInv, true);
    setInventario(newInv);
    clearForm();
    Alert.alert("Éxito", editingItem ? "Producto actualizado." : "Producto guardado.");
  };

  const handleDelete = (cod) => {
    Alert.alert("Eliminar", "¿Estás seguro de borrar este producto?", [
      { text: "Cancelar" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        const newInv = inventario.filter(i => i.codigo !== cod);
        await saveInventario(newInv, true);
        setInventario(newInv);
      }}
    ]);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setCodigo(item.codigo);
    setNombre(item.nombre);
    setPrecio(item.precio.toString());
    setCantidad(item.cantidad.toString());
    setCategoria(item.categoria);
    setEsPeso(item.esPeso);
  };

  const clearForm = () => {
    setCodigo(''); setNombre(''); setPrecio(''); setCantidad('1'); setEditingItem(null); setEsPeso(false);
  };

  const renderItem = ({ item }) => {
    const cat = CATEGORIAS.find(c => c.id === item.categoria) || CATEGORIAS[4];
    const stockBajo = item.cantidad < 5;
    
    return (
      <View style={[styles.card, stockBajo && {borderColor: '#ef444455', borderWidth: 1}]}>
        <View style={[styles.cardIcon, {backgroundColor: cat.color}]}>
          <Ionicons name={cat.icon} size={20} color="#fff" />
        </View>
        <View style={{flex:1}}>
          <Text style={styles.cardTitle}>{item.nombre} {stockBajo && '⚠️'}</Text>
          <Text style={styles.cardSubtitle}>{item.codigo} • {cat.label}</Text>
        </View>
        <View style={styles.cardPriceBox}>
          <Text style={styles.cardPrice}>${item.precio}</Text>
          <Text style={[styles.cardStock, stockBajo && {color: '#ef4444'}]}>
            {item.esPeso ? `${item.cantidad.toFixed(2)} kg` : `Stock: ${item.cantidad}`}
          </Text>
        </View>
        {role === 'dueño' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => startEdit(item)} style={styles.miniBtn}>
              <Ionicons name="pencil" size={16} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.codigo)} style={styles.miniBtn}>
              <Ionicons name="trash" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
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
        <TouchableOpacity style={{backgroundColor: '#6366f122', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#6366f1'}} onPress={() => setShowCatalogModal(true)}>
          <Text style={{color: '#6366f1', fontWeight: 'bold'}}>📖 ABRIR CATÁLOGO RÁPIDO</Text>
        </TouchableOpacity>

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

        <TouchableOpacity 
          style={[styles.pesoToggle, esPeso && {backgroundColor: '#6366f122', borderColor: '#6366f1'}]} 
          onPress={() => setEsPeso(!esPeso)}
        >
          <Ionicons name="scale" size={20} color={esPeso ? '#6366f1' : '#475569'} />
          <Text style={[styles.pesoToggleText, {color: esPeso ? '#fff' : '#475569'}]}>VENTA POR PESO (KILOS)</Text>
        </TouchableOpacity>

        <Text style={styles.label}>SELECCIONAR CATEGORÍA:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {CATEGORIAS.map(cat => (
            <TouchableOpacity key={cat.id} onPress={() => setCategoria(cat.id)} style={[styles.catBtn, categoria === cat.id && {borderColor: cat.color, backgroundColor: cat.color+'22'}]}>
              <Ionicons name={cat.icon} size={24} color={categoria === cat.id ? cat.color : '#475569'} />
              <Text style={[styles.catText, {color: categoria === cat.id ? '#fff' : '#475569'}]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={[styles.btnSave, editingItem && {backgroundColor: '#6366f1'}]} onPress={handleSave}>
          <Text style={styles.btnSaveText}>{editingItem ? 'ACTUALIZAR PRODUCTO' : 'GUARDAR PRODUCTO'}</Text>
        </TouchableOpacity>
        {editingItem && (
          <TouchableOpacity style={{marginTop: 10, alignItems: 'center'}} onPress={clearForm}>
            <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 12}}>CANCELAR EDICIÓN</Text>
          </TouchableOpacity>
        )}
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

      <Modal visible={showCatalogModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.catalogCard}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
              <Text style={styles.modalTitle}>Catálogo Argentino</Text>
              <TouchableOpacity onPress={() => setShowCatalogModal(false)}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="🔍 Buscar producto..." onChangeText={setCatalogSearch} placeholderTextColor="#475569" />
            <FlatList
              data={PRODUCTOS_ARGENTINOS.filter(p => p.nombre.toLowerCase().includes(catalogSearch.toLowerCase()))}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.catalogItem} onPress={() => {
                  setNombre(item.nombre);
                  setCategoria(item.categoria);
                  setEsPeso(item.esPeso);
                  generarCodigoManual();
                  setShowCatalogModal(false);
                }}>
                  <MaterialCommunityIcons name={item.icon} size={24} color="#6366f1" />
                  <Text style={styles.catalogText}>{item.nombre}</Text>
                  <Text style={styles.catalogSub}>({item.esPeso ? 'Peso' : 'Unidad'})</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  form: { padding: 20 },
  row: { flexDirection: 'row', marginBottom: 12 },
  input: { backgroundColor: '#0f172a', padding: 15, borderRadius: 15, color: '#fff', borderWidth: 1, borderColor: '#1e293b', marginBottom: 10 },
  btnGen: { backgroundColor: '#6366f1', padding: 15, borderRadius: 15, marginLeft: 10, justifyContent: 'center' },
  pesoToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  pesoToggleText: { fontSize: 10, fontWeight: 'bold' },
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
  actionButtons: { flexDirection: 'row', gap: 10, marginLeft: 10 },
  miniBtn: { width: 32, height: 32, backgroundColor: '#1e293b', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  headerPro: { padding: 20, paddingTop: 60, backgroundColor: '#0f172a' },
  headerTitle: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', padding: 15 },
  catalogCard: { backgroundColor: '#0f172a', padding: 20, borderRadius: 25, height: '80%', borderWidth: 2, borderColor: '#6366f1' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  catalogItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 15, borderRadius: 15, marginBottom: 10, gap: 10 },
  catalogText: { color: '#fff', fontWeight: 'bold', flex: 1 },
  catalogSub: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' }
});
