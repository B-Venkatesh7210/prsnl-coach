import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { generateWeeklyReport } from '../services/aiService';
import { useTaskStore } from '../store/useTaskStore';
import type { WeeklyReport } from '../types/weekly';

type Props = { onBack: () => void };

export function WeeklyReportScreen({ onBack }: Props) {
  const dailyStats = useTaskStore((s) => s.dailyStats);
  const confessions = useTaskStore((s) => s.confessions);
  const weight = useTaskStore((s) => s.currentWeightKg);
  const setWeight = useTaskStore((s) => s.setCurrentWeight);
  const setReport = useTaskStore((s) => s.setLastWeeklyReport);
  const cached = useTaskStore((s) => s.lastWeeklyReport);

  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState<WeeklyReport | null>(null);
  const [wInput, setWInput] = useState(
    weight != null ? String(weight) : ''
  );

  const run = () => {
    setLoading(true);
    void (async () => {
      const end = dayjs().endOf('day');
      const days: { date: string; completion: number; isLeave: boolean }[] =
        [];
      for (let i = 6; i >= 0; i--) {
        const d = end.subtract(i, 'day').format('YYYY-MM-DD');
        const s = dailyStats[d];
        days.push({
          date: d,
          completion: s?.isLeave ? 0 : (s?.completion ?? 0),
          isLeave: s?.isLeave ?? false,
        });
      }
      const startC = end.subtract(6, 'day').startOf('day');
      const conf = confessions.filter((c) =>
        dayjs(c.createdAt).isAfter(startC.subtract(1, 'second'))
      );
      const kg = wInput.trim() ? parseFloat(wInput.replace(',', '.')) : NaN;
      const weightKg = Number.isFinite(kg) ? kg : null;
      if (Number.isFinite(kg)) setWeight(kg);

      const ctx = {
        last7Days: days,
        confessions: conf.map((c) => ({
          type: c.type,
          details: c.details,
          severity: c.severity,
          createdAt: c.createdAt,
        })),
        weightKg,
      };
      const res = await generateWeeklyReport(ctx);
      setLocal(res);
      setReport(res);
      setLoading(false);
    })();
  };

  const display = local ?? cached;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Text style={styles.title}>Weekly Report</Text>
        <View style={{ width: 72 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Weight (kg, optional)</Text>
        <TextInput
          style={styles.input}
          value={wInput}
          onChangeText={setWInput}
          placeholder="90"
          placeholderTextColor="#666"
          keyboardType="decimal-pad"
        />
        <Pressable
          style={[styles.run, loading && { opacity: 0.6 }]}
          onPress={run}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.runT}>Get Coach Feedback</Text>
          )}
        </Pressable>

        {display != null ? (
          <View style={styles.block}>
            <Text style={styles.h}>Summary</Text>
            <Text style={styles.bold}>{display.summary}</Text>
            <Text style={styles.h2}>Improvements</Text>
            {display.improvements.map((x, i) => (
              <Text key={i} style={styles.li}>
                • {x}
              </Text>
            ))}
            <Text style={styles.h2}>Next strategy</Text>
            <Text style={styles.strat}>{display.next_strategy}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>
            Run the reality check to see your week.
          </Text>
        )}
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
  label: { color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    color: '#FFF',
    marginBottom: 16,
  },
  run: {
    backgroundColor: '#EAB308',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  runT: { color: '#0D0D0D', fontWeight: '700', fontSize: 16 },
  block: { marginTop: 8 },
  h: { color: '#EAB308', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  bold: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 16,
  },
  h2: { color: 'rgba(255,255,255,0.75)', marginTop: 8, marginBottom: 6 },
  li: { color: 'rgba(255,255,255,0.9)', marginBottom: 4, lineHeight: 22 },
  strat: { color: 'rgba(255,255,255,0.9)', lineHeight: 22, fontSize: 15 },
  hint: { color: 'rgba(255,255,255,0.4)' },
});
