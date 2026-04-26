import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { generateGroceryList } from '../services/aiService';
import { useTaskStore } from '../store/useTaskStore';

type Props = { onBack: () => void };

export function GroceryScreen({ onBack }: Props) {
  const lastDiet = useTaskStore((s) => s.lastDiet);
  const groceryList = useTaskStore((s) => s.groceryList);
  const importGroceryFromAI = useTaskStore((s) => s.importGroceryFromAI);
  const toggleGroceryBought = useTaskStore((s) => s.toggleGroceryBought);
  const [loading, setLoading] = useState(false);

  const build = () => {
    if (!lastDiet) return;
    setLoading(true);
    void (async () => {
      const items = await generateGroceryList(lastDiet);
      importGroceryFromAI(items);
      setLoading(false);
    })();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Text style={styles.title}>Grocery</Text>
        <View style={{ width: 72 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!lastDiet ? (
          <Text style={styles.warn}>
            Generate a diet plan on Home (Confess) first, then build your list
            here.
          </Text>
        ) : (
          <Pressable
            style={[styles.run, (!lastDiet || loading) && { opacity: 0.5 }]}
            onPress={build}
            disabled={!lastDiet || loading}
          >
            {loading ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.runT}>Build list from last diet (AI)</Text>
            )}
          </Pressable>
        )}
        {groceryList.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.row, g.bought && styles.rowBought]}
            onPress={() => toggleGroceryBought(g.id)}
          >
            <Text style={[styles.name, g.bought && styles.ticked]}>
              {g.bought ? '✓ ' : '○ '}
              {g.name}
            </Text>
            <Text style={styles.qty}>{g.quantity}</Text>
          </Pressable>
        ))}
        {groceryList.length === 0 && lastDiet ? (
          <Text style={styles.hint}>
            Tap the button to generate a checklist.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0D0D', paddingTop: 48 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  back: { color: '#EAB308', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  warn: { color: 'rgba(255,255,255,0.55)', marginBottom: 12 },
  run: {
    backgroundColor: '#EAB308',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  runT: { color: '#0D0D0D', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    marginBottom: 8,
  },
  rowBought: { opacity: 0.5 },
  name: { color: '#FFF', flex: 1, fontSize: 15 },
  ticked: { textDecorationLine: 'line-through' },
  qty: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginLeft: 8 },
  hint: { color: 'rgba(255,255,255,0.4)' },
});
