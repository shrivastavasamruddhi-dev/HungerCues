import { useState, useEffect } from 'react';
import { milestoneService } from '../services/milestoneService';
import type { Baby, Milestone, MilestoneMedia } from '../types';

export function useMilestones(baby: Baby | null) {
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

  const [uploading, setUploading] = useState<number | null>(null);

  const uploadMedia = async (
    milestoneId: number,
    uri: string,
    mimeType: string,
    filename: string
  ) => {
    setUploading(milestoneId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename || 'media-attachment',
        type: mimeType,
      } as any);

      const uploaded = await milestoneService.uploadMedia(milestoneId, formData);
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.id === milestoneId) {
            return {
              ...m,
              media: [...(m.media || []), uploaded],
            };
          }
          return m;
        })
      );
    } catch (err) {
      setError('Failed to upload media. Check file size/type.');
    } finally {
      setUploading(null);
    }
  };

  const deleteMedia = async (milestoneId: number, mediaId: number) => {
    setError(null);
    try {
      await milestoneService.deleteMedia(milestoneId, mediaId);
      setMilestones((prev) =>
        prev.map((m) => {
          if (m.id === milestoneId) {
            return {
              ...m,
              media: (m.media || []).filter((item) => item.id !== mediaId),
            };
          }
          return m;
        })
      );
    } catch {
      setError('Could not delete media.');
    }
  };

  const deleteMilestone = async (id: number) => {
    try {
      await milestoneService.deleteMilestone(id);
      setMilestones((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError('Could not delete milestone.');
    }
  };

  return {
    milestones,
    loading,
    error,
    setError,
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
    loadMilestones,
    uploading,
    uploadMedia,
    deleteMedia,
  };
}
