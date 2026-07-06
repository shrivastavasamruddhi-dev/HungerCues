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
import type { Baby } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  baby: Baby | null;
  allBabies: Baby[];
  onSelectBaby: (baby: Baby) => void;
  onSignOut: () => void;
  onAddBaby: () => void;
}

export function SidebarPanel({
  visible,
  onClose,
  baby,
  allBabies,
  onSelectBaby,
  onSignOut,
  onAddBaby,
}: Props) {
  const getBabyAvatar = (gender: string) => {
    const g = gender.toLowerCase();
    if (g === 'boy' || g === 'male') return '👶';
    if (g === 'girl' || g === 'female') return '🎀';
    return '🧸';
  };

  const handleSelect = (b: Baby) => {
    onSelectBaby(b);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Semi-transparent backdrop click to close */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        {/* Sidebar Container */}
        <View style={styles.sidebar}>
          <View style={styles.header}>
            <Text style={styles.brandTitle}>HungerCues</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {baby && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACTIVE PROFILE</Text>
                <View style={styles.activeProfileCard}>
                  <View style={styles.activeAvatar}>
                    <Text style={{ fontSize: 20 }}>{getBabyAvatar(baby.gender)}</Text>
                  </View>
                  <View>
                    <Text style={styles.activeBabyName}>{baby.name}</Text>
                    <Text style={styles.activeBabyDetails}>Active Child Companion</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SWITCH PROFILE</Text>
              {allBabies.length === 0 ? (
                <Text style={styles.emptyText}>No other profiles found</Text>
              ) : (
                allBabies.map((b) => {
                  const isActive = baby?.id === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => handleSelect(b)}
                      style={[styles.babyItem, isActive && styles.babyItemActive]}
                    >
                      <View style={[styles.avatarCircle, isActive && styles.avatarCircleActive]}>
                        <Text style={{ fontSize: 16 }}>{getBabyAvatar(b.gender)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.babyName, isActive && styles.babyNameActive]}>
                          {b.name}
                        </Text>
                        <Text style={styles.babyGender}>{b.gender}</Text>
                      </View>
                      {isActive && <Text style={styles.activeCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Add Baby Button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add new baby profile"
                onPress={() => {
                  onClose();
                  onAddBaby();
                }}
                style={styles.addBabyBtn}
              >
                <Text style={styles.addBabyText}>＋ Add Baby Profile</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onSignOut} style={styles.signOutButton}>
              <Text style={styles.signOutIcon}>➔</Text>
              <Text style={styles.signOutText}>Sign Out & Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sidebar: {
    width: 280,
    backgroundColor: C.card,
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderRightWidth: 1,
    borderRightColor: '#ECECEC',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.purpleDark,
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: C.muted,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  activeProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: C.purpleSoft,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E6C6F5',
  },
  activeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBabyName: {
    fontSize: 15,
    fontWeight: '800',
    color: C.purpleDark,
  },
  activeBabyDetails: {
    fontSize: 11,
    color: '#8A3FB2',
    fontWeight: '600',
    marginTop: 1,
  },
  babyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    gap: 12,
  },
  babyItemActive: {
    backgroundColor: '#F9FAFB',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleActive: {
    backgroundColor: C.purpleSoft,
  },
  babyName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  babyNameActive: {
    color: C.purpleDark,
  },
  babyGender: {
    fontSize: 12,
    color: C.muted,
    marginTop: 1,
  },
  activeCheck: {
    fontSize: 14,
    color: C.purpleDark,
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
    fontStyle: 'italic',
  },
  addBabyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.purple,
    borderStyle: 'dashed',
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: '#FFF',
  },
  addBabyText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.purpleDark,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: Platform.OS === 'ios' ? 24 : 0,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    gap: 10,
  },
  signOutIcon: {
    fontSize: 16,
    color: '#EF4444',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
