import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '../store';
import { loadStoredUser } from '../store/slices/authSlice';

import { useColorScheme } from '@/hooks/useColorScheme';

function RootLayoutNav() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userJson = await AsyncStorage.getItem('currentUser');
        if (userJson) {
          const user = JSON.parse(userJson);
          dispatch(loadStoredUser(user));
        }
      } catch (error) {
        console.error('Error loading user from AsyncStorage:', error);
      }
    };

    loadUser();
  }, [dispatch]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth screens
        <>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen
            name="create"
            options={{
              presentation: 'modal',
            }}
          />
        </>
      ) : (
        // App screens
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="search"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="create"
            options={{
              presentation: 'modal',
            }}
          />
          <Stack.Screen name="event/[id]" />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </ThemeProvider>
    </Provider>
  );
}
