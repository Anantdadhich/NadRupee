"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { WalletClient, Address } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import {
  signUpWithPasskey,
  signInWithPasskey,
  getStoredCredentialId,
  clearStoredCredentialId,
  formatAuthError,
  type AuthSession,
} from "../lib/mera/auth";

export interface AccountContextType {
  address: Address | null;
  account: PrivateKeyAccount | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletClient: WalletClient | null;
  error: string | null;
  isPrfUnavailable: boolean;
  storedCredentialId: string | null;
  signUp: (username?: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AccountContext = createContext<AccountContextType | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [account, setAccount] = useState<PrivateKeyAccount | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrfUnavailable, setIsPrfUnavailable] = useState(false);
  const [storedCredentialId, setStoredCredentialIdState] = useState<string | null>(null);

  // Sync stored credential ID from localStorage on mount
  useEffect(() => {
    const credId = getStoredCredentialId();
    setStoredCredentialIdState(credId);
  }, []);

  const handleAuthSuccess = useCallback((session: AuthSession) => {
    setAddress(session.account.address);
    setAccount(session.account);
    setWalletClient(session.walletClient);
    setStoredCredentialIdState(session.credentialId);
    setError(null);
    setIsPrfUnavailable(false);
  }, []);

  const signUp = useCallback(async (username?: string) => {
    setIsConnecting(true);
    setError(null);
    setIsPrfUnavailable(false);
    try {
      const session = await signUpWithPasskey(username);
      handleAuthSuccess(session);
    } catch (err) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      setIsPrfUnavailable(formatted.isPrfUnavailable);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [handleAuthSuccess]);

  const signIn = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setIsPrfUnavailable(false);
    try {
      const session = await signInWithPasskey();
      handleAuthSuccess(session);
    } catch (err) {
      const formatted = formatAuthError(err);
      setError(formatted.message);
      setIsPrfUnavailable(formatted.isPrfUnavailable);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [handleAuthSuccess]);

  const signOut = useCallback(() => {
    setAddress(null);
    setAccount(null);
    setWalletClient(null);
    clearStoredCredentialId();
    setStoredCredentialIdState(null);
    setError(null);
    setIsPrfUnavailable(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsPrfUnavailable(false);
  }, []);

  return (
    <AccountContext.Provider
      value={{
        address,
        account,
        isConnected: !!address,
        isConnecting,
        walletClient,
        error,
        isPrfUnavailable,
        storedCredentialId,
        signUp,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextType {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
