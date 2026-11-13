import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { C } from '../constants/theme';

interface Props {
  Icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** A themed message, never a blank area (rule 8.2). */
function EmptyStateBase({ Icon, title, hint, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Icon size={28} color={C.accentAurora} strokeWidth={2} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43,217,198,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(43,217,198,0.35)',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.textOnDark,
    textAlign: 'center',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: C.line,
    textAlign: 'center',
    lineHeight: 18,
  },
  action: {
    marginTop: 20,
    width: 200,
  },
});

export const EmptyState = React.memo(EmptyStateBase);
export default EmptyState;
