import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { C } from '../../constants/colors';
import { Header } from '../../components/Header';
import { ErrorBox } from '../../components/ErrorBox';
import { useMilestones } from '../../hooks/useMilestones';
import { CDCChecklist } from './components/CDCChecklist';
import { CustomMilestonesList } from './components/CustomMilestonesList';
import type { Baby } from '../../types';

interface Props {
  baby: Baby | null;
}

export function MilestonesScreen({ baby }: Props) {
  const {
    milestones,
    loading,
    error,
    showAddCustom,
    setShowAddCustom,
    customName,
    setCustomName,
    customNotes,
    setCustomNotes,
    activeMilestoneName,
    setActiveMilestoneName,
    activeMilestoneNotes,
    setActiveMilestoneNotes,
    handleToggleCDC,
    handleSaveMilestone,
    handleSaveCustom,
    deleteMilestone,
    uploading,
    uploadMedia,
    deleteMedia,
  } = useMilestones(baby);

  const defaultCDC = [
    { name: 'Social Smile', age: '2 months' },
    { name: 'Cooing/Vocalizing', age: '2 months' },
    { name: 'Rolling Over', age: '5 months' },
    { name: 'Sitting Up', age: '6 months' },
    { name: 'Crawling', age: '9 months' },
    { name: 'First Words', age: '12 months' },
    { name: 'First Steps', age: '12 months' },
  ];

  return (
    <View style={{ paddingBottom: 40 }}>
      <Header title="Milestones" action="⚐" />
      <Text style={styles.heroTitle}>Celebrate the{'\n'}small steps.</Text>

      {error && <ErrorBox message={error} style={{ marginBottom: 16 }} />}

      {loading && (
        <ActivityIndicator size="small" color={C.purple} style={{ marginVertical: 20 }} />
      )}

      <CDCChecklist
        milestones={milestones}
        defaultCDC={defaultCDC}
        activeMilestoneName={activeMilestoneName}
        activeMilestoneNotes={activeMilestoneNotes}
        setActiveMilestoneNotes={setActiveMilestoneNotes}
        handleToggleCDC={handleToggleCDC}
        handleSaveMilestone={handleSaveMilestone}
        setActiveMilestoneName={setActiveMilestoneName}
        uploading={uploading}
        uploadMedia={uploadMedia}
        deleteMedia={deleteMedia}
      />

      <View style={{ height: 20 }} />

      <CustomMilestonesList
        milestones={milestones}
        defaultCDC={defaultCDC}
        showAddCustom={showAddCustom}
        setShowAddCustom={setShowAddCustom}
        customName={customName}
        setCustomName={setCustomName}
        customNotes={customNotes}
        setCustomNotes={setCustomNotes}
        handleSaveCustom={handleSaveCustom}
        deleteMilestone={deleteMilestone}
        uploading={uploading}
        uploadMedia={uploadMedia}
        deleteMedia={deleteMedia}
      />
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
});
