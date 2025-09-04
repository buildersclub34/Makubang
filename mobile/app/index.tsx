
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const NeopopButton = ({ title, onPress, variant = 'primary' }) => (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <TouchableOpacity
        style={[
          styles.neopopButton,
          variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.buttonText,
          variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText
        ]}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Text style={styles.title}>MAKUBANG</Text>
            <Text style={styles.subtitle}>Food • Stories • Community</Text>
            <Text style={styles.description}>
              Discover amazing food through captivating video stories from creators worldwide
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🎥</Text>
              <Text style={styles.featureText}>Video Stories</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🍕</Text>
              <Text style={styles.featureText}>Food Discovery</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🚀</Text>
              <Text style={styles.featureText}>Quick Delivery</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💎</Text>
              <Text style={styles.featureText}>Premium Content</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <NeopopButton
              title="GET STARTED"
              onPress={() => router.push('/register')}
              variant="primary"
            />
            <NeopopButton
              title="SIGN IN"
              onPress={() => router.push('/login')}
              variant="secondary"
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00D4FF',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#00D4FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#FF6B35',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
    opacity: 0.8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 40,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00D4FF',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonContainer: {
    gap: 16,
  },
  neopopButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  primaryButton: {
    backgroundColor: '#00D4FF',
    borderColor: '#0099CC',
    shadowColor: '#0099CC',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  primaryButtonText: {
    color: '#0D0D0D',
  },
  secondaryButtonText: {
    color: '#FF6B35',
  },
});
