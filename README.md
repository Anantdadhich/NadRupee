# NadRupee

> **Instant Escrow Settlement & INR Fiat Off-Ramp for Freelancers on Monad**

NadRupee bridges global clients and Indian freelancers on **Monad Testnet**. Stablecoin settlement is instantaneous and low-cost, combined with passkey onboarding so Indian freelancers receive funds the moment work is funded — without managing private keys or holding gas tokens.

---

## Key Highlights

- **Instant 80/20 Escrow**: Clients lock Agora AUSD. Freelancers can immediately claim an **80% advance**, with the remaining **20%** released upon milestone sign-off.
- **₹0 Gas Meta-Transactions**: Monad Relayer (`0x47Cc14B5...`) sponsors meta-transactions via EIP-712 permits.
- **Instant INR Off-Ramp**: Direct cash-out to Indian bank accounts via **UPI VPA** and **IMPS** rails with real-time FX conversion and Section 194S TDS compliance.
- **Dual Platforms**: Fully responsive Next.js web portal (`apps/web`) and React Native / Expo mobile app (`apps/mobile`).

---

## Monad Testnet Contracts & Deployment

All smart contracts are deployed and verified on **Monad Testnet (Chain ID: `10143`)**:

| Contract | Address | Explorer Link |
| :--- | :--- | :--- |
| **Instant Settlement Factory** | `0x8468587Af422ad440F58a57E955eCA6A970b5375` | [View on Explorer](https://testnet.monadexplorer.com/address/0x8468587Af422ad440F58a57E955eCA6A970b5375) |
| **CTK / AUSD Pair** | `0x1Aa8958Aa34cEC8096EF4381cb335effe977b0ae` | [View on Explorer](https://testnet.monadexplorer.com/address/0x1Aa8958Aa34cEC8096EF4381cb335effe977b0ae) |
| **Whitelister Contract** | `0x7c10F56d6f04a51376393a1C3670e966863F6BD5` | [View on Explorer](https://testnet.monadexplorer.com/address/0x7c10F56d6f04a51376393a1C3670e966863F6BD5) |
| **Escrow Contract** | `0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4` | [View on Explorer](https://testnet.monadexplorer.com/address/0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4) |
| **Agora AUSD Token** | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` | [View on Explorer](https://testnet.monadexplorer.com/address/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC) |
| **Sponsored Relayer** | `0x47Cc14B5D120E404d6fddf86C136B392529d1123` | [View on Explorer](https://testnet.monadexplorer.com/address/0x47Cc14B5D120E404d6fddf86C136B392529d1123) |

---

## Monorepo Structure

```
.
├── apps/
│   ├── web/            # Next.js 16 (Turbopack) frontend & API routes (Tailwind CSS v4, Viem)
│   └── mobile/         # React Native & Expo mobile application (Cross-platform iOS/Android/Web)
├── contracts/          # Foundry project for Escrow.sol smart contracts & fuzz tests
└── package.json        # NPM Workspaces root configuration
```

---

##  Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Foundry (`forge`) for contract testing

### 1. Web Application (`apps/web`)

```bash
# Run web development server from root
npm run dev

# Or build for production
npm run build
```

The web application runs at `http://localhost:3000`.

### 2. Mobile Application (`apps/mobile`)

```bash
# Start mobile app via Expo from root
npm run mobile:start

# Or run directly inside apps/mobile
cd apps/mobile
npm run web      # Web preview
npm run ios      # iOS simulator
npm run android  # Android simulator
```

The mobile bundler runs at `http://localhost:8081`.

### 3. Smart Contracts (`contracts`)

```bash
cd contracts

# Build contracts
forge build

# Run unit & fuzz tests
forge test
```

---

## Security & Architecture

- **EIP-712 Meta-Transactions**: Gasless permit authorization for escrow interactions.
- **Biometric Passkey Authentication**: Mera / WebAuthn PRF key derivation for seedless sign-in.
- **Universal Storage Adapter**: Fail-safe cross-platform storage fallback between native runtimes and browser local storage.
- **Indian Banking Compliance**: Automated 1% Section 194S TDS calculation and authentic 12-digit IMPS UTR transaction reconciliation.
