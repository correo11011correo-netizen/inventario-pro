import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'inv_pro_v5_native';
const SALES_KEY = 'inv_pro_sales_v1';
const CAJA_KEY = 'inv_pro_caja_v1';
const AUDIT_KEY = 'inv_pro_audit_v1';

// --- USUARIOS ---
export const getUsuarioActivo = async () => {
  const user = await AsyncStorage.getItem('user_role');
  return user || 'dueño'; // Por defecto dueño para configuración inicial
};

export const setUsuarioActivo = async (role) => {
  await AsyncStorage.setItem('user_role', role);
};

// --- CAJA Y TURNOS ---
export const getCajaEstado = async () => {
  const data = await AsyncStorage.getItem(CAJA_KEY);
  return data ? JSON.parse(data) : { abierta: false, efectivoInicial: 0, ventasTurno: 0 };
};

export const abrirCaja = async (monto) => {
  const estado = { abierta: true, efectivoInicial: monto, ventasTurno: 0, horaApertura: new Date().toISOString() };
  await AsyncStorage.setItem(CAJA_KEY, JSON.stringify(estado));
  await registrarAuditoria('APERTURA_CAJA', `Monto inicial: $${monto}`);
};

export const cerrarCaja = async (montoReal) => {
  const estado = await getCajaEstado();
  const resumen = { ...estado, abierta: false, montoCierreReal: montoReal, horaCierre: new Date().toISOString() };
  await AsyncStorage.setItem(CAJA_KEY, JSON.stringify(resumen));
  await registrarAuditoria('CIERRE_CAJA', `Esperado: $${estado.efectivoInicial + estado.ventasTurno}, Real: $${montoReal}`);
  return resumen;
};

// --- AUDITORÍA (ANTI-ROBO) ---
export const registrarAuditoria = async (accion, detalle) => {
  try {
    const logs = JSON.parse(await AsyncStorage.getItem(AUDIT_KEY) || '[]');
    const user = await getUsuarioActivo();
    logs.push({ fecha: new Date().toISOString(), user, accion, detalle });
    await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(-500))); // Guardamos últimos 500 movimientos
  } catch (e) { console.error(e); }
};

// --- INVENTARIO (CON AUDITORÍA) ---
export const getInventario = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) { return []; }
};

export const saveInventario = async (inventario, esEdicionManual = false) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(inventario));
    if (esEdicionManual) await registrarAuditoria('MODIFICACION_STOCK', 'Cambio manual en la lista de productos');
  } catch (e) { console.error(e); }
};

// --- VENTAS ---
export const getVentas = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(SALES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) { return []; }
};

export const saveVenta = async (nuevaVenta) => {
  try {
    const ventas = await getVentas();
    const ventaFinal = { ...nuevaVenta, fecha: new Date().toISOString() };
    ventas.push(ventaFinal);
    await AsyncStorage.setItem(SALES_KEY, JSON.stringify(ventas));
    
    // Actualizar caja del turno
    const caja = await getCajaEstado();
    if (caja.abierta) {
      caja.ventasTurno += nuevaVenta.total;
      await AsyncStorage.setItem(CAJA_KEY, JSON.stringify(caja));
    }
  } catch (e) { console.error('Error guardando venta', e); }
};
