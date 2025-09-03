import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS } from '../constants';

const TabIcon = ({
  focused,
  icon,
  iconFocused,
  label,
  isCreateButton = false,
  showBadge = false,
  badgeCount = 0,
}) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          isCreateButton && styles.createButtonContainer,
          focused && !isCreateButton && styles.activeIconContainer,
        ]}
      >
        <Image
          source={focused && iconFocused ? iconFocused : icon}
          style={[
            styles.icon,
            isCreateButton && styles.createIcon,
            { tintColor: isCreateButton ? COLORS.white : focused ? COLORS.primary : COLORS.gray },
          ]}
          resizeMode="contain"
        />
        
        {showBadge && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      
      {!isCreateButton && (
        <Text
          style={[
            styles.label,
            { color: focused ? COLORS.primary : COLORS.gray },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
      
      {focused && !isCreateButton && <View style={styles.activeIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconContainer: {
    backgroundColor: COLORS.lightGray2,
    borderRadius: 12,
    padding: 4,
  },
  createButtonContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    marginBottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: COLORS.gray,
  },
  createIcon: {
    width: 28,
    height: 28,
    tintColor: COLORS.white,
  },
  label: {
    ...FONTS.body5,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.white,
    ...FONTS.body5,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default TabIcon;
