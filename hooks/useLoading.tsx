// hooks/useLoading.tsx
import { useCallback, useState } from 'react';

interface LoadingState {
  isLoading: boolean;
  message: string;
}

export const useLoading = (initialMessage: string = 'Loading...') => {
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    message: initialMessage,
  });

  const showLoader = useCallback((message?: string) => {
    setLoading({
      isLoading: true,
      message: message || initialMessage,
    });
  }, [initialMessage]);

  const hideLoader = useCallback(() => {
    setLoading({
      isLoading: false,
      message: initialMessage,
    });
  }, [initialMessage]);

  const withLoader = useCallback(
    async <T,>(
      asyncFunction: () => Promise<T>,
      loadingMessage?: string
    ): Promise<T> => {
      try {
        showLoader(loadingMessage);
        const result = await asyncFunction();
        return result;
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader]
  );

  return {
    isLoading: loading.isLoading,
    loadingMessage: loading.message,
    showLoader,
    hideLoader,
    withLoader,
  };
};