import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'inv_pro_v5_native';

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
