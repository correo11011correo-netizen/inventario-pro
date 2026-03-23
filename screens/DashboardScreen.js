import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { getInventario, getVentas } from '../utils/storage';
import { LineChart } from 'react-native-chart-kit';
import { getInventario, getVentas, getUsuarioActivo } from '../utils/storage';

export default function DashboardScreen({ navigation }) {
  const [role, setRole] = useState('empleado');
  const [stats, setStats] = useState({
    // ... mismo estado ...
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadStats);
    return unsubscribe;
  }, [navigation]);

  const loadStats = async () => {
    const r = await getUsuarioActivo();
    setRole(r);
    if (r !== 'dueño') return;

    const inventario = await getInventario();
    // ... resto de lógica de cálculo ...
  };

  if (role !== 'dueño') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <Ionicons name="lock-closed" size={64} color="#1e293b" />
        <Text style={{ color: '#fff', fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
          ACCESO RESTRINGIDO
        </Text>
        <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 10, fontSize: 12 }}>
          Solo el administrador puede ver las estadísticas de ganancia y rendimiento.
        </Text>
      </View>
    );
  }

    // Calcular facturación total
    const total = ventas.reduce((acc, v) => acc + v.total, 0);
    
    // Ganancia estimada (asumiendo 30% de margen si no hay costo definido)
    const ganancia = total * 0.3;

    // Productos bajo stock (menos de 5 unidades)
    const criticos = inventario.filter(i => i.cantidad < 5).slice(0, 3);

    // Top Productos (Simplificado)
    const conteo = {};
    ventas.forEach(v => {
      v.items.forEach(item => {
        conteo[item.nombre] = (conteo[item.nombre] || 0) + item.cantidad;
      });
    });
    const top = Object.entries(conteo)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([nombre, cant]) => ({ nombre, cant }));

    setStats({
      totalFacturado: total,
      gananciaEstimada: ganancia,
      topProductos: top,
      bajoStock: criticos,
      ventasRecientes: ventas.slice(-5).reverse()
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>RESUMEN GENERAL</Text>
      
      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Ionicons name="cash" size={20} color="#4ade80" />
          <Text style={styles.cardLabel}>FACTURADO</Text>
          <Text style={styles.cardValue}>${stats.totalFacturado.toLocaleString()}</Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Ionicons name="trending-up" size={20} color="#818cf8" />
          <Text style={styles.cardLabel}>GANANCIA (EST.)</Text>
          <Text style={styles.cardValue}>${stats.gananciaEstimada.toLocaleString()}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>MÁS VENDIDOS</Text>
      <View style={styles.card}>
        {stats.topProductos.length > 0 ? stats.topProductos.map((p, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.listText}>{p.nombre}</Text>
            <Text style={styles.listValue}>{p.cant} u.</Text>
          </View>
        )) : <Text style={styles.emptyText}>Sin ventas aún</Text>}
      </View>

      <Text style={styles.sectionTitle}>⚠️ ALERTAS DE STOCK</Text>
      <View style={[styles.card, { borderColor: '#ef444433' }]}>
        {stats.bajoStock.length > 0 ? stats.bajoStock.map((p, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={[styles.listText, { color: '#f87171' }]}>{p.nombre}</Text>
            <Text style={styles.listValue}>{p.cantidad} disp.</Text>
          </View>
        )) : <Text style={styles.emptyText}>Stock saludable ✅</Text>}
      </View>

      <Text style={styles.sectionTitle}>RENDIMIENTO SEMANAL</Text>
      <LineChart
        data={{
          labels: ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"],
          datasets: [{ data: [20, 45, 28, 80, 99, 43, 50] }]
        }}
        width={Dimensions.get("window").width - 32}
        height={180}
        chartConfig={{
          backgroundColor: "#0f172a",
          backgroundGradientFrom: "#0f172a",
          backgroundGradientTo: "#1e293b",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          propsForDots: { r: "4", strokeWidth: "2", stroke: "#818cf8" }
        }}
        bezier
        style={styles.chart}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, paddingBottom: 100 },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12, marginTop: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#0f172a', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginBottom: 8 },
  halfCard: { width: '48%' },
  cardLabel: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold', marginTop: 8 },
  cardValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  listText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  listValue: { color: '#818cf8', fontWeight: 'bold' },
  emptyText: { color: '#475569', textAlign: 'center', fontSize: 12, paddingVertical: 10 },
  chart: { marginVertical: 8, borderRadius: 16 }
});
