import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LockInModal } from '../components/LockInModal';
import { generateDailyCoachFeedback } from '../services/aiService';
import { useTaskStore } from '../store/useTaskStore';
import type { CoachContextData, CoachResponse } from '../types/coach';

type CoachScreenProps = {
  onBack: () => void;
};

function buildCoachContext(): CoachContextData {
  const st = useTaskStore.getState();
  const total =
    st.tasks.length + st.completedTasks.length + st.missedTasks.length;
  const completionPercentage =
    total === 0
      ? 0
      : Math.round((100 * st.completedTasks.length) / total);
  const confessions = st.confessions.map((c) => ({
    type: c.type,
    details: c.details,
    severity: c.severity,
  }));
  return {
    completionPercentage,
    completedTasks: st.completedTasks,
    missedTasks: st.missedTasks,
    confessions,
  };
}

export function CoachScreen({ onBack }: CoachScreenProps) {
  const completedTasks = useTaskStore((s) => s.completedTasks);
  const missedTasks = useTaskStore((s) => s.missedTasks);
  const confessions = useTaskStore((s) => s.confessions);
  const setTomorrowAdjustments = useTaskStore((s) => s.setTomorrowAdjustments);
  const setLockIn = useTaskStore((s) => s.setLockIn);

  const tasks = useTaskStore((s) => s.tasks);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [lockOpen, setLockOpen] = useState(false);

  const total = tasks.length + completedTasks.length + missedTasks.length;
  const completionPct =
    total === 0
      ? 0
      : Math.round((100 * completedTasks.length) / total);

  const runFeedback = () => {
    setLoading(true);
    void (async () => {
      const ctx = buildCoachContext();
      const res = await generateDailyCoachFeedback(ctx);
      setResult(res);
      setTomorrowAdjustments(res.tomorrow_adjustments);
      setLoading(false);
      setTimeout(() => setLockOpen(true), 450);
    })();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Text style={styles.title}>Coach</Text>
        <View style={styles.topSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.k}>Completion</Text>
          <Text style={styles.v}>{completionPct}%</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.k}>Completed today</Text>
          <Text style={styles.v}>{completedTasks.length}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.k}>Missed</Text>
          <Text style={styles.v}>{missedTasks.length}</Text>
        </View>
        <Text style={styles.sectionTitle}>Confessions</Text>
        {confessions.length === 0 ? (
          <Text style={styles.muted}>None logged yet.</Text>
        ) : (
          confessions.map((c) => (
            <View key={c.id} style={styles.cRow}>
              <Text style={styles.cType}>{c.type} · {c.severity}</Text>
              <Text style={styles.cD}>{c.details}</Text>
            </View>
          ))
        )}

        <Pressable
          style={[styles.coachBtn, loading && styles.coachBtnOff]}
          onPress={runFeedback}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.coachBtnText}>Get Coach Feedback</Text>
          )}
        </Pressable>

        {result != null ? (
          <View style={styles.out}>
            <Text style={styles.outTitle}>Feedback</Text>
            <Text style={styles.feedbackBold}>{result.feedback}</Text>
            <Text style={styles.outTitle2}>Adjustments (tomorrow)</Text>
            {result.tomorrow_adjustments.map((a, i) => (
              <Text key={i} style={styles.adj}>
                • {a}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <LockInModal
        visible={lockOpen}
        onYes={() => {
          setLockIn(true);
          setLockOpen(false);
          onBack();
        }}
        onRequestClose={() => setLockOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0D0D0D', paddingTop: 48 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  back: { color: '#EAB308', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  topSpacer: { width: 72 },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  k: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 4 },
  v: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  muted: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  cRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  cType: { color: '#EAB308', fontSize: 13, marginBottom: 4 },
  cD: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  coachBtn: {
    backgroundColor: '#EAB308',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  coachBtnOff: { opacity: 0.7 },
  coachBtnText: { color: '#0D0D0D', fontSize: 16, fontWeight: '700' },
  out: { marginTop: 20, paddingBottom: 20 },
  outTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  outTitle2: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  feedbackBold: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  adj: { color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 22 },
});
