import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { SectionTitle } from '../../../components/SectionTitle';
import type { Milestone, Baby } from '../../../types';
import { MilestoneMediaManager } from './MilestoneMediaManager';

interface Props {
  baby: Baby | null;
  milestones: Milestone[];
  defaultCDC: { name: string; age: string }[];
  activeMilestoneName: string | null;
  activeMilestoneNotes: string;
  setActiveMilestoneNotes: (val: string) => void;
  handleToggleCDC: (name: string) => void;
  handleSaveMilestone: () => void;
  setActiveMilestoneName: (val: string | null) => void;
  uploading: number | null;
  uploadMedia: (milestoneId: number, uri: string, mimeType: string, filename: string) => Promise<void>;
  deleteMedia: (milestoneId: number, mediaId: number) => Promise<void>;
}

export function CDCChecklist({
  baby,
  milestones,
  defaultCDC,
  activeMilestoneName,
  activeMilestoneNotes,
  setActiveMilestoneNotes,
  handleToggleCDC,
  handleSaveMilestone,
  setActiveMilestoneName,
  uploading,
  uploadMedia,
  deleteMedia,
}: Props) {
  // Calculate baby's age in months
  const getBabyAgeMonths = (birthDateString?: string) => {
    if (!birthDateString) return null;
    try {
      const birthDate = new Date(birthDateString);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.round(diffDays / 30.44); // Approx months
    } catch {
      return null;
    }
  };

  const babyAgeMonths = baby ? getBabyAgeMonths(baby.birth_date) : null;

  const parseTypicalAgeToMonths = (ageStr: string) => {
    const num = parseInt(ageStr.split(' ')[0], 10);
    return isNaN(num) ? 0 : num;
  };

  return (
    <View>
      <SectionTitle>Developmental Checklist</SectionTitle>
      <View style={styles.checklistContainer}>
        {defaultCDC.map((item) => {
          const matched = milestones.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
          const targetMonths = parseTypicalAgeToMonths(item.age);
          
          let badgeText = '';
          let badgeStyle = {};
          let rowHighlight = {};

          if (babyAgeMonths !== null) {
            const ageDiff = targetMonths - babyAgeMonths;
            if (matched) {
              badgeText = '🎉 Achieved';
              badgeStyle = styles.badgeAchieved;
            } else if (ageDiff > 1.5) {
              badgeText = '🔜 Future Stage';
              badgeStyle = styles.badgeFuture;
            } else if (Math.abs(ageDiff) <= 1.5) {
              badgeText = '👶 Active Stage';
              badgeStyle = styles.badgeActive;
              rowHighlight = styles.rowActive;
            } else if (ageDiff < -1.5) {
              badgeText = '⚠️ Attention';
              badgeStyle = styles.badgeAlert;
            }
          }

          return (
            <View key={item.name} style={[styles.checkRow, rowHighlight]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{item.name}</Text>
                  {badgeText ? (
                    <View style={[styles.badge, badgeStyle]}>
                      <Text style={styles.badgeLabel}>{badgeText}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Typical age: {item.age}
                </Text>
                {matched?.notes && (
                  <Text style={styles.checklistMatchedNotes}>Note: {matched.notes}</Text>
                )}
                {matched && (
                  <MilestoneMediaManager
                    milestoneId={matched.id}
                    media={matched.media || []}
                    uploading={uploading === matched.id}
                    onUpload={uploadMedia}
                    onDelete={deleteMedia}
                  />
                )}
              </View>
              <TouchableOpacity
                onPress={() => void handleToggleCDC(item.name)}
                style={[styles.checkbox, matched && styles.checkboxChecked]}
              >
                {matched && (
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Inline notes dialog for checklist milestones */}
      {activeMilestoneName && (
        <View style={styles.inlineDialog}>
          <Text style={styles.inlineDialogTitle}>Celebrate {activeMilestoneName}!</Text>
          <Text style={{ fontSize: 12, color: C.ink, marginBottom: 12 }}>
            Add any notes about this milestone (optional).
          </Text>
          <TextInput
            value={activeMilestoneNotes}
            onChangeText={setActiveMilestoneNotes}
            placeholder="e.g. He smiled at mommy for the first time!"
            placeholderTextColor="#A9A9A9"
            style={[styles.input, { backgroundColor: '#FFF', marginBottom: 12 }]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={handleSaveMilestone} style={styles.inlineSaveBtn}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                Mark as Achieved
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveMilestoneName(null)}
              style={styles.inlineCancelBtn}
            >
              <Text style={{ color: C.ink, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  checklistContainer: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F2F2F2',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  rowActive: {
    backgroundColor: '#FAF5FF',
    borderLeftWidth: 3,
    borderLeftColor: C.purple,
  },
  checklistMatchedNotes: {
    fontSize: 12,
    color: C.purpleDark,
    fontStyle: 'italic',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: C.purple,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeAchieved: {
    backgroundColor: '#DCFCE7',
  },
  badgeFuture: {
    backgroundColor: '#F3F4F6',
  },
  badgeActive: {
    backgroundColor: '#F3E8FF',
  },
  badgeAlert: {
    backgroundColor: '#FEE2E2',
  },
  inlineDialog: {
    backgroundColor: C.purpleSoft,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDB8EE',
  },
  inlineDialogTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.purpleDark,
    marginBottom: 4,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  inlineSaveBtn: {
    backgroundColor: C.purple,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  inlineCancelBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CCC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
});
