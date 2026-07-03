import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';
import { SectionTitle } from '../../../components/SectionTitle';
import type { Milestone } from '../../../types';
import { MilestoneMediaManager } from './MilestoneMediaManager';

interface Props {
  milestones: Milestone[];
  defaultCDC: { name: string; age: string }[];
  showAddCustom: boolean;
  setShowAddCustom: (val: boolean) => void;
  customName: string;
  setCustomName: (val: string) => void;
  customNotes: string;
  setCustomNotes: (val: string) => void;
  handleSaveCustom: () => void;
  deleteMilestone: (id: number) => void;
  uploading: number | null;
  uploadMedia: (milestoneId: number, uri: string, mimeType: string, filename: string) => Promise<void>;
  deleteMedia: (milestoneId: number, mediaId: number) => Promise<void>;
}

export function CustomMilestonesList({
  milestones,
  defaultCDC,
  showAddCustom,
  setShowAddCustom,
  customName,
  setCustomName,
  customNotes,
  setCustomNotes,
  handleSaveCustom,
  deleteMilestone,
  uploading,
  uploadMedia,
  deleteMedia,
}: Props) {
  const customMilestones = milestones.filter(
    (m) => !defaultCDC.some((d) => d.name.toLowerCase() === m.name.toLowerCase()),
  );

  return (
    <View>
      {/* Custom Milestones list */}
      <View style={styles.customHeaderRow}>
        <SectionTitle>Custom Achievements</SectionTitle>
        <TouchableOpacity onPress={() => setShowAddCustom(!showAddCustom)} style={styles.addNewBtn}>
          <Text style={{ color: C.purpleDark, fontWeight: '700', fontSize: 12 }}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {showAddCustom && (
        <View style={styles.customAddCard}>
          <Text style={styles.inputLabel}>Milestone Name</Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="e.g. Rolled from back to tummy"
            placeholderTextColor="#A9A9A9"
            style={styles.input}
          />
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            value={customNotes}
            onChangeText={setCustomNotes}
            placeholder="Add some details..."
            placeholderTextColor="#A9A9A9"
            style={styles.input}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              disabled={!customName.trim()}
              onPress={handleSaveCustom}
              style={[
                styles.logButton,
                { flex: 1, marginTop: 0 },
                !customName.trim() && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.logButtonText}>Save Milestone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddCustom(false)}
              style={styles.cancelCustomBtn}
            >
              <Text style={{ color: C.ink, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Display other/custom milestones */}
      <View>
        {customMilestones.map((m) => (
          <View key={m.id} style={styles.customMilestoneCard}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{m.name}</Text>
              {m.achieved_at && (
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Achieved:{' '}
                  {new Date(m.achieved_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              )}
              {m.notes && (
                <Text style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{m.notes}</Text>
              )}
              <MilestoneMediaManager
                milestoneId={m.id}
                media={m.media || []}
                uploading={uploading === m.id}
                onUpload={uploadMedia}
                onDelete={deleteMedia}
              />
            </View>
            <TouchableOpacity onPress={() => deleteMilestone(m.id)} style={{ padding: 6, alignSelf: 'flex-start' }}>
              <Text style={{ color: '#E53E3E', fontSize: 16 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}
        {customMilestones.length === 0 && !showAddCustom && (
          <Text style={styles.emptyCustomText}>No custom achievements logged yet.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addNewBtn: {
    backgroundColor: C.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  customAddCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
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
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  cancelCustomBtn: {
    backgroundColor: '#ECECEC',
    borderRadius: 24,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customMilestoneCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyCustomText: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
