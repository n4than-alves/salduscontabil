
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

// Add TypeScript declaration for Jest
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface MockInstance {}
  }
  
  const jest: {
    fn: () => jest.MockInstance;
    clearAllMocks: () => void;
    mock: any;
  }
  
  const describe: (name: string, fn: () => void) => void;
  const beforeEach: (fn: () => void) => void;
  const it: (name: string, fn: () => void | Promise<void>) => void;
  const expect: any;
}

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      })),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: jest.fn(() => ({
        error: null
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          error: null
        }))
      }))
    }))
  },
  cleanupAuthState: jest.fn()
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide auth context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signUp');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('updateProfile');
  });

  it('should handle sign in', async () => {
    (supabase.auth.signInWithPassword as jest.MockInstance).mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    });
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });

  it('should handle sign up', async () => {
    (supabase.auth.signUp as jest.MockInstance).mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null
    });
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.signUp('test@example.com', 'password', 'Test User');
    });
    
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
  });

  it('should handle sign out', async () => {
    (supabase.auth.signOut as jest.MockInstance).mockResolvedValue({
      error: null
    });
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.signOut();
    });
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
