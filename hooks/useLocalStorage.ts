
import { useState, useEffect } from 'react';

const APP_PREFIX = 'reup-ai-';

export function useLocalStorage<T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const prefixedKey = APP_PREFIX + key;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(prefixedKey, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(prefixedKey);
      if (item && JSON.parse(item) !== storedValue) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      // If user is in private mode or has storage restriction
      // localStorage can throw. JSON.parse and stringify can throw.
      console.warn(`Error reading localStorage key “${prefixedKey}”:`, error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [storedValue, setValue];
}