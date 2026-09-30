export interface OnmetaUser {
  email: string;
  token?: string;
  tokenExpiresAt?: number;
}

export interface OnmetaKycStatus {
  success: boolean;
  isKycVerified: boolean;
  isPartialKyc: boolean;
  email: string;
  status: "VERIFIED" | "PARTIAL" | "NOT_STARTED" | "PENDING_REVIEW";
  kycDetails?: {
    panNumber?: string;
    fullName?: string;
    aadhaarLast4?: string;
    verifiedAt?: string;
  };
}

export interface OnmetaBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountNumberMasked: string;
  ifsc: string;
  accountHolderName: string;
  bankStatus: "SUCCESS" | "PENDING" | "FAILED" | "MANUAL";
  reason?: string;
  isPrimary?: boolean;
  createdAt: string;
}

export interface OnmetaUpiId {
  id: string;
  upiId: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  accountHolderName?: string;
  createdAt: string;
}

export interface OnmetaSellQuote {
  success: boolean;
  quotationId: string;
  fromToken: string;
  toCurrency: string;
  chainId: number;
  chainName: string;
  cryptoAmount: number;
  fiatAmount: number;
  exchangeRate: number;
  platformFeeInr: number;
  tdsInr: number;
  netPayoutInr: number;
  validTill: number;
  validitySeconds: number;
  depositAddress: string;
}

export type OnmetaOrderStatus =
  | "cryptoInit"
  | "fiatPending"
  | "fiatDeemed"
  | "completed"
  | "fiatFailed";

export interface OnmetaOfframpOrder {
  orderId: string;
  status: OnmetaOrderStatus;
  userEmail: string;
  cryptoToken: string;
  chainId: number;
  chainName: string;
  cryptoAmount: number;
  exchangeRate: number;
  fiatAmount: number;
  netPayoutInr: number;
  depositAddress: string;
  bankAccount?: OnmetaBankAccount;
  upiId?: string;
  txHash?: string;
  utr?: string;
  createdAt: string;
  updatedAt: string;
  note?: string;
}
