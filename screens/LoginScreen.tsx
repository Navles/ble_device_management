import AppConstants from "@/app/utlis/AppConstants";
import { showToastFail, showToastSuccess } from "@/app/utlis/ToastConfig";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useDispatch } from "react-redux";

const logo = require("../assets/images/appLogo.png");

const LoginScreen: React.FC = () => {
  const { width } = Dimensions.get("window");
  const dispatch = useDispatch<any>();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (): Promise<void> => {
    // Basic validation
    if (!email.trim()) {
      showToastFail({
        message: AppConstants.messages.error.invalidEmail,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: "bottom",
      });
      return;
    }

    if (!validateEmail(email)) {
      showToastFail({
        message: AppConstants.messages.error.invalidEmail,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: "bottom",
      });
      return;
    }

    if (!password.trim()) {
      showToastFail({
        message: AppConstants.messages.error.invalidPassword,
        visibilityTime: AppConstants.timeouts.toastDuration,
        position: "bottom",
      });
      return;
    }

    setIsLoading(true);

    // Simple delay to show loading state
    setTimeout(async () => {
      try {
        // Store a mock token for the session
        const mockToken = "mock-session-token-" + Date.now();
        await dispatch.LoginModel.handleApiToken(mockToken);

        showToastSuccess({
          message: AppConstants.messages.success.loginSuccess,
          visibilityTime: AppConstants.timeouts.toastDuration,
          position: "bottom",
        });

        // Navigate to MainScreen
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 500);
      } catch (error) {
        console.error("Login error:", error);
        showToastFail({
          message: AppConstants.messages.error.loginFailed,
          visibilityTime: AppConstants.timeouts.toastDuration,
          position: "bottom",
        });
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        backgroundColor={AppConstants.colors.primary}
        barStyle="light-content"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Login Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Login</Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={AppConstants.colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={styles.infoText}>
              Enter any valid email and password to continue
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {AppConstants.copyright.text.replace(
                "{year}",
                new Date().getFullYear().toString()
              )}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppConstants.colors.primary,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    marginTop: 40,
    width: "96%",
    alignSelf: "center",
    marginVertical: 20,
    borderWidth: 3,
    borderColor: AppConstants.colors.secondary,
    borderRadius: 20,
    backgroundColor: AppConstants.colors.white,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flex: 0.3,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: Dimensions.get("screen").width / 2,
    height: "50%",
  },
  formContainer: {
    flex: 0.6,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppConstants.colors.secondary,
    marginBottom: 30,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: AppConstants.colors.secondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    color: AppConstants.colors.secondary,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: AppConstants.colors.secondary,
  },
  eyeButton: {
    padding: 15,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: AppConstants.colors.highlight,
    borderRadius: 50,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: AppConstants.colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  infoText: {
    marginTop: 15,
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  footer: {
    flex: 0.1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    color: AppConstants.colors.secondary,
    fontSize: 12,
  },
});

export default LoginScreen;
