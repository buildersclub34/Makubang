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
import { Input, Button, Loader } from '../components/common';
import { COLORS, SIZES, FONTS, icons } from '../constants';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { forgotPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleForgotPassword = async (values, { setSubmitting, setFieldError }) => {
    try {
      const { email } = values;
      const { success, error } = await forgotPassword(email);
      
      if (success) {
        setIsSubmitted(true);
      } else {
        setFieldError('email', error || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={icons.email_sent}
            style={styles.emailIcon}
            resizeMode="contain"
          />
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent you a password reset link to your email address.
          </Text>
          <Text style={styles.instruction}>
            If you don't see the email, check your spam folder or request a new one.
          </Text>
          
          <Button
            title="Back to Login"
            onPress={navigateToLogin}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={navigateToLogin}
          >
            <Image
              source={icons.back}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.instruction}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <Formik
            initialValues={{ email: '' }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={handleForgotPassword}
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
                  label="Email Address"
                  placeholder="Enter your email"
                  icon={icons.email}
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  error={touched.email && errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.submitButton}
                />
              </>
            )}
          </Formik>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.darkGray,
  },
  headerTitle: {
    ...FONTS.h3,
    color: COLORS.darkGray,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
  },
  instruction: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  submitButton: {
    marginTop: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  emailIcon: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  title: {
    ...FONTS.h2,
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.body2,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    marginTop: 30,
    width: '100%',
  },
});

export default ForgotPasswordScreen;
