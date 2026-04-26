import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { HomeScreen } from './app/screens/HomeScreen';
import { useTaskStore } from './app/store/useTaskStore';
import { generateDailyTasks } from './app/utils/routineGenerator';
import { loadTasksFromStorage, saveTasksToStorage } from './app/utils/storage';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadTasksFromStorage();
      if (cancelled) return;

      const hasAny =
        loaded != null &&
        (loaded.tasks.length > 0 ||
          loaded.completedTasks.length > 0 ||
          loaded.missedTasks.length > 0);

      if (hasAny && loaded) {
        useTaskStore.setState({
          ...loaded,
          confessions: loaded.confessions ?? [],
          lockIn: loaded.lockIn ?? false,
          tomorrowAdjustments: loaded.tomorrowAdjustments ?? [],
          dailyStats: loaded.dailyStats ?? {},
          lastDiet: loaded.lastDiet ?? null,
          groceryList: loaded.groceryList ?? [],
          currentWeightKg:
            loaded.currentWeightKg === undefined
              ? null
              : loaded.currentWeightKg,
          lastWeeklyReport: loaded.lastWeeklyReport ?? null,
        });
      } else {
        const fresh = generateDailyTasks();
        useTaskStore.setState({
          tasks: fresh,
          completedTasks: [],
          missedTasks: [],
          confessions: [],
          lockIn: false,
          tomorrowAdjustments: [],
          dailyStats: {},
          lastDiet: null,
          groceryList: [],
          currentWeightKg: null,
          lastWeeklyReport: null,
        });
        await saveTasksToStorage({
          tasks: fresh,
          completedTasks: [],
          missedTasks: [],
          confessions: [],
          lockIn: false,
          tomorrowAdjustments: [],
          dailyStats: {},
          lastDiet: null,
          groceryList: [],
          currentWeightKg: null,
          lastWeeklyReport: null,
        });
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    return useTaskStore.subscribe((state) => {
      void saveTasksToStorage({
        tasks: state.tasks,
        completedTasks: state.completedTasks,
        missedTasks: state.missedTasks,
        confessions: state.confessions,
        lockIn: state.lockIn,
        tomorrowAdjustments: state.tomorrowAdjustments,
        dailyStats: state.dailyStats,
        lastDiet: state.lastDiet,
        groceryList: state.groceryList,
        currentWeightKg: state.currentWeightKg,
        lastWeeklyReport: state.lastWeeklyReport,
      });
    });
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.inner}>
        {ready ? <HomeScreen /> : null}
        <StatusBar style="light" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  inner: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
});
