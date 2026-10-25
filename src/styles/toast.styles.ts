import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 28,
    left: 20,
    right: 20,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2430',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: 440,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconWrapper: {
    marginRight: 10,
  },
  messageText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
