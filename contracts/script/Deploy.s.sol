// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {AUSD} from "../src/AUSD.sol";

/**
 * @title DeployScript
 * @notice Deployment script for NadRupee on Monad Testnet (Chain ID 10143).
 */
contract DeployScript is Script {
    function run() external returns (address ausdAddress, address escrowAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("=== NadRupee Deployment on Monad Testnet ===");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        address configuredAusd = vm.envOr("AUSD_ADDRESS", address(0));
        uint256 partialBps = vm.envOr("PARTIAL_BPS", uint256(8000));
        uint256 timeoutWindow = vm.envOr("TIMEOUT_WINDOW", uint256(7 days));

        vm.startBroadcast(deployerPrivateKey);

        if (configuredAusd == address(0)) {
            console2.log("Deploying AUSD token on Monad testnet...");
            AUSD ausd = new AUSD();
            ausdAddress = address(ausd);
            console2.log("AUSD Token deployed at:", ausdAddress);
        } else {
            ausdAddress = configuredAusd;
            console2.log("Using existing AUSD token at:", ausdAddress);
        }

        console2.log("Deploying Escrow contract...");
        Escrow escrow = new Escrow(ausdAddress, partialBps, timeoutWindow);
        escrowAddress = address(escrow);

        console2.log("Escrow deployed at:", escrowAddress);
        console2.log("Configuration:");
        console2.log("  - Settlement Token:", ausdAddress);
        console2.log("  - Partial Release BPS:", partialBps, "(80%)");
        console2.log("  - Timeout Window (sec):", timeoutWindow, "(7 days)");
        console2.log("===========================================");

        vm.stopBroadcast();
    }
}
