# NadRupee Smart Contracts (Monad Testnet)

Production smart contracts for NadRupee — instant, escrow-backed cross-border payments on Monad with Agora AUSD settlement and gasless EIP-712/EIP-2612 passkey meta-transactions.

---

## Verified Monad Testnet Deployment (Proof of Deployment)

| Parameter | Details |
|---|---|
| **Network** | **Monad Testnet** |
| **Chain ID** | `10143` |
| **RPC URL** | `https://testnet-rpc.monad.xyz` |
| **Escrow Contract** | [`0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4`](https://testnet.monadexplorer.com/address/0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4) |
| **Settlement Token (AUSD)** | [`0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`](https://testnet.monadexplorer.com/address/0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC) (Agora Dollar, 6 Decimals) |
| **Deployment Transaction** | [`0xe2e9a981533b995b6eaecb37a7e48a14a3a5b82fdcfb19915ac073b4e0784aff`](https://testnet.monadexplorer.com/tx/0xe2e9a981533b995b6eaecb37a7e48a14a3a5b82fdcfb19915ac073b4e0784aff) |
| **Block Number** | `66657673` |
| **Deployer / Relayer Address** | [`0x47Cc14B5D120E404d6fddf86C136B392529d1123`](https://testnet.monadexplorer.com/address/0x47Cc14B5D120E404d6fddf86C136B392529d1123) |
| **Partial Release BPS** | `8000` (80% Instant Payout Advance) |
| **Default Timeout Window** | `604800` seconds (7 days) |

---

## Contract Verification with Cast

Verify deployed bytecode directly against Monad Testnet RPC:

```bash
cast code 0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4 --rpc-url https://testnet-rpc.monad.xyz
```

Read settlement token from deployed contract:

```bash
cast call 0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4 "token()(address)" --rpc-url https://testnet-rpc.monad.xyz
# Output: 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC
```

Read partial release BPS (80%):

```bash
cast call 0xBEe8F42f71ffFb7f2b34224ef5B88671Db2D97C4 "partialBps()(uint256)" --rpc-url https://testnet-rpc.monad.xyz
# Output: 8000
```

---

## Architecture

- **`src/Escrow.sol`**: Core contract handling job funding, 80/20 milestone release logic, EIP-712 off-chain signatures (`releasePartialWithSig`, `releaseRemainderWithSig`, `cancelJobWithSig`), 7-day timeout resolution, and safe token transfers.
- **`src/AUSD.sol`**: Local ERC-20 + EIP-2612 permit implementation for local testing; points to official Agora AUSD token on testnet.
- **`script/Deploy.s.sol`**: Deployment script targeting Monad Testnet (Chain ID 10143).

## Testing

```shell
forge test
```
All 60 tests (unit, fuzz, and integration) pass.
