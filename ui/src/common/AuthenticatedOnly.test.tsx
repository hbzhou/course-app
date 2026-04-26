import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthenticatedOnly } from './AuthenticatedOnly';
import { AuthContext } from '@/context/auth-context';

describe('AuthenticatedOnly', () => {
  it('renders children when isAuthenticated is true', () => {
    const mockAuthValue = {
      user: null,
      authStatus: 'authenticated' as const,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <AuthenticatedOnly>
          <div data-testid="authenticated-content">Secret Content</div>
        </AuthenticatedOnly>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders null when isAuthenticated is false', () => {
    const mockAuthValue = {
      user: null,
      authStatus: 'anonymous' as const,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <AuthenticatedOnly>
          <div data-testid="authenticated-content">Secret Content</div>
        </AuthenticatedOnly>
      </AuthContext.Provider>
    );

    expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('renders fallback when isAuthenticated is false and fallback is provided', () => {
    const mockAuthValue = {
      user: null,
      authStatus: 'anonymous' as const,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <AuthenticatedOnly fallback={<div data-testid="fallback-content">Login Required</div>}>
          <div data-testid="authenticated-content">Secret Content</div>
        </AuthenticatedOnly>
      </AuthContext.Provider>
    );

    expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    expect(screen.getByText('Login Required')).toBeInTheDocument();
  });
});
