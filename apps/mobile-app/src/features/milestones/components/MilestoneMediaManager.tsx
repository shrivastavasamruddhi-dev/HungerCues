import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C } from '../../../constants/colors';
import type { MilestoneMedia } from '../../../types';

interface Props {
  milestoneId: number;
  media: MilestoneMedia[];
  uploading: boolean;
  onUpload: (milestoneId: number, uri: string, mimeType: string, filename: string) => Promise<void>;
  onDelete: (milestoneId: number, mediaId: number) => Promise<void>;
}

export function MilestoneMediaManager({
  milestoneId,
  media = [],
  uploading,
  onUpload,
  onDelete,
}: Props) {
  const [showOptions, setShowOptions] = useState(false);

  const handlePickMedia = async (useCamera: boolean, mediaType: 'photo' | 'video') => {
    setShowOptions(false);
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permissions are required.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permissions are required.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: mediaType === 'photo' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        
        // Infer mimetype and filename
        const filename = uri.split('/').pop() || 'upload';
        const extension = filename.split('.').pop() || '';
        
        let mimeType = asset.mimeType;
        if (!mimeType) {
          if (mediaType === 'photo') {
            mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
          } else {
            mimeType = 'video/mp4';
          }
        }

        await onUpload(milestoneId, uri, mimeType, filename);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick or record media.');
    }
  };

  const handleOpenMedia = (url: string | null) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open media URL');
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Existing Attachments */}
      {media.length > 0 && (
        <View style={styles.mediaGrid}>
          {media.map((item) => (
            <View key={item.id} style={styles.thumbnailContainer}>
              <TouchableOpacity onPress={() => handleOpenMedia(item.download_url)}>
                {item.media_type === 'photo' ? (
                  <Image source={{ uri: item.download_url || undefined }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.videoPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>🎬</Text>
                    <View style={styles.playBadge}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>▶ PLAY</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void onDelete(milestoneId, item.id)}
                style={styles.deleteBadge}
              >
                <Text style={styles.deleteText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Upload trigger */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        {uploading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ActivityIndicator size="small" color={C.purple} />
            <Text style={{ fontSize: 12, color: C.muted }}>Uploading...</Text>
          </View>
        ) : (
          media.length < 10 && (
            <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.attachBtn}>
              <Text style={styles.attachBtnText}>📎 Attach Photo/Video</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Pick options overlay modal */}
      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Media Attachment</Text>
            <Text style={styles.modalSubtitle}>Max 10MB for photos, 100MB for videos.</Text>
            
            <TouchableOpacity onPress={() => void handlePickMedia(true, 'photo')} style={styles.optionBtn}>
              <Text style={styles.optionText}>📸 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void handlePickMedia(true, 'video')} style={styles.optionBtn}>
              <Text style={styles.optionText}>📹 Record Video</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void handlePickMedia(false, 'photo')} style={styles.optionBtn}>
              <Text style={styles.optionText}>🖼️ Choose Photo from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void handlePickMedia(false, 'video')} style={styles.optionBtn}>
              <Text style={styles.optionText}>🎥 Choose Video from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowOptions(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 66,
    height: 66,
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#EDF2F7',
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  deleteBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    lineHeight: 14,
  },
  attachBtn: {
    backgroundColor: C.purpleSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.purpleDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 16,
  },
  optionBtn: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  closeBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
});
