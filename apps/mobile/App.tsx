import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import type { Strategy } from '@oblique/shared';
import { generateId } from '@oblique/shared';

export default function App() {
  const strategy: Strategy = {
    id: generateId(),
    text: 'Honor thy error as a hidden intention',
    category: 'perspective',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oblique Strategies</Text>
      <Text style={styles.strategy}>{strategy.text}</Text>
      <Text style={styles.id}>ID: {strategy.id}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  strategy: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  id: {
    fontSize: 12,
    color: '#666',
  },
});
