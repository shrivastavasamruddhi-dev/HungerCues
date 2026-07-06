import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Platform } from 'react-native';
import { C } from '../constants/colors';

interface Props {
  visible: boolean;
  message: string | null;
  onUndo?: () => void;
  onDismiss: () => void;
}

export function Toast({ visible, message, onUndo, onDismiss }: Props) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && message) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 5000); // Display for 5 seconds

      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible || !message) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
        {onUndo && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Undo last action"
            onPress={() => {
              onUndo();
              handleClose();
            }}
            style={styles.undoBtn}
          >
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 96, // Anchored exactly above the bottom navigation bar
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B', // Deep indigo-slate background
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  undoBtn: {
    backgroundColor: C.purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 12,
  },
  undoText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
