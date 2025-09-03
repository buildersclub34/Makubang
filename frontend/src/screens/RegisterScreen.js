import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button, Loader, Divider } from '../components/common';
import { COLORS, SIZES, FONTS, icons, images } from '../constants';

const RegisterSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
});

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register, error, setError, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState('user'); // 'user', 'creator', or 'restaurant'

  const handleRegister = async (values, { setSubmitting, setFieldError }) => {
    try {
      const { name, email, password, confirmPassword } = values;
      
      if (password !== confirmPassword) {
        setFieldError('confirmPassword', 'Passwords do not match');
        return;
      }

      const { success, error: registerError } = await register({
        name,
        email,
        password,
        role: accountType,
      });
      
      if (!success && registerError) {
        Alert.alert('Registration Failed', registerError);
      }
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const AccountTypeButton = ({ type, label, icon }) => (
    <TouchableOpacity
      style={[
        styles.accountTypeButton,
        accountType === type && styles.selectedAccountType,
      ]}
      onPress={() => setAccountType(type)}
    >
      <Image
        source={icon}
        style={[
          styles.accountTypeIcon,
          { tintColor: accountType === type ? COLORS.white : COLORS.primary },
        ]}
      />
      <Text
        style={[
          styles.accountTypeText,
          { color: accountType === type ? COLORS.white : COLORS.darkGray },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            source={images.logo}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Makubang to discover amazing food</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.accountTypeContainer}>
            <AccountTypeButton
              type="user"
              label="Food Lover"
              icon={icons.user}
            />
            <AccountTypeButton
              type="creator"
              label="Creator"
              icon={icons.creator}
            />
            <AccountTypeButton
              type="restaurant"
              label="Restaurant"
              icon={icons.restaurant}
            />
          </View>

          <Formik
            initialValues={{
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
            }}
            validationSchema={RegisterSchema}
            onSubmit={handleRegister}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              isSubmitting,
            }) => (
              <>
                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  icon={icons.person}
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  error={touched.name && errors.name}
                  autoCapitalize="words"
                />

                <Input
                  label="Email Address"
                  placeholder="Enter your email"
                  icon={icons.email}
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  error={touched.email && errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Input
                  label="Password"
                  placeholder="Create a password"
                  icon={icons.lock}
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={touched.password && errors.password}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? icons.eye_off : icons.eye}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />

                <Input
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  icon={icons.lock}
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  error={touched.confirmPassword && errors.confirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  rightIcon={showConfirmPassword ? icons.eye_off : icons.eye}
                  onRightIconPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                />

                <Button
                  title="Create Account"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.signUpButton}
                />
              </>
            )}
          </Formik>

          <View style={styles.dividerContainer}>
            <Divider text="OR" />
          </View>

          <View style={styles.socialLoginContainer}>
            <TouchableOpacity style={styles.socialButton}>
              <Image source={icons.google} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButton, { marginTop: 12 }]}>
              <Image source={icons.facebook} style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Continue with Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  formContainer: {
    paddingHorizontal: 30,
    marginTop: 10,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  accountTypeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 4,
  },
  selectedAccountType: {
    backgroundColor: COLORS.primary,
  },
  accountTypeIcon: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  accountTypeText: {
    ...FONTS.body5,
    fontWeight: '500',
  },
  signUpButton: {
    marginTop: 10,
  },
  dividerContainer: {
    marginVertical: 25,
  },
  socialLoginContainer: {
    marginTop: 10,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    padding: 15,
  },
  socialIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  socialButtonText: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    ...FONTS.body4,
    color: COLORS.darkGray,
  },
  signInText: {
    ...FONTS.body4,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default RegisterScreen;
