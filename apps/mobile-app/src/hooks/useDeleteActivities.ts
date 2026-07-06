import { useState } from 'react';
import { Platform, Alert, Vibration } from 'react-native';
import { feedingService } from '../services/feedingService';
import { sleepService } from '../services/sleepService';
import { diaperService } from '../services/diaperService';
import { growthService } from '../services/growthService';

interface Params {
  onRefreshData: () => Promise<void>;
}

export function useDeleteActivities({ onRefreshData }: Params) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleLongPress = (id: string) => {
    Vibration.vibrate(20);
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePress = (id: string) => {
    if (selectedIds.length > 0) {
      handleLongPress(id);
    }
  };

  const executeDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map(async (selectedId) => {
          const delimiterIdx = selectedId.indexOf('-');
          if (delimiterIdx === -1) return;
          const kind = selectedId.substring(0, delimiterIdx);
          const dbIdStr = selectedId.substring(delimiterIdx + 1);
          const dbId = parseInt(dbIdStr, 10);
          if (isNaN(dbId)) return;

          if (kind === 'feed') {
            await feedingService.deleteFeeding(dbId);
          } else if (kind === 'sleep') {
            await sleepService.deleteSleep(dbId);
          } else if (kind === 'diaper') {
            await diaperService.deleteDiaper(dbId);
          } else if (kind === 'growth') {
            await growthService.deleteGrowth(dbId);
          }
        }),
      );
      Vibration.vibrate(80);
      setSelectedIds([]);
      await onRefreshData();
    } catch {
      if (Platform.OS === 'web') {
        alert('Failed to delete some activities. Please check connection and try again.');
      } else {
        Alert.alert(
          'Error',
          'Failed to delete some activities. Please check connection and try again.',
        );
      }
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const confirmMsg = `Are you sure you want to delete the ${selectedIds.length} selected activities?`;
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        void executeDelete();
      }
    } else {
      Alert.alert('Confirm Delete', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void executeDelete(),
        },
      ]);
    }
  };

  return {
    selectedIds,
    setSelectedIds,
    handleLongPress,
    handlePress,
    handleDeleteSelected,
  };
}
