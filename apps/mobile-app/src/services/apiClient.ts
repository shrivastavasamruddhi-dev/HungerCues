import Constants from 'expo-constants';
import { Platform } from 'react-native';

let defaultHost = 'localhost';

// In development, resolve the backend host dynamically based on platform
if (__DEV__) {
  if (Platform.OS === 'web') {
    defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  } else if (Constants.expoConfig?.hostUri) {
    defaultHost = Constants.expoConfig.hostUri.split(':')[0];
  }
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost}:8000/api/v1`;

const defaultHeaders = {
  Authorization: 'Bearer mock-token',
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  
  const mergedHeaders = {
    ...defaultHeaders,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...init?.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
