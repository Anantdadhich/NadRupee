# NadRupee

> **Instant Escrow Settlement for Cross-Border Freelancers on Monad**

Stablecoin settlement is now fast and cheap enough, and passkey onboarding seamless enough, that an Indian freelancer can get paid the moment a foreign client locks funds — without ever managing a crypto wallet or holding gas tokens.

---

## Monorepo Structure

```
.
├── apps/
│   └── web/            # Next.js 14+ App Router frontend (TypeScript, Tailwind CSS, shadcn/ui)
├── contracts/          # Foundry project for Escrow.sol smart contracts & tests


```

---

## Getting Started

### 1. Web Application (`apps/web`)

```bash
# Run web development server from root
npm run dev

# Or directly in apps/web
cd apps/web
npm run dev
```

The web application runs at `http://localhost:3000`.

### 2. Smart Contracts (`contracts`)

The contracts suite is managed via [Foundry](https://book.getfoundry.sh/).

```bash
cd contracts

# Compile contracts
forge build

# Run unit and fuzz tests
forge test

# Run tests with detailed verbosity
forge test -vvv
```

---
