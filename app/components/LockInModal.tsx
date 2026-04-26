import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type LockInModalProps = {
  visible: boolean;
  onYes: () => void;
  onRequestClose: () => void;
};

const WARNING =
  "Then don\u2019t expect results.";

/**
 * “Tomorrow lock-in” commitment prompt. NO path shows a strict warning.
 */
export function LockInModal({
  visible,
  onYes,
  onRequestClose,
}: LockInModalProps) {
  const [step, setStep] = useState<'ask' | 'warn'>('ask');

  useEffect(() => {
    if (visible) setStep('ask');
  }, [visible]);

  const close = () => {
    setStep('ask');
    onRequestClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {step === 'ask' ? (
            <>
              <Text style={styles.message}>
                Are you committing to tomorrow?
              </Text>
              <View style={styles.row}>
                <Pressable
                  style={styles.yes}
                  onPress={() => {
                    setStep('ask');
                    onYes();
                  }}
                >
                  <Text style={styles.yesText}>YES</Text>
                </Pressable>
                <Pressable
                  style={styles.no}
                  onPress={() => setStep('warn')}
                >
                  <Text style={styles.noText}>NO</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.warn}>{WARNING}</Text>
              <Pressable style={styles.ok} onPress={close}>
                <Text style={styles.okText}>OK</Text>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 22,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  yes: {
    flex: 1,
    marginRight: 6,
    backgroundColor: '#EAB308',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  yesText: { color: '#0D0D0D', fontSize: 16, fontWeight: '700' },
  no: {
    flex: 1,
    marginLeft: 6,
    backgroundColor: '#333333',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  noText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  warn: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  ok: {
    backgroundColor: '#EAB308',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  okText: { color: '#0D0D0D', fontSize: 16, fontWeight: '600' },
});
