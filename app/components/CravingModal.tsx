import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTaskStore } from '../store/useTaskStore';

type CravingKind = 'Momos' | 'Pizza' | 'Alcohol' | 'Custom';

const DAMAGES: Record<Exclude<CravingKind, 'Custom'>, string> = {
  Momos: '~350–500 kcal (oil + wrapper). Easy blow on deficit.',
  Pizza: '~800–1200+ kcal per 2–3 slices. High fat, high carb trap.',
  Alcohol: '~100–200+ kcal per standard drink, plus willpower crash.',
};

const ALTS = ['Fruit (apple/orange — fiber + water)', 'Peanuts (30g, measured)', 'Makhana (air-fried, plain)'] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Step = 'pick' | 'advice' | 'confirm';

export function CravingModal({ visible, onClose }: Props) {
  const addConfession = useTaskStore((s) => s.addConfession);
  const [step, setStep] = useState<Step>('pick');
  const [kind, setKind] = useState<CravingKind | null>(null);
  const [custom, setCustom] = useState('');
  const [damage, setDamage] = useState('');

  const reset = () => {
    setStep('pick');
    setKind(null);
    setCustom('');
    setDamage('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const onPick = (k: CravingKind) => {
    setKind(k);
    if (k === 'Custom') {
      setStep('advice');
      setDamage('Variable — default ~400–800 kcal if it’s fast food.');
    } else {
      setDamage(DAMAGES[k]);
      setStep('advice');
    }
  };

  const logCheat = () => {
    const label = kind === 'Custom' ? custom.trim() || 'Custom' : (kind as string);
    addConfession({
      type: 'Craving',
      details: `Cheat / craving: ${label}`,
      severity: 'High',
    });
    close();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {step === 'pick' && (
            <>
              <Text style={styles.title}>Craving control</Text>
              {(['Momos', 'Pizza', 'Alcohol'] as const).map((k) => (
                <Pressable key={k} style={styles.opt} onPress={() => onPick(k)}>
                  <Text style={styles.optT}>{k}</Text>
                </Pressable>
              ))}
              <Text style={styles.label}>Or custom</Text>
              <TextInput
                style={styles.input}
                value={custom}
                onChangeText={setCustom}
                placeholder="What do you want?"
                placeholderTextColor="#666"
                onSubmitEditing={() => {
                  if (custom.trim()) onPick('Custom');
                }}
              />
              <Pressable
                style={[styles.opt, !custom.trim() && { opacity: 0.4 }]}
                onPress={() => custom.trim() && onPick('Custom')}
                disabled={!custom.trim()}
              >
                <Text style={styles.optT}>Use custom</Text>
              </Pressable>
              <Pressable onPress={close}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </>
          )}

          {step === 'advice' && (
            <>
              <Text style={styles.title}>Calorie damage (estimate)</Text>
              <Text style={styles.dmg}>{damage}</Text>
              <Text style={styles.sub}>Try instead (pick one, measure it):</Text>
              {ALTS.map((a) => (
                <Text key={a} style={styles.alt}>
                  • {a}
                </Text>
              ))}
              <Pressable style={styles.still} onPress={() => setStep('confirm')}>
                <Text style={styles.stillT}>Still want it?</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep('pick');
                  setKind(null);
                }}
              >
                <Text style={styles.backL}>Back</Text>
              </Pressable>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Text style={styles.warnTitle}>Log as confession?</Text>
              <Text style={styles.muted}>
                This records the slip. Your coach and diet can tighten
                tomorrow.
              </Text>
              <Pressable style={styles.log} onPress={logCheat}>
                <Text style={styles.logT}>Yes, log it</Text>
              </Pressable>
              <Pressable onPress={close}>
                <Text style={styles.cancel}>No, I’m good</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, maxHeight: '90%' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  opt: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  optT: { color: '#EAB308', textAlign: 'center', fontWeight: '600' },
  label: { color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    color: '#FFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  cancel: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 12 },
  dmg: { color: '#F87171', fontSize: 15, lineHeight: 22, marginBottom: 10 },
  sub: { color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontSize: 14 },
  alt: { color: 'rgba(255,255,255,0.9)', marginBottom: 4, lineHeight: 20 },
  still: { backgroundColor: '#EAB308', padding: 12, borderRadius: 10, marginTop: 12 },
  stillT: { color: '#0D0D0D', textAlign: 'center', fontWeight: '700' },
  backL: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 12 },
  warnTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  muted: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 12 },
  log: { backgroundColor: '#A16207', padding: 12, borderRadius: 10, marginBottom: 8 },
  logT: { color: '#FFF', textAlign: 'center', fontWeight: '600' },
});
