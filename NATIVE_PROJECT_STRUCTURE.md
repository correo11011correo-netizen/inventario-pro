# Documentación Técnica: Inventario Pro Nativo (v5.0)

Este documento sirve como guía para agentes de IA y desarrolladores sobre la arquitectura y funcionamiento de la versión nativa de Inventario Pro.

## 📌 Descripción General
Aplicación móvil nativa para Android/iOS construida con **React Native** y **Expo**. Especializada en la gestión de stock mediante escaneo de códigos de barras de alta velocidad y generación de presupuestos para WhatsApp.

## 🛠 Stack Tecnológico
- **Framework:** React Native (Expo SDK 51+)
- **Navegación:** React Navigation (Bottom Tabs)
- **Cámara/Escáner:** `expo-camera` (EAS Native Module)
- **Almacenamiento:** `@react-native-async-storage/async-storage` (Persistencia local)
- **Iconos:** `@expo/vector-icons` (Ionicons)
- **Estilos:** `StyleSheet` (Estandar nativo con diseño inspirado en TailwindCSS)

## 📂 Estructura de Archivos Clave
- `App.js`: Punto de entrada, configuración del tema oscuro y navegación por pestañas.
- `/screens`:
    - `StockScreen.js`: Lógica de CRUD (Crear, Leer, Actualizar, Borrar) del inventario.
    - `VentasScreen.js`: Gestión del carrito de compras y cálculo de totales.
- `/components`:
    - `Scanner.js`: Componente de cámara reutilizable con lógica de detección de códigos EAN13 y feedback visual ("Verificado").
- `/utils`:
    - `storage.js`: Capa de abstracción para la base de datos local (AsyncStorage).
- `/assets`: Contiene los iconos y la pantalla de carga (Splash Screen) en formato PNG.

## 🔄 Flujo de Datos
1. **Persistencia:** Todos los datos se guardan en una clave única `inv_pro_v5_native` en el almacenamiento del teléfono.
2. **Sincronización:** Las pantallas usan el hook `useFocusEffect` o listeners de navegación para recargar los datos del almacenamiento cada vez que el usuario cambia de pestaña, asegurando que el inventario esté siempre actualizado.
3. **Escaneo:** El componente `Scanner` emite un evento `onScan(data)` que las pantallas capturan para autocompletar formularios o agregar productos al carrito.

## 🚀 Guía de Desarrollo (Fast Refresh)
Para trabajar en este proyecto en tiempo real:
1. `cd inventario-pro-nativo`
2. `npx expo start --tunnel`
3. Escanear el QR con la app **Expo Go**.

## 📦 Compilación de APK (EAS Build)
La configuración de compilación reside en `eas.json`. Para generar un nuevo APK:
```bash
npx eas build --platform android --profile preview --non-interactive
```

## ⚠️ Notas para futuras IAs
- **Escáner:** No intentar reemplazar `expo-camera` por librerías web; el rendimiento nativo es crítico para este proyecto.
- **WhatsApp:** El formato del mensaje en `VentasScreen.js` utiliza `encodeURIComponent` para asegurar que los emojis y saltos de línea lleguen correctamente a la app de destino.
- **Diseño:** Mantener el esquema de colores "Slate-950" y "Indigo-500" para consistencia con la marca original.
