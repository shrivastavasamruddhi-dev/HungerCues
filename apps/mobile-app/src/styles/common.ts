import { StyleSheet } from 'react-native';
import { C } from '../constants/colors';

/**
 * Shared styles used across multiple screens and components.
 * Component-specific styles should remain local to each component.
 */
export const common = StyleSheet.create({
  // Layout
  safeArea: { flex: 1, backgroundColor: C.canvas },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: C.canvas,
  },
  desktopShell: {
    marginVertical: 22,
    borderRadius: 38,
    overflow: 'hidden',
    maxHeight: 880,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 10,
  },
  scroll: { padding: 18, paddingTop: 16, paddingBottom: 118, minHeight: '100%' },

  // Feedback banners
  notice: { backgroundColor: '#E7F8EC', borderRadius: 14, padding: 12, marginBottom: 12 },
  noticeText: { color: '#19763B', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  errorBanner: { backgroundColor: '#FFF0F0', borderRadius: 16, padding: 13, marginBottom: 14 },
  errorText: { color: '#A23B3B', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  retryText: { color: '#A23B3B', fontSize: 10, textAlign: 'center', marginTop: 4 },

  // Loading
  loadingState: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: C.muted, marginTop: 12, fontSize: 13 },

  // Typography
  sectionTitle: {
    fontSize: 21,
    lineHeight: 25,
    color: C.ink,
    fontWeight: '800',
    marginBottom: 18,
  },
  purpleText: { color: C.purpleDark },
  white: { color: '#FFF' },

  // Inputs
  inputLabel: { color: '#555', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    color: C.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  formRow: { flexDirection: 'row', gap: 10 },
  formField: { flex: 1 },

  // Buttons
  logButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  logButtonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  buttonDisabled: { opacity: 0.55 },

  // Cards
  eventCard: {
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: C.card,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { marginLeft: 12, flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700' },
  eventMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
  emptyCard: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: C.card,
    alignItems: 'center',
  },
  emptyTitle: { color: C.ink, fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: C.muted, fontSize: 12, marginTop: 5 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuContainer: {
    backgroundColor: C.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 320,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  menuCloseBtn: { padding: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: { fontSize: 18, color: C.purpleDark, fontWeight: '600' },
  menuItemText: { fontSize: 14, fontWeight: '700', color: C.ink },

  // Stats
  statRow: {
    height: 72,
    borderRadius: 24,
    backgroundColor: '#F6F6F6',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { height: 36, width: 1, backgroundColor: C.line },
  statLabel: { fontSize: 12, color: C.ink },
  statValue: { color: C.muted, marginTop: 3 },

  // SegmentedControl
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  segment: {
    minWidth: 82,
    height: 50,
    paddingHorizontal: 17,
    borderRadius: 26,
    backgroundColor: '#DEDEDE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  segmentActive: { backgroundColor: C.purple },
  segmentText: { color: C.muted, fontSize: 15 },
  segmentIcon: { color: C.muted },
});
