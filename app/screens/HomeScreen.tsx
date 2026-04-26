import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CravingModal } from '../components/CravingModal';
import { TaskCard } from '../components/TaskCard';
import { ConfessionModal } from '../components/ConfessionModal';
import { CalendarScreen } from './CalendarScreen';
import { CoachScreen } from './CoachScreen';
import { GroceryScreen } from './GroceryScreen';
import { WeeklyReportScreen } from './WeeklyReportScreen';
import { generateNextDayDiet } from '../services/aiService';
import {
  cancelAllNotifications,
  requestNotificationPermission,
  scheduleDailyNotifications,
} from '../services/notificationService';
import { useTaskStore } from '../store/useTaskStore';
import type { AIResponse } from '../types/ai';
import type { Task } from '../types/task';

dayjs.extend(customParseFormat);

const TIME_FMT = 'h:mm A';

type Section = {
  title: string;
  data: Task[];
  showCompletedStyle: boolean;
  interactive: boolean;
};

function sortByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ha = dayjs(a.time, TIME_FMT, true);
    const hb = dayjs(b.time, TIME_FMT, true);
    const aMin = ha.isValid() ? ha.hour() * 60 + ha.minute() : 0;
    const bMin = hb.isValid() ? hb.hour() * 60 + hb.minute() : 0;
    if (aMin !== bMin) return aMin - bMin;
    return a.id.localeCompare(b.id);
  });
}

function buildSections(
  tasks: Task[],
  completed: Task[],
  missed: Task[]
): Section[] {
  const finished = sortByTime([...completed, ...missed]);
  const pending: Section = {
    title: 'Pending',
    data: tasks,
    showCompletedStyle: false,
    interactive: true,
  };
  const done: Section = {
    title: 'Completed',
    data: finished,
    showCompletedStyle: true,
    interactive: false,
  };
  if (finished.length === 0) {
    return [pending];
  }
  return [pending, done];
}

function buildCompletionContext() {
  const st = useTaskStore.getState();
  const lastMeals = st.completedTasks
    .filter((t) => t.type === 'meal')
    .map((t) => `${t.title} at ${t.time}`);
  const confessions = st.confessions.map((c) => ({
    type: c.type,
    details: c.details,
    severity: c.severity,
  }));
  const total =
    st.tasks.length + st.completedTasks.length + st.missedTasks.length;
  const completionPercentage =
    total === 0
      ? 0
      : Math.round((100 * st.completedTasks.length) / total);
  return {
    lastMeals,
    confessions,
    completionPercentage,
    currentWeightKg: st.currentWeightKg,
  };
}

export function HomeScreen() {
  const [view, setView] = useState<
    'home' | 'coach' | 'calendar' | 'weekly' | 'grocery'
  >('home');
  const tasks = useTaskStore((s) => s.tasks);
  const completedTasks = useTaskStore((s) => s.completedTasks);
  const missedTasks = useTaskStore((s) => s.missedTasks);
  const tomorrowAdjustments = useTaskStore((s) => s.tomorrowAdjustments);
  const addConfession = useTaskStore((s) => s.addConfession);
  const setLastDiet = useTaskStore((s) => s.setLastDiet);
  const setCompletion = useTaskStore((s) => s.setCompletion);
  const currentWeightKg = useTaskStore((s) => s.currentWeightKg);
  const setCurrentWeight = useTaskStore((s) => s.setCurrentWeight);
  const dietRecheckAfterWeight = useTaskStore((s) => s.dietRecheckAfterWeight);
  const clearDietRecheckAfterWeight = useTaskStore(
    (s) => s.clearDietRecheckAfterWeight
  );
  const [craveOpen, setCraveOpen] = useState(false);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState('');

  const sections = useMemo(
    () => buildSections(tasks, completedTasks, missedTasks),
    [tasks, completedTasks, missedTasks]
  );

  const [confessOpen, setConfessOpen] = useState(false);
  const [tomorrowPlan, setTomorrowPlan] = useState<AIResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await requestNotificationPermission();
      if (cancelled) return;
      const pending = useTaskStore.getState().tasks;
      await cancelAllNotifications();
      if (cancelled) return;
      if (allowed) {
        await scheduleDailyNotifications(pending);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks]);

  const todayKey = dayjs().format('YYYY-MM-DD');
  useEffect(() => {
    const st = useTaskStore.getState();
    if (st.dailyStats[todayKey]?.isLeave) return;
    const tot = st.tasks.length + st.completedTasks.length + st.missedTasks.length;
    if (tot === 0) return;
    const pct = Math.round((100 * st.completedTasks.length) / tot);
    setCompletion(todayKey, pct, st.completedTasks.length);
  }, [tasks, completedTasks, missedTasks, setCompletion, todayKey]);

  const handleConfessionSubmit = (payload: {
    type: string;
    details: string;
    severity: string;
  }) => {
    addConfession(payload);
    setAiLoading(true);
    void (async () => {
      const ctx = buildCompletionContext();
      const result = await generateNextDayDiet(ctx);
      setTomorrowPlan(result);
      setLastDiet(result.diet);
      clearDietRecheckAfterWeight();
      setAiLoading(false);
    })();
  };

  const runRegenerateDietOnly = () => {
    setAiLoading(true);
    void (async () => {
      const ctx = buildCompletionContext();
      const result = await generateNextDayDiet(ctx);
      setTomorrowPlan(result);
      setLastDiet(result.diet);
      clearDietRecheckAfterWeight();
      setAiLoading(false);
    })();
  };

  const openWeightModal = () => {
    setWeightDraft(
      currentWeightKg != null ? String(currentWeightKg) : ''
    );
    setWeightModalOpen(true);
  };

  const saveWeightFromModal = () => {
    const t = weightDraft.trim();
    if (t.length === 0) {
      setCurrentWeight(null);
      setWeightModalOpen(false);
      return;
    }
    const n = parseFloat(t.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n >= 500) {
      return;
    }
    setCurrentWeight(Math.round(n * 10) / 10);
    setWeightModalOpen(false);
  };

  const renderItem: SectionListRenderItem<Task, Section> = ({
    item,
    section,
  }) => (
    <TaskCard
      task={item}
      dimmed={section.showCompletedStyle}
      interactive={section.interactive}
    />
  );

  const keyExtractor = (item: Task) => item.id;

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<Task, Section>;
  }) => (
    <Text style={styles.sectionTitle}>
      {section.title === 'Pending' ? 'Pending tasks' : `${section.title} tasks`}
    </Text>
  );

  if (view === 'coach') {
    return <CoachScreen onBack={() => setView('home')} />;
  }
  if (view === 'calendar') {
    return <CalendarScreen onBack={() => setView('home')} />;
  }
  if (view === 'weekly') {
    return <WeeklyReportScreen onBack={() => setView('home')} />;
  }
  if (view === 'grocery') {
    return <GroceryScreen onBack={() => setView('home')} />;
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <Text style={styles.heading}>GrindMode</Text>
      <View style={styles.btnRow}>
        <Pressable
          style={styles.confessBtn}
          onPress={() => setConfessOpen(true)}
          accessibilityLabel="Open confession"
        >
          <Text style={styles.confessBtnText}>Confess 😈</Text>
        </Pressable>
        <Pressable
          style={styles.coachLink}
          onPress={() => setView('coach')}
          accessibilityLabel="Open coach"
        >
          <Text style={styles.coachLinkText}>Coach →</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={openWeightModal}
        style={styles.weightRow}
        accessibilityLabel="Edit current body weight"
      >
        <Text style={styles.weightLabel}>Current weight</Text>
        <Text style={styles.weightValue}>
          {currentWeightKg != null
            ? `${currentWeightKg} kg`
            : 'Tap to set (kg)'}
        </Text>
      </Pressable>
      {dietRecheckAfterWeight ? (
        <View style={styles.recheckBanner}>
          <Text style={styles.recheckText}>
            Your weight changed — refresh tomorrow&apos;s diet so targets match.
          </Text>
          <View style={styles.recheckRow}>
            <Pressable
              style={styles.recheckBtn}
              onPress={runRegenerateDietOnly}
              disabled={aiLoading}
            >
              <Text style={styles.recheckBtnT}>Update plan</Text>
            </Pressable>
            <Pressable
              style={styles.recheckBtnGhost}
              onPress={clearDietRecheckAfterWeight}
            >
              <Text style={styles.recheckBtnGhostT}>Not now</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={styles.btnRow2}>
        <Pressable
          style={styles.smallNav}
          onPress={() => setCraveOpen(true)}
        >
          <Text style={styles.smallNavT}>Craving 😈</Text>
        </Pressable>
        <Pressable
          style={styles.smallNav}
          onPress={() => setView('calendar')}
        >
          <Text style={styles.smallNavT}>Calendar 📅</Text>
        </Pressable>
        <Pressable
          style={styles.smallNav}
          onPress={() => setView('weekly')}
        >
          <Text style={styles.smallNavT}>Weekly Report 📉</Text>
        </Pressable>
        <Pressable
          style={styles.smallNav}
          onPress={() => setView('grocery')}
        >
          <Text style={styles.smallNavT}>Grocery</Text>
        </Pressable>
      </View>
      <View style={styles.focusSection}>
        <Text style={styles.focusTitle}>Tomorrow Focus</Text>
        {tomorrowAdjustments.length > 0 ? (
          tomorrowAdjustments.map((a, i) => (
            <Text key={i} style={styles.focusItem}>
              • {a}
            </Text>
          ))
        ) : (
          <Text style={styles.focusEmpty}>
            Get coach feedback to set micro-adjustments.
          </Text>
        )}
      </View>
      {aiLoading ? (
        <View style={styles.aiRow}>
          <ActivityIndicator color="#EAB308" />
          <Text style={styles.aiHint}>Shaping tomorrow&apos;s plan…</Text>
        </View>
      ) : null}
      <View style={styles.planSection}>
        <Text style={styles.planTitle}>Tomorrow&apos;s Plan</Text>
        {tomorrowPlan ? (
          <View>
            <Text style={styles.planLine}>
              <Text style={styles.k}>Pre workout: </Text>
              {tomorrowPlan.diet.pre_workout}
            </Text>
            <Text style={styles.planLine}>
              <Text style={styles.k}>Breakfast: </Text>
              {tomorrowPlan.diet.breakfast}
            </Text>
            <Text style={styles.planLine}>
              <Text style={styles.k}>Lunch: </Text>
              {tomorrowPlan.diet.lunch}
            </Text>
            <Text style={styles.planLine}>
              <Text style={styles.k}>Snack: </Text>
              {tomorrowPlan.diet.snack}
            </Text>
            <Text style={styles.planLine}>
              <Text style={styles.k}>Dinner: </Text>
              {tomorrowPlan.diet.dinner}
            </Text>
            {tomorrowPlan.adjustments.length > 0 ? (
              <View style={styles.adjBlock}>
                <Text style={styles.adjTitle}>Adjustments</Text>
                {tomorrowPlan.adjustments.map((a, i) => (
                  <Text key={i} style={styles.adjItem}>
                    • {a}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.planEmpty}>
            Confess to generate your next-day diet plan.
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={listHeader}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No tasks for today yet.</Text>
        }
      />
      <ConfessionModal
        visible={confessOpen}
        onClose={() => setConfessOpen(false)}
        onSubmit={handleConfessionSubmit}
      />
      <CravingModal
        visible={craveOpen}
        onClose={() => setCraveOpen(false)}
      />
      <Modal
        visible={weightModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setWeightModalOpen(false)}
      >
        <View style={styles.modOverlay}>
          <View style={styles.modCard}>
            <Text style={styles.modTitle}>Body weight (kg)</Text>
            <Text style={styles.modHint}>
              Used in diet and coach context. Clear field to remove.
            </Text>
            <TextInput
              value={weightDraft}
              onChangeText={setWeightDraft}
              keyboardType="decimal-pad"
              placeholder="e.g. 88.5"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.modInput}
            />
            <View style={styles.modBtns}>
              <Pressable
                style={styles.modCancel}
                onPress={() => setWeightModalOpen(false)}
              >
                <Text style={styles.modCancelT}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modSave} onPress={saveWeightFromModal}>
                <Text style={styles.modSaveT}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 48,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  headerBlock: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
  },
  confessBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 8,
  },
  confessBtnText: {
    color: '#EAB308',
    fontSize: 16,
    fontWeight: '600',
  },
  coachLink: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  coachLinkText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  weightRow: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  weightLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 4,
  },
  weightValue: { color: '#A7F3D0', fontSize: 16, fontWeight: '600' },
  recheckBanner: {
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.45)',
  },
  recheckText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  recheckRow: { flexDirection: 'row', flexWrap: 'wrap' },
  recheckBtn: {
    backgroundColor: '#EAB308',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
    marginBottom: 4,
  },
  recheckBtnT: { color: '#0D0D0D', fontWeight: '700', fontSize: 14 },
  recheckBtnGhost: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  recheckBtnGhostT: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  modOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  modHint: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 12 },
  modInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    color: '#FFF',
    fontSize: 16,
    padding: 12,
    marginBottom: 16,
  },
  modBtns: { flexDirection: 'row', justifyContent: 'flex-end' },
  modCancel: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 },
  modCancelT: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  modSave: {
    backgroundColor: '#EAB308',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modSaveT: { color: '#0D0D0D', fontSize: 16, fontWeight: '700' },
  btnRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  smallNav: {
    backgroundColor: '#151515',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  smallNavT: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
  focusSection: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  focusTitle: {
    color: '#EAB308',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  focusItem: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  focusEmpty: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aiHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  planSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  planLine: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  k: { fontWeight: '600', color: '#EAB308' },
  planEmpty: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
  },
  adjBlock: { marginTop: 8, marginBottom: 8 },
  adjTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 4,
  },
  adjItem: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  empty: {
    color: '#FFFFFF',
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 24,
  },
});
