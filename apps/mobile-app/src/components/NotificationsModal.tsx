import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../constants/colors';
import { SectionTitle } from './SectionTitle';
import { EmptyState } from './EmptyState';
import { SwipeableNotification } from './SwipeableNotification';
import type { NotificationEntry } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationEntry[];
  onDismiss: (id: number) => Promise<void>;
  onClear: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function NotificationsModal({
  visible,
  onClose,
  notifications,
  onDismiss,
  onClear,
  onRefresh,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop to tap to close */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Notification Center</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <SectionTitle>Recent Alerts</SectionTitle>
            <View style={styles.btnGroup}>
              <TouchableOpacity onPress={onRefresh} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClear} style={[styles.actionBtn, styles.clearBtn]}>
                <Text style={[styles.actionBtnText, styles.clearBtnText]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {notifications.length === 0 ? (
              <EmptyState
                title="All caught up!"
                description="Active parenting alerts will appear here."
              />
            ) : (
              notifications.map((n) => (
                <SwipeableNotification
                  key={n.id}
                  notification={n}
                  onDismiss={() => void onDismiss(n.id)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
    minHeight: '40%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: C.muted,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: C.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBtnText: {
    color: C.purpleDark,
    fontWeight: '700',
    fontSize: 11,
  },
  clearBtn: {
    backgroundColor: '#FEE2E2',
  },
  clearBtnText: {
    color: '#EF4444',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
