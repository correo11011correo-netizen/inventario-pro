import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import Scanner from '../components/Scanner';
import { getInventario, saveInventario, getUsuarioActivo } from '../utils/storage';

export default function StockScreen({ navigation }) {
  const [inventario, setInventario] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
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

  const handleScan = (scannedData) => {
    setCodigo(scannedData);
    const item = inventario.find(i => i.codigo === scannedData);
    if (item) {
      setNombre(item.nombre);
      setPrecio(item.precio.toString());
      setCantidad(item.cantidad.toString());
    }
  };

  const handleSave = async () => {
    if (!codigo || !nombre) {
      Alert.alert('Error', 'Debes escanear un código y asignar un nombre.');
      return;
    }

    const newItem = {
      codigo,
      nombre,
      precio: parseFloat(precio) || 0,
      cantidad: parseInt(cantidad) || 0,
    };

    let newInventario = [...inventario];
    const idx = newInventario.findIndex(i => i.codigo === codigo);
    
    if (idx > -1) {
      newInventario[idx] = newItem;
    } else {
      newInventario.push(newItem);
    }

    setInventario(newInventario);
    await saveInventario(newInventario, true);
    clearForm();
  };

  const handleDelete = async (codeToDelete) => {
    if (role !== 'dueño') {
      Alert.alert("Acceso Denegado", "Solo el dueño puede eliminar productos.");
      return;
    }
    Alert.alert('Confirmar', '¿Eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive',
        onPress: async () => {
          const newInventario = inventario.filter(i => i.codigo !== codeToDelete);
          setInventario(newInventario);
          await saveInventario(newInventario, true);
        }
      }
    ]);
  };

  const handleEdit = (item) => {
    if (role !== 'dueño') return;
    setCodigo(item.codigo);
    setNombre(item.nombre);
    setPrecio(item.precio.toString());
    setCantidad(item.cantidad.toString());
  };

  const clearForm = () => {
    setCodigo('');
    setNombre('');
    setPrecio('');
    setCantidad('1');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardContent} 
        onPress={() => handleEdit(item)}
        disabled={role !== 'dueño'}
      >
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>{item.codigo} • ${item.precio}</Text>
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <View style={styles.badge}><Text style={styles.badgeText}>{item.cantidad}</Text></View>
        {role === 'dueño' && (
          <TouchableOpacity onPress={() => handleDelete(item.codigo)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Solo el dueño puede escanear y editar stock */}
      {role === 'dueño' ? (
        <>
          <Scanner onScan={handleScan} />
          <View style={styles.formContainer}>
            <TextInput 
              style={styles.inputCode} 
              value={codigo} 
              placeholder="ESCANEAR" 
              placeholderTextColor="#475569" 
              editable={false} 
            />
            <TextInput 
              style={styles.input} 
              value={nombre} 
              onChangeText={setNombre} 
              placeholder="Nombre del Producto" 
              placeholderTextColor="#64748b" 
            />
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, styles.half]} 
                value={precio} 
                onChangeText={setPrecio} 
                placeholder="Precio ($)" 
                keyboardType="numeric" 
                placeholderTextColor="#64748b" 
              />
              <TextInput 
                style={[styles.input, styles.half]} 
                value={cantidad} 
                onChangeText={setCantidad} 
                placeholder="Stock" 
                keyboardType="numeric" 
                placeholderTextColor="#64748b" 
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>GUARDAR / ACTUALIZAR</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.readonlyHeader}>
          <Text style={styles.readonlyTitle}>MODO CONSULTA</Text>
          <Text style={styles.readonlySubtitle}>Solo lectura para empleados</Text>
        </View>
      )}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>INVENTARIO ACTUAL</Text>
        <Text style={styles.listCount}>{inventario.length} Items</Text>
      </View>

      <FlatList 
        data={[...inventario].reverse()}
        keyExtractor={(item) => item.codigo}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  readonlyHeader: {
    padding: 24,
    backgroundColor: '#0f172a',
    margin: 16,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  readonlyTitle: { color: '#818cf8', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  readonlySubtitle: { color: '#64748b', fontSize: 10, marginTop: 4 },
  formContainer: {
    backgroundColor: '#0f172a',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  inputCode: {
    backgroundColor: '#020617',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    color: '#4ade80',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#020617',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  half: {
    width: '48%',
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  listCount: {
    color: '#94a3b8',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteText: {
    fontSize: 16,
  }
});
