import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useEvent,
  useSharedValue,
  withSpring,
  type ReanimatedEvent,
} from 'react-native-reanimated';
import type { Task } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';

const SWIPE_TRIGGER = 72;

const COMPLETE_TINT = 'rgba(34, 197, 94, 0.25)';
const MISS_TINT = 'rgba(248, 113, 113, 0.25)';

type TaskCardProps = {
  task: Task;
  dimmed?: boolean;
  interactive: boolean;
};

export function TaskCard({ task, dimmed, interactive }: TaskCardProps) {
  const translateX = useSharedValue(0);
  const completeTask = useTaskStore((s) => s.completeTask);
  const missTask = useTaskStore((s) => s.missTask);

  const onComplete = useCallback(() => {
    completeTask(task.id);
  }, [completeTask, task.id]);

  const onMiss = useCallback(() => {
    missTask(task.id);
  }, [missTask, task.id]);

  const onGesture = useEvent(
    (e: ReanimatedEvent<PanGestureHandlerGestureEvent>) => {
      'worklet';
      translateX.value = e.translationX;
    },
    ['onGestureEvent']
  );

  const onStateChange = useEvent(
    (e: ReanimatedEvent<PanGestureHandlerStateChangeEvent>) => {
      'worklet';
      if (e.state === State.END) {
        const t = e.translationX;
        if (t > SWIPE_TRIGGER) {
          runOnJS(onComplete)();
        } else if (t < -SWIPE_TRIGGER) {
          runOnJS(onMiss)();
        }
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      } else if (e.state === State.CANCELLED || e.state === State.FAILED) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    },
    ['onHandlerStateChange']
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const underlay = useAnimatedStyle(() => {
    return {
      opacity: Math.min(1, Math.abs(translateX.value) / SWIPE_TRIGGER),
    };
  });

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.underLeft, underlay]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.underRight, underlay]}
      />
      <PanGestureHandler
        onGestureEvent={onGesture}
        onHandlerStateChange={onStateChange}
        activeOffsetX={[-12, 12]}
        enabled={interactive}
      >
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            dimmed && styles.cardDimmed,
            !interactive && styles.cardNonInteractive,
          ]}
        >
          <Text style={[styles.title, dimmed && styles.textDimmed]}>
            {task.title}
          </Text>
          <Text style={[styles.time, dimmed && styles.textDimmed]}>
            {task.time}
          </Text>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    position: 'relative',
  },
  underLeft: {
    ...StyleSheet.absoluteFillObject,
    right: '50%' as const,
    backgroundColor: COMPLETE_TINT,
    borderRadius: 12,
  },
  underRight: {
    ...StyleSheet.absoluteFillObject,
    left: '50%' as const,
    backgroundColor: MISS_TINT,
    borderRadius: 12,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  cardDimmed: {
    opacity: 0.55,
  },
  cardNonInteractive: {
    opacity: 0.55,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 6,
    opacity: 0.9,
  },
  textDimmed: {
    opacity: 0.7,
  },
});
