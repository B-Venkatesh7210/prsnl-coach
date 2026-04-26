import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { useTaskStore } from '../store/useTaskStore';

type CalendarScreenProps = { onBack: () => void };

const CELL = 40;

function heatmapColor(completion: number, isLeave: boolean): string {
  if (isLeave) return '#0D0D0D';
  if (completion <= 20) return '#D1FAE5';
  if (completion <= 50) return '#6EE7B7';
  if (completion <= 80) return '#10B981';
  return '#064E3B';
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildMonthGrid(anchor: dayjs.Dayjs): dayjs.Dayjs[] {
  const m = anchor.month();
  const y = anchor.year();
  const first = dayjs().year(y).month(m).date(1);
  const start = first.subtract(first.day(), 'day');
  const cells: dayjs.Dayjs[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(start.add(i, 'day'));
  }
  return cells;
}

export function CalendarScreen({ onBack }: CalendarScreenProps) {
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [pick, setPick] = useState<dayjs.Dayjs | null>(null);
  const dailyStats = useTaskStore((s) => s.dailyStats);
  const confessions = useTaskStore((s) => s.confessions);
  const setLeave = useTaskStore((s) => s.setLeave);
  const removeLeave = useTaskStore((s) => s.removeLeave);

  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const dayConfessions = (d: dayjs.Dayjs) =>
    confessions.filter((c) =>
      dayjs(c.createdAt).isSame(d, 'day')
    );

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Text style={styles.title}>Calendar</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setMonth((m) => m.subtract(1, 'month'))}
        >
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{month.format('MMMM YYYY')}</Text>
        <Pressable onPress={() => setMonth((m) => m.add(1, 'month'))}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.wd}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d) => {
          const inMonth = d.month() === month.month();
          const key = d.format('YYYY-MM-DD');
          const stat = dailyStats[key] ?? { completion: 0, isLeave: false };
          const bg = heatmapColor(stat.completion, stat.isLeave);
          return (
            <Pressable
              key={key}
              style={[
                styles.cell,
                { backgroundColor: bg, opacity: inMonth ? 1 : 0.3 },
                stat.isLeave && { borderWidth: 1, borderColor: '#FFF' },
              ]}
              onPress={() => setPick(d)}
            />
          );
        })}
      </View>
      <Text style={styles.legend}>
        0–20 very light → 80–100 dark green · black = leave
      </Text>

      <Modal visible={pick != null} transparent animationType="fade">
        <View style={styles.mBackdrop}>
          <View style={styles.mCard}>
            {pick != null ? (
              <>
                <Text style={styles.mTitle}>
                  {pick.format('YYYY-MM-DD')}
                </Text>
                {(() => {
                  const k = pick.format('YYYY-MM-DD');
                  const st = dailyStats[k] ?? {
                    completion: 0,
                    isLeave: false,
                  };
                  const done = st.tasksCompleted ?? 0;
                  const dc = dayConfessions(pick);
                  return (
                    <>
                      <Text style={styles.mLine}>
                        Completion: {st.isLeave ? '—' : `${st.completion}%`}
                      </Text>
                      <Text style={styles.mLine}>
                        Tasks done: {st.isLeave ? '—' : String(done)}
                      </Text>
                      <Text style={styles.mSub}>Confessions that day</Text>
                      {dc.length === 0 ? (
                        <Text style={styles.mMuted}>None</Text>
                      ) : (
                        dc.map((c) => (
                          <Text key={c.id} style={styles.mC}>
                            • {c.type}: {c.details}
                          </Text>
                        ))
                      )}
                      {st.isLeave ? (
                        <Pressable
                          style={styles.mBtn}
                          onPress={() => {
                            removeLeave(k);
                            setPick(null);
                          }}
                        >
                          <Text style={styles.mBtnT}>Remove leave</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.mBtnDark}
                          onPress={() => {
                            setLeave(k);
                            setPick(null);
                          }}
                        >
                          <Text style={styles.mBtnT2}>
                            Mark as leave (black on map)
                          </Text>
                        </Pressable>
                      )}
                    </>
                  );
                })()}
                <Pressable
                  onPress={() => setPick(null)}
                  style={styles.mClose}
                >
                  <Text style={styles.mCloseT}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  nav: { color: '#EAB308', fontSize: 28, fontWeight: '300' },
  monthLabel: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  wd: { width: CELL, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    width: 7 * CELL + 20,
  },
  cell: {
    width: CELL,
    height: CELL,
    margin: 0,
  },
  legend: { color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: 20 },
  mBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  mCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
  },
  mTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  mLine: { color: 'rgba(255,255,255,0.9)', marginBottom: 6, fontSize: 15 },
  mSub: { color: '#EAB308', marginTop: 8, marginBottom: 4, fontSize: 14 },
  mMuted: { color: 'rgba(255,255,255,0.4)' },
  mC: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 4 },
  mBtn: { backgroundColor: '#EAB308', padding: 12, borderRadius: 10, marginTop: 12 },
  mBtnT: { color: '#0D0D0D', textAlign: 'center', fontWeight: '600' },
  mBtnDark: { backgroundColor: '#333', padding: 12, borderRadius: 10, marginTop: 8 },
  mBtnT2: { color: '#FFF', textAlign: 'center', fontSize: 13 },
  mClose: { marginTop: 12 },
  mCloseT: { color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});
