/**
 * SleepTimerBanner
 *
 * Persistent banner displayed across all tabs whenever a live sleep session
 * is active. Shows elapsed time with a pulsing indicator and a quick
 * "Stop & Save" action.
 *
 * Visibility: controlled by the parent via `activeSleepStart` prop.
 * When null the component renders nothing and has no layout impact.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C, Colors } from '../constants/colors';

interface Props {
  /** ISO timestamp of when the sleep session started. Null = no active session. */
  activeSleepStart: string | null;
  /** Elapsed seconds — computed externally so this component stays pure. */
  elapsedSeconds: number;
  /** Formats elapsed seconds to HH:MM:SS string. */
  formatElapsed: (sec: number) => string;
  /** Callback when user hits Stop & Save */
  onStop: () => void;
}

export function SleepTimerBanner({
  activeSleepStart,
  elapsedSeconds,
  formatElapsed,
  onStop,
}: Props) {
  // Pulsing animation for the green dot indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!activeSleepStart) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [activeSleepStart, pulseAnim]);

  // Don't render anything when no session is active
  if (!activeSleepStart) return null;

  return (
    <View style={styles.banner} accessibilityRole="none" accessibilityLabel="Sleep timer is active">
      {/* Left: indicator + label */}
      <View style={styles.left}>
        <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
        <View>
          <Text style={styles.label}>SLEEP TIMER</Text>
          <Text style={styles.elapsed}>{formatElapsed(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Right: stop action */}
      <TouchableOpacity
        onPress={onStop}
        style={styles.stopButton}
        accessibilityRole="button"
        accessibilityLabel="Stop sleep session and save"
      >
        <Text style={styles.stopText}>Stop & Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    // Positioned by the parent above the bottom nav
    marginHorizontal: 16,
    marginBottom: 8,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.sleep.bg,
    borderWidth: 1.5,
    borderColor: '#C7D2FE', // indigo-200
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    // Elevation
    shadowColor: Colors.sleep.icon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.sleep.icon, // indigo
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.sleep.text,
    letterSpacing: 1,
  },
  elapsed: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.sleep.text,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    backgroundColor: Colors.sleep.icon,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // Brand shadow
    shadowColor: Colors.sleep.icon,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  stopText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
