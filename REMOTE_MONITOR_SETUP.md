# 🛰️ Guía: Sistema de Monitoreo Remoto StockPro (v10)

Este documento detalla cómo configurar el servidor de logs en la nube para gestionar múltiples dispositivos de clientes.

## 1. Configuración de Google Apps Script (Servidor)
Para recibir logs de todos tus clientes en un Google Sheet, sigue estos pasos:

1. Crea una nueva **Hoja de Cálculo** en Google Sheets.
2. Ve a `Extensiones` -> `Apps Script`.
3. Borra todo y pega el siguiente código:

```javascript
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = JSON.parse(e.postData.contents);
  
  // Insertar Fila: Fecha, Tipo, Usuario, Detalle, Dispositivo
  sheet.appendRow([
    new Date(), 
    data.tipo, 
    data.usuario, 
    data.detalle, 
    data.device
  ]);
  
  return ContentService.createTextOutput("LOG_OK");
}
```

4. Haz clic en **"Implementar"** -> **"Nueva implementación"**.
5. Tipo: **Aplicación Web**.
6. Quién tiene acceso: **Cualquier persona**. (Esto es vital para que la app pueda enviar datos).
7. Copia la **URL de la aplicación web** (ej: `https://script.google.com/macros/s/.../exec`).

## 2. Conexión con la App (React Native)
En el archivo `App.js` del proyecto nativo, busca la variable `LOG_SERVER_URL` y pega la dirección que copiaste arriba:

```javascript
const LOG_SERVER_URL = "TU_URL_AQUI";
```

## 3. Visualización en GitHub Pages
He dejado el archivo `monitor_dashboard.html` en la raíz. Al activar GitHub Pages en tu repo, podrás acceder a `tu-usuario.github.io/inventario-pro/monitor_dashboard.html` para ver el estado de tus clientes.

---

## ⚠️ Nota para IAs de Automatización
Al actualizar este sistema, asegúrese de que la función `enviarLogRemoto` en la aplicación móvil siempre maneje los errores con un `try/catch` para que, si el servidor de logs falla, la aplicación del cliente siga funcionando normalmente.
