import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  visible: boolean;
  video: any | null;
  onClose: () => void;
};

const CommentModal: React.FC<Props> = ({ visible, video, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Comments</Text>
          <Text style={styles.subtitle}>{video?.title ?? ''}</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Comments UI coming soon</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#666', marginBottom: 12 },
  placeholder: { height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  placeholderText: { color: '#555' },
  closeBtn: { marginTop: 12, alignSelf: 'center', backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  closeText: { color: 'white', fontWeight: '600' },
});

export default CommentModal;


