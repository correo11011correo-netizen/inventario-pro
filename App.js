import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

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
    <>
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
              backgroundColor: '#0f172a',
              borderTopWidth: 1,
              borderTopColor: '#1e293b',
              paddingBottom: 5,
              height: 60,
            },
            tabBarLabelStyle: {
              fontWeight: 'bold',
              fontSize: 10,
              textTransform: 'uppercase',
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
    </>
  );
}
