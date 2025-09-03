import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS, FONTS } from '../../../constants';

const Loader = ({ size = 'large', color = COLORS.primary, message, style }) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginTop: 15,
    textAlign: 'center',
  },
});

export default Loader;
