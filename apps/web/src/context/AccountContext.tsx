"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { WalletClient, Address } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import {
  signUpWithPasskey,
  signInWithPasskey,
  getTestnetDevPasskeySession,
  TESTNET_PASSKEY_CREDENTIAL_ID,
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
  connectTestnetPasskey: () => void;
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

  const handleAuthSuccess = useCallback((session: AuthSession) => {
    setAddress(session.account.address);
    setAccount(session.account);
    setWalletClient(session.walletClient);
    setStoredCredentialIdState(session.credentialId);
    setError(null);
    setIsPrfUnavailable(false);
  }, []);

  // Sync stored credential ID from localStorage on mount and auto-restore if active
  useEffect(() => {
    const credId = getStoredCredentialId();
    setStoredCredentialIdState(credId);
    if (credId === TESTNET_PASSKEY_CREDENTIAL_ID) {
      try {
        const session = getTestnetDevPasskeySession();
        handleAuthSuccess(session);
      } catch (e) {
        console.warn("Failed to restore testnet passkey session:", e);
      }
    }
  }, [handleAuthSuccess]);

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

  const connectTestnetPasskey = useCallback(() => {
    setIsConnecting(true);
    setError(null);
    setIsPrfUnavailable(false);
    try {
      const session = getTestnetDevPasskeySession();
      handleAuthSuccess(session);
    } catch (err: any) {
      setError(err?.message || "Failed to connect testnet passkey");
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
        connectTestnetPasskey,
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
