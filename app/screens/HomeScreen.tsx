import {
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { TaskCard } from '../components/TaskCard';
import { useTaskStore } from '../store/useTaskStore';
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

export function HomeScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const completedTasks = useTaskStore((s) => s.completedTasks);
  const missedTasks = useTaskStore((s) => s.missedTasks);
  const sections = buildSections(tasks, completedTasks, missedTasks);

  const renderItem: SectionListRenderItem<Task, Section> = ({ item, section }) => (
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

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>GrindMode</Text>
      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={styles.empty}>No tasks for today yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 48,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
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
