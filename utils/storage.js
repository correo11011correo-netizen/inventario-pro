import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'inv_pro_v5_native';
const SALES_KEY = 'inv_pro_sales_v1';

export const getInventario = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Error leyendo inventario', e);
    return [];
  }
};

export const saveInventario = async (inventario) => {
  try {
    const jsonValue = JSON.stringify(inventario);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error('Error guardando inventario', e);
  }
};

export const getVentas = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(SALES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    return [];
  }
};

export const saveVenta = async (nuevaVenta) => {
  try {
    const ventas = await getVentas();
    ventas.push({ ...nuevaVenta, fecha: new Date().toISOString() });
    await AsyncStorage.setItem(SALES_KEY, JSON.stringify(ventas));
  } catch (e) {
    console.error('Error guardando venta', e);
  }
};
