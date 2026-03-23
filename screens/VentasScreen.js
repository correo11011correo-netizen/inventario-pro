import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Alert, Linking } from 'react-native';
import Scanner from '../components/Scanner';
import { getInventario } from '../utils/storage';

export default function VentasScreen({ navigation }) {
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [nombreCli, setNombreCli] = useState('');
  const [telefonoCli, setTelefonoCli] = useState('');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const data = await getInventario();
    setInventario(data);
  };

  const handleScan = (scannedData) => {
    const producto = inventario.find(i => i.codigo === scannedData);
    if (!producto) {
      Alert.alert('No encontrado', 'El producto escaneado no está en el inventario.');
      return;
    }

    setCarrito(prev => {
      const existing = prev.find(c => c.codigo === scannedData);
      if (existing) {
        return prev.map(c => c.codigo === scannedData ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const handleRemove = (index) => {
    setCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    Alert.alert('Limpiar', '¿Deseas limpiar el presupuesto actual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar', style: 'destructive', onPress: () => setCarrito([]) }
    ]);
  };

  const sendWhatsApp = () => {
    if (carrito.length === 0) return;
    const cleanPhone = telefonoCli.replace(/\D/g, "");
    if (!cleanPhone) {
      Alert.alert('Error', 'Ingresa el número de WhatsApp del cliente.');
      return;
    }

    let msg = `*¡Hola ${nombreCli || 'Cliente'}!* Presupuesto detallado:\n\n`;
    carrito.forEach(i => {
      msg += `• *${i.cantidad}x ${i.nombre}* : $${i.precio * i.cantidad}\n`;
    });
    msg += `\n*TOTAL: $${totalVenta}*\n\nGracias por elegirnos.`;

    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Asegúrate de tener WhatsApp instalado en tu dispositivo.');
    });
  };

  const totalVenta = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <Text style={styles.cardSubtitle}>{item.cantidad} x ${item.precio}</Text>
      </View>
      <View style={styles.cardActions}>
        <Text style={styles.cardTotal}>${item.precio * item.cantidad}</Text>
        <TouchableOpacity onPress={() => handleRemove(index)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Scanner onScan={handleScan} />

      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>TOTAL PRESUPUESTO</Text>
        <Text style={styles.totalAmount}>${totalVenta}</Text>
      </View>

      <View style={styles.clientForm}>
        <TextInput 
          style={styles.input} 
          value={nombreCli} 
          onChangeText={setNombreCli} 
          placeholder="Nombre del Cliente" 
          placeholderTextColor="#64748b" 
        />
        <TextInput 
          style={styles.input} 
          value={telefonoCli} 
          onChangeText={setTelefonoCli} 
          placeholder="WhatsApp (Ej: 54911...)" 
          keyboardType="phone-pad"
          placeholderTextColor="#64748b" 
        />
      </View>

      <FlatList 
        data={carrito}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>LIMPIAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.wsBtn} onPress={sendWhatsApp}>
          <Text style={styles.wsBtnText}>📲 WHATSAPP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  totalBox: {
    backgroundColor: '#0f172a',
    margin: 16,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)', // indigo-500/30
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  totalLabel: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  totalAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  clientForm: {
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(49, 46, 129, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
  cardTotal: {
    color: '#818cf8',
    fontWeight: '900',
    fontSize: 16,
    marginRight: 16,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: '#64748b',
    fontSize: 18,
  },
  footerRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  clearBtnText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 12,
  },
  wsBtn: {
    flex: 1,
    backgroundColor: '#16a34a', // green-600
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  wsBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  }
});
