import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import StockScreen from './screens/StockScreen';
import VentasScreen from './screens/VentasScreen';

const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#020617', // slate-950
    card: '#0f172a',       // slate-900
    text: '#ffffff',
    border: '#1e293b',     // slate-800
    primary: '#6366f1',    // indigo-500
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <NavigationContainer theme={MyTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: '#0f172a',
              borderBottomWidth: 1,
              borderBottomColor: '#1e293b',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '900',
              textTransform: 'uppercase',
              fontSize: 14,
              letterSpacing: 1,
              color: '#818cf8',
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Stock') {
                iconName = focused ? 'cube' : 'cube-outline';
              } else if (route.name === 'Ventas') {
                iconName = focused ? 'cart' : 'cart-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: '#64748b',
            tabBarStyle: {
              position: 'absolute', // La barra flotará sobre la pantalla
              bottom: 20,           // La subimos 20 unidades desde el fondo
              left: 20,             // La separamos de los bordes laterales
              right: 20,
              backgroundColor: '#0f172a',
              borderRadius: 25,     // Esquinas muy redondeadas para que parezca una isla
              height: 70,
              elevation: 10,        // Sombra para que se note que está por encima
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 15,
              borderTopWidth: 0,    // Quitamos la línea molesta de arriba
              paddingBottom: 0,     // Ya no necesitamos padding inferior porque flota
            },
            tabBarLabelStyle: {
              fontWeight: '900',
              fontSize: 10,
              textTransform: 'uppercase',
              marginBottom: 10,     // Subimos un poco el texto
            },
            tabBarIconStyle: {
              marginTop: 5,         // Bajamos un poco el icono
            }
          })}
        >
          <Tab.Screen 
            name="Stock" 
            component={StockScreen} 
            options={{ title: '📦 GESTIÓN DE STOCK' }} 
          />
          <Tab.Screen 
            name="Ventas" 
            component={VentasScreen} 
            options={{ title: '🛒 PRESUPUESTOS' }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
