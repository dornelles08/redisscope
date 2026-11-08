import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '@/services/endpoints';
import { clearToken, getToken, setToken } from '@/services/api-client';
import type { LoginInput } from '@/types/api';

export function useAuth() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    enabled: Boolean(getToken()),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data) => {
      setToken(data.token);
      setUsername(data.user.username);
      void navigate('/', { replace: true });
    },
  });

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      setUsername(null);
      void navigate('/login', { replace: true });
    }
  };

  const isAuthenticated = Boolean(getToken()) || loginMutation.isSuccess;

  return {
    login: (input: LoginInput) => loginMutation.mutateAsync(input),
    logout,
    isAuthenticated,
    isLoadingLogin: loginMutation.isPending,
    loginError: loginMutation.error,
    me: meQuery.data?.username ?? username,
    isCheckingAuth: meQuery.isLoading,
  };
}
