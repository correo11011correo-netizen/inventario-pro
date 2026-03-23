# 🛰️ Guía de Servidor Centralizado StockPro (v11)

Este código permite que Google Apps Script actúe como un **servidor de base de datos** para tu Dashboard de GitHub Pages y tus Apps Android.

## 1. Código del Script (Copiar y Pegar en Apps Script)

```javascript
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var data = JSON.parse(e.postData.contents);
    
    // Si no hay encabezados, los crea
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Fecha", "Tipo", "Usuario", "Detalle", "ID Dispositivo", "Nombre"]);
    }

    sheet.appendRow([
      new Date(), 
      data.tipo, 
      data.usuario, 
      data.detalle, 
      data.deviceId,
      data.deviceName
    ]);
    
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    return ContentService.createTextOutput("ERROR: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  // Convertir filas en objetos JSON (saltando encabezado)
  for (var i = 1; i < data.length; i++) {
    result.push({
      fecha: data[i][0],
      tipo: data[i][1],
      usuario: data[i][2],
      detalle: data[i][3],
      deviceId: data[i][4],
      deviceName: data[i][5]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify(result.reverse()))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 2. Instrucciones Críticas de Implementación
1. Implementar como **Aplicación Web**.
2. **"Ejecutar como: Yo"** (tu cuenta de Google).
3. **"Quién tiene acceso: Cualquier persona"**.
4. **IMPORTANTE:** Cada vez que cambies el código en el script, debes hacer una "Nueva Implementación" o "Editar Implementación" -> "Versión: Nueva" para que los cambios surtan efecto.
