import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { C } from '../constants/colors';
import type { NotificationEntry } from '../types';

interface SwipeableNotificationProps {
  notification: NotificationEntry;
  onDismiss: () => void;
}

export function SwipeableNotification({ notification, onDismiss }: SwipeableNotificationProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const SWIPE_THRESHOLD = 80;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          // Swipe passed threshold — dismiss
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gestureState.dx > 0 ? 500 : -500,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(onDismiss);
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View style={[{ transform: [{ translateX }], opacity }]} {...panResponder.panHandlers}>
      <View
        style={[
          styles.eventCard,
          {
            borderLeftWidth: 4,
            borderLeftColor: notification.type === 'sleep_timer' ? '#48BB78' : '#ED8936',
          },
        ]}
      >
        <View style={styles.eventIcon}>
          <Text style={styles.purpleText}>
            {notification.type === 'sleep_timer'
              ? '☾'
              : notification.type === 'feed_gap'
                ? '♙'
                : '♢'}
          </Text>
        </View>
        <View style={styles.eventBody}>
          <Text style={styles.eventTitle}>{notification.title}</Text>
          <Text style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{notification.body}</Text>
          <Text style={styles.eventMeta}>
            {new Date(notification.sent_at).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: '#BFBFBF', paddingLeft: 4 }}>⟵⟶</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: C.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { marginLeft: 12, flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700' },
  eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
  purpleText: { color: C.purpleDark },
});
