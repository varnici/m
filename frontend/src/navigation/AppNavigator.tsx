import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import InventoryForm from '../components/InventoryForm';
import InventoryList from '../components/InventoryList';
import InventorySummary from '../components/InventorySummary';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Add Item" component={InventoryForm} />
        <Tab.Screen name="Inventory" component={InventoryList} />
        <Tab.Screen name="Summary" component={InventorySummary} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
