import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Contrast, Eye, Hand, Radar, Trash2, Waves } from 'lucide-react-native';
import ScreenShell from '../components/ScreenShell';
import IceHeader from '../components/IceHeader';
import ToggleRow, { DangerRow } from '../components/ToggleRow';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { C, G, theme } from '../constants/theme';
import { SaveBlob, Settings } from '../game/persistence';

interface Props {
  save: SaveBlob;
  onBack: () => void;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

function SettingsScreen({ save, onBack, onChange, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);
  const s = save.settings;

  return (
    <ScreenShell
      colors={G.settings}
      overlay={theme.overlay.settings}
      animated={!s.reducedMotion}
      seed={71}>
      <IceHeader title="SETTINGS" onBack={onBack} />

      <View style={styles.body}>
        <View style={styles.list}>
          <ToggleRow
            Icon={Radar}
            title="SONAR ASSIST"
            description="Show the depth readout and the echo metres"
            value={s.sonarAssist}
            onChange={v => onChange({ sonarAssist: v })}
          />
          <ToggleRow
            Icon={Hand}
            title="LEFT-HANDED CONTROLS"
            description="Mirror the action button and the HOLES pill"
            value={s.leftHanded}
            onChange={v => onChange({ leftHanded: v })}
          />
          <ToggleRow
            Icon={Waves}
            title="REDUCED MOTION"
            description="Stop the aurora drift, ping rings and ice dust"
            value={s.reducedMotion}
            onChange={v => onChange({ reducedMotion: v })}
          />
          <ToggleRow
            Icon={Contrast}
            title="HIGH-CONTRAST TENSION"
            description="Draw the safe zone as a solid outlined band"
            value={s.highContrast}
            onChange={v => onChange({ highContrast: v })}
          />

          {confirming ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmTitle}>WIPE ALL PROGRESS?</Text>
              <Text style={styles.confirmHint}>
                Stars, species records and lifetime totals are all cleared.
              </Text>
              <View style={styles.confirmRow}>
                <View style={styles.confirmCell}>
                  <PrimaryButton
                    label="RESET"
                    Icon={Trash2}
                    colors={G.ctaHot}
                    height={52}
                    onPress={() => {
                      setConfirming(false);
                      onReset();
                    }}
                  />
                </View>
                <View style={styles.confirmCell}>
                  <SecondaryButton
                    label="CANCEL"
                    Icon={Eye}
                    height={52}
                    onPress={() => setConfirming(false)}
                  />
                </View>
              </View>
            </View>
          ) : (
            <DangerRow
              Icon={Trash2}
              title="RESET PROGRESS"
              description="Clear stars, species and lifetime totals"
              onPress={() => setConfirming(true)}
            />
          )}
        </View>

        <Text style={styles.footer}>ARCTIC QUEST   OFFLINE   NO ADS</Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    justifyContent: 'space-between',
  },
  list: {
    gap: 10,
  },
  confirm: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(232,67,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,67,58,0.4)',
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.danger,
  },
  confirmHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: C.line,
  },
  confirmRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  confirmCell: {
    flex: 1,
  },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: C.textMuted,
  },
});

export default SettingsScreen;
