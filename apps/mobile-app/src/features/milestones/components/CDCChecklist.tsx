import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { SectionTitle } from '../../../components/SectionTitle';
import type { Milestone } from '../../../types';
import { MilestoneMediaManager } from './MilestoneMediaManager';

interface Props {
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
  return (
    <View>
      <SectionTitle>Developmental Checklist</SectionTitle>
      <View style={styles.checklistContainer}>
        {defaultCDC.map((item) => {
          const matched = milestones.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
          return (
            <View key={item.name} style={styles.checkRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{item.name}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
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
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
