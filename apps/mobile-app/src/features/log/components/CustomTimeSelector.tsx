import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../../../constants/colors';

interface Props {
  customTimeEnabled: boolean;
  setCustomTimeEnabled: (val: boolean) => void;
  customTime: string;
  setCustomTime: (val: string) => void;
}

export function CustomTimeSelector({
  customTimeEnabled,
  setCustomTimeEnabled,
  customTime,
  setCustomTime,
}: Props) {
  return (
    <View style={{ marginBottom: 15 }}>
      <TouchableOpacity
        onPress={() => setCustomTimeEnabled(!customTimeEnabled)}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: C.purple,
            backgroundColor: customTimeEnabled ? C.purple : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          {customTimeEnabled && (
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>✓</Text>
          )}
        </View>
        <Text style={{ fontSize: 14, color: C.ink, fontWeight: '600' }}>Set time of activity</Text>
      </TouchableOpacity>

      {customTimeEnabled && (
        <View
          style={{
            backgroundColor: '#F8F8F8',
            borderRadius: 8,
            padding: 12,
            borderWidth: 1,
            borderColor: '#EEE',
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 4 }}>
            Start Time (HH:MM)
          </Text>
          <TextInput
            value={customTime}
            onChangeText={setCustomTime}
            placeholder="14:30"
            placeholderTextColor="#A9A9A9"
            style={[styles.input, { height: 40, marginBottom: 0 }]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
  },
});
