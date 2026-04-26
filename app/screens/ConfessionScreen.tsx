import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConfessionModal } from '../components/ConfessionModal';
import { useTaskStore } from '../store/useTaskStore';
import type { ConfessionEntry } from '../types/ai';

export function ConfessionScreen() {
  const confessions = useTaskStore((s) => s.confessions);
  const addConfession = useTaskStore((s) => s.addConfession);
  const [modal, setModal] = useState(false);

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Confessions</Text>
      <Text style={styles.sub}>
        Log slips here. They feed GrindMode&apos;s next-day plan.
      </Text>
      <Pressable style={styles.addBtn} onPress={() => setModal(true)}>
        <Text style={styles.addText}>+ Open confession</Text>
      </Pressable>
      <FlatList<ConfessionEntry>
        data={[...confessions].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No confessions yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.type}>{item.type}</Text>
              <Text style={styles.sev}>{item.severity}</Text>
            </View>
            <Text style={styles.details}>{item.details}</Text>
            <Text style={styles.date}>{item.createdAt}</Text>
          </View>
        )}
      />
      <ConfessionModal
        visible={modal}
        onClose={() => setModal(false)}
        onSubmit={(p) => addConfession(p)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  sub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 16,
  },
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  addText: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: '600',
  },
  list: { paddingBottom: 32, flexGrow: 1 },
  empty: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 24,
  },
  row: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  type: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  sev: { color: '#EAB308', fontSize: 13 },
  details: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  date: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
  },
});
