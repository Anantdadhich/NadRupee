import {
  createPasskeyWithPrfOutput,
  getPasskeyPrfOutput,
  isMeraError,
} from "@category-labs/mera";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { createWalletClient, http, toHex, keccak256, toBytes, type WalletClient } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { monadTestnet } from "../monad/chain";

const CREDENTIAL_STORAGE_KEY = "nadrupee_mera_credential_id";
export const TESTNET_PASSKEY_CREDENTIAL_ID = "testnet-local-passkey-v1";

export interface AuthSession {
  account: PrivateKeyAccount;
  walletClient: WalletClient;
  credentialId: string;
}

/**
 * Derives a standard Ethereum / Monad EOA (BIP-44 path m/44'/60'/0'/0/0)
 * deterministically from 32 bytes of WebAuthn PRF output.
 */
export function deriveAccountFromPrf(prfOutput: Uint8Array): PrivateKeyAccount {
  const mnemonic = entropyToMnemonic(prfOutput, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive("m/44'/60'/0'/0/0");

  if (!child.privateKey) {
    throw new Error("Failed to derive private key from WebAuthn PRF output");
  }

  const privateKeyHex = toHex(child.privateKey);
  return privateKeyToAccount(privateKeyHex);
}

export function getStoredCredentialId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CREDENTIAL_STORAGE_KEY);
}

export function setStoredCredentialId(credentialId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
  }
}

export function clearStoredCredentialId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
  }
}

/**
 * Pre-configured deterministic testnet passkey session for local development
 * and testnet evaluation without requiring hardware biometric gestures.
 */
export function getTestnetDevPasskeySession(): AuthSession {
  const seedHex = keccak256(toBytes("NADRUPEE_TESTNET_DEV_PASSKEY_SEED_V1"));
  const prfOutput = toBytes(seedHex);
  const account = deriveAccountFromPrf(prfOutput);
  const credentialId = TESTNET_PASSKEY_CREDENTIAL_ID;
  setStoredCredentialId(credentialId);

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  return { account, walletClient, credentialId };
}

/**
 * Sign up ceremony: creates a new WebAuthn passkey requiring the PRF extension
 * and derives the Monad EOA from the initial PRF output.
 * Stores ONLY the non-sensitive credentialId in localStorage.
 */
export async function signUpWithPasskey(username?: string): Promise<AuthSession> {
  const hostname = window.location.hostname;
  const userIdentifier = username?.trim() || "freelancer@nadrupee";

  const { credentialId, prfOutput } = await createPasskeyWithPrfOutput({
    rp: {
      id: hostname,
      name: "NadRupee",
    },
    user: {
      name: userIdentifier,
      displayName: `Freelancer (${userIdentifier})`,
    },
  });

  setStoredCredentialId(credentialId);

  const account = deriveAccountFromPrf(prfOutput);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  return { account, walletClient, credentialId };
}

/**
 * Sign in ceremony: evaluates the PRF output of an existing passkey
 * and reconstructs the exact same Monad EOA in memory.
 */
export async function signInWithPasskey(): Promise<AuthSession> {
  const storedCredentialId = getStoredCredentialId();

  if (storedCredentialId === TESTNET_PASSKEY_CREDENTIAL_ID) {
    return getTestnetDevPasskeySession();
  }

  const hostname = window.location.hostname;

  const { credentialId, prfOutput } = await getPasskeyPrfOutput({
    rpId: hostname,
    credential: storedCredentialId
      ? { credentialId: storedCredentialId, transports: [] }
      : undefined,
  });

  setStoredCredentialId(credentialId);

  const account = deriveAccountFromPrf(prfOutput);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  return { account, walletClient, credentialId };
}

/**
 * Flags explicitly if PRF_UNAVAILABLE occurred without silent fallback.
 */
export function isPrfUnavailableError(error: unknown): boolean {
  if (isMeraError(error)) {
    return error.code === "PRF_UNAVAILABLE";
  }
  if (error instanceof Error) {
    return (
      error.message.includes("PRF_UNAVAILABLE") ||
      error.message.toLowerCase().includes("prf is not supported")
    );
  }
  return false;
}

export function formatAuthError(error: unknown): { message: string; isPrfUnavailable: boolean } {
  const isPrf = isPrfUnavailableError(error);

  if (isPrf) {
    return {
      message:
        "PRF_UNAVAILABLE: WebAuthn PRF extension is not supported or enabled by this authenticator/browser. On Desktop Chrome, passkeys must be saved to Google Password Manager (not local Mac profile). On Safari/iOS, iCloud Keychain with biometrics is supported.",
      isPrfUnavailable: true,
    };
  }

  if (isMeraError(error)) {
    if (error.code === "PASSKEY_OPERATION_FAILED") {
      return {
        message: "Passkey operation was cancelled or failed by user gesture.",
        isPrfUnavailable: false,
      };
    }
    return {
      message: `Passkey Error [${error.code}]: ${error.message}`,
      isPrfUnavailable: false,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      isPrfUnavailable: false,
    };
  }

  return {
    message: "Unknown error during passkey ceremony.",
    isPrfUnavailable: false,
  };
}
