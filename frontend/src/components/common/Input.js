import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../../constants';
import { Image } from 'expo-image';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  secureTextEntry = false,
  icon,
  rightIcon,
  onRightIconPress,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  containerStyle,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedInputContainer,
          error && styles.errorInputContainer,
          multiline && styles.multilineContainer,
        ]}
      >
        {icon && (
          <Image
            source={icon}
            style={[
              styles.icon,
              { tintColor: error ? COLORS.error : COLORS.gray },
            ]}
            contentFit="contain"
          />
        )}
        <TextInput
          style={[
            styles.input,
            { paddingLeft: icon ? 10 : 15 },
            { textAlignVertical: multiline ? 'top' : 'center' },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          value={value}
          onChangeText={onChangeText}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Image
              source={rightIcon}
              style={[
                styles.icon,
                { tintColor: error ? COLORS.error : COLORS.gray },
              ]}
              contentFit="contain"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray2,
    borderRadius: SIZES.radius,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    height: 50,
  },
  focusedInputContainer: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorInputContainer: {
    borderColor: COLORS.error,
  },
  multilineContainer: {
    height: 'auto',
    minHeight: 100,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: COLORS.gray,
  },
  input: {
    flex: 1,
    ...FONTS.body4,
    color: COLORS.darkGray,
    padding: 0,
    height: '100%',
  },
  rightIcon: {
    padding: 8,
    marginRight: -8,
  },
  errorText: {
    ...FONTS.body5,
    color: COLORS.error,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default Input;
