import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export type ConfessionSubmitPayload = {
  type: string;
  details: string;
  severity: string;
};

const CHIP_TYPES = [
  'Junk food',
  'Alcohol',
  'Poor sleep',
  'Overeating',
] as const;

const SEVERITIES = ['Low', 'Medium', 'High'] as const;

type ConfessionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: ConfessionSubmitPayload) => void;
};

export function ConfessionModal({
  visible,
  onClose,
  onSubmit,
}: ConfessionModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>('Low');

  const reset = () => {
    setSelectedType(null);
    setCustom('');
    setSeverity('Low');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (selectedType == null && !custom.trim()) {
      return;
    }
    const t =
      selectedType != null
        ? selectedType
        : custom.trim()
          ? 'Custom'
          : 'Unspecified';
    const d =
      custom.trim() ||
      (selectedType != null ? selectedType : '') ||
      '';
    onSubmit({ type: t, details: d, severity });
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Confess</Text>
          <Text style={styles.hint}>
            What slipped? (tap a chip, add details, set severity)
          </Text>
          <View style={styles.chipRow}>
            {CHIP_TYPES.map((c) => {
              const on = selectedType === c;
              return (
                <Pressable
                  key={c}
                  onPress={() =>
                    setSelectedType((p) => (p === c ? null : c))
                  }
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text
                    style={[styles.chipText, on && styles.chipTextOn]}
                    numberOfLines={1}
                  >
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            value={custom}
            onChangeText={setCustom}
            placeholder="Custom confession (optional)…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.sevLabel}>Severity</Text>
          <View style={styles.sevRow}>
            {SEVERITIES.map((s) => {
              const on = severity === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSeverity(s)}
                  style={[styles.sevBtn, on && styles.sevBtnOn]}
                >
                  <Text
                    style={[styles.sevText, on && styles.sevTextOn]}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.btnGhost} onPress={handleClose}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={handleSubmit}>
              <Text style={styles.btnText}>Submit</Text>
            </Pressable>
          </View>
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
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipOn: {
    backgroundColor: '#2E2E2E',
    borderColor: '#EAB308',
  },
  chipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  chipTextOn: {
    color: '#FFFFFF',
  },
  input: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    color: '#FFFFFF',
    padding: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  sevLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 8,
  },
  sevRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sevBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
  },
  sevBtnOn: {
    backgroundColor: '#3A3A3A',
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  sevText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  sevTextOn: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  btnGhostText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#EAB308',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '600',
  },
});
