import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { milestoneService } from '../../services/milestoneService';
import type { Baby, Milestone } from '../../types';

interface Props {
  baby: Baby | null;
}

export function MilestonesScreen({ baby }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Milestone Form State
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Edit/Check modal state
  const [activeMilestoneName, setActiveMilestoneName] = useState<string | null>(null);
  const [activeMilestoneNotes, setActiveMilestoneNotes] = useState('');

  // Default CDC Milestones
  const defaultCDC = [
    { name: 'Social Smile', age: '2 months' },
    { name: 'Cooing/Vocalizing', age: '2 months' },
    { name: 'Rolling Over', age: '5 months' },
    { name: 'Sitting Up', age: '6 months' },
    { name: 'Crawling', age: '9 months' },
    { name: 'First Words', age: '12 months' },
    { name: 'First Steps', age: '12 months' },
  ];

  const loadMilestones = async () => {
    if (!baby) return;
    setLoading(true);
    setError(null);
    try {
      const data = await milestoneService.listMilestones(baby.id);
      setMilestones(data);
    } catch {
      setError('Could not load milestones. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baby]);

  const handleToggleCDC = async (name: string) => {
    if (!baby) return;
    const existing = milestones.find((m) => m.name.toLowerCase() === name.toLowerCase());

    if (existing) {
      // Uncheck / delete
      try {
        await milestoneService.deleteMilestone(existing.id);
        setMilestones((prev) => prev.filter((m) => m.id !== existing.id));
      } catch {
        setError('Could not delete milestone.');
      }
    } else {
      // Check / Add (Open inline dialog to save)
      setActiveMilestoneName(name);
      setActiveMilestoneNotes('');
    }
  };

  const handleSaveMilestone = async () => {
    if (!baby || !activeMilestoneName) return;
    try {
      const created = await milestoneService.createMilestone({
        baby_id: baby.id,
        name: activeMilestoneName,
        achieved_at: new Date().toISOString().split('T')[0],
        notes: activeMilestoneNotes || null,
      });
      setMilestones((prev) => [...prev, created]);
      setActiveMilestoneName(null);
      setActiveMilestoneNotes('');
    } catch {
      setError('Could not save milestone.');
    }
  };

  const handleSaveCustom = async () => {
    if (!baby || !customName.trim()) return;
    try {
      const created = await milestoneService.createMilestone({
        baby_id: baby.id,
        name: customName.trim(),
        achieved_at: new Date().toISOString().split('T')[0],
        notes: customNotes || null,
      });
      setMilestones((prev) => [...prev, created]);
      setCustomName('');
      setCustomNotes('');
      setShowAddCustom(false);
    } catch {
      setError('Could not save custom milestone.');
    }
  };

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Milestones" action="⚐" />
      <Text style={styles.heroTitle}>Celebrate the{'\n'}small steps.</Text>

      {error && (
        <View style={styles.askErrorBox}>
          <Text style={styles.askErrorText}>{error}</Text>
        </View>
      )}

      {loading && (
        <ActivityIndicator size="small" color={C.purple} style={{ marginVertical: 20 }} />
      )}

      {/* CDC Predefined Milestones */}
      <Text style={styles.sectionTitle}>Developmental Checklist</Text>
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
            <TouchableOpacity
              onPress={() => void handleSaveMilestone()}
              style={styles.inlineSaveBtn}
            >
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

      {/* Custom Milestones list */}
      <View style={styles.customHeaderRow}>
        <Text style={styles.sectionTitle}>Custom Achievements</Text>
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
              onPress={() => void handleSaveCustom()}
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
        {milestones
          .filter((m) => !defaultCDC.some((d) => d.name.toLowerCase() === m.name.toLowerCase()))
          .map((m) => (
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
              </View>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await milestoneService.deleteMilestone(m.id);
                    setMilestones((prev) => prev.filter((item) => item.id !== m.id));
                  } catch {
                    setError('Could not delete milestone.');
                  }
                }}
                style={{ padding: 6 }}
              >
                <Text style={{ color: '#E53E3E', fontSize: 16 }}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}
        {milestones.filter(
          (m) => !defaultCDC.some((d) => d.name.toLowerCase() === m.name.toLowerCase()),
        ).length === 0 &&
          !showAddCustom && (
            <Text style={styles.emptyCustomText}>No custom achievements logged yet.</Text>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 21,
    lineHeight: 25,
    color: C.ink,
    fontWeight: '800',
    marginBottom: 18,
  },
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
  askErrorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  askErrorText: {
    color: '#A23B3B',
    fontSize: 12,
    fontWeight: '600',
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
});
