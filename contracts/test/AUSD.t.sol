// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {AUSD} from "../src/AUSD.sol";

contract AUSDTest is Test {
    AUSD public token;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        token = new AUSD();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "Agora USD");
        assertEq(token.symbol(), "AUSD");
        assertEq(token.decimals(), 6);
    }

    function test_MintAndBurn() public {
        token.mint(alice, 1_000 * 1e6);
        assertEq(token.balanceOf(alice), 1_000 * 1e6);
        assertEq(token.totalSupply(), 1_000 * 1e6);

        token.burn(alice, 400 * 1e6);
        assertEq(token.balanceOf(alice), 600 * 1e6);
        assertEq(token.totalSupply(), 600 * 1e6);
    }

    function test_Burn_RevertsIf_InsufficientBalance() public {
        token.mint(alice, 100 * 1e6);
        vm.expectRevert(abi.encodeWithSelector(AUSD.InsufficientBalance.selector, alice, 100 * 1e6, 200 * 1e6));
        token.burn(alice, 200 * 1e6);
    }

    function test_Transfer() public {
        token.mint(alice, 500 * 1e6);
        vm.prank(alice);
        token.transfer(bob, 200 * 1e6);

        assertEq(token.balanceOf(alice), 300 * 1e6);
        assertEq(token.balanceOf(bob), 200 * 1e6);
    }

    function test_Transfer_RevertsIf_InsufficientBalance() public {
        token.mint(alice, 100 * 1e6);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AUSD.InsufficientBalance.selector, alice, 100 * 1e6, 150 * 1e6));
        token.transfer(bob, 150 * 1e6);
    }

    function test_Transfer_RevertsIf_InvalidRecipient() public {
        token.mint(alice, 100 * 1e6);
        vm.prank(alice);
        vm.expectRevert(AUSD.InvalidRecipient.selector);
        token.transfer(address(0), 50 * 1e6);
    }

    function test_ApproveAndTransferFrom() public {
        token.mint(alice, 1_000 * 1e6);
        vm.prank(alice);
        token.approve(bob, 400 * 1e6);
        assertEq(token.allowance(alice, bob), 400 * 1e6);

        vm.prank(bob);
        token.transferFrom(alice, bob, 300 * 1e6);

        assertEq(token.balanceOf(alice), 700 * 1e6);
        assertEq(token.balanceOf(bob), 300 * 1e6);
        assertEq(token.allowance(alice, bob), 100 * 1e6);
    }

    function test_TransferFrom_InfiniteAllowance() public {
        token.mint(alice, 1_000 * 1e6);
        vm.prank(alice);
        token.approve(bob, type(uint256).max);

        vm.prank(bob);
        token.transferFrom(alice, bob, 300 * 1e6);

        assertEq(token.allowance(alice, bob), type(uint256).max);
    }

    function test_TransferFrom_RevertsIf_InsufficientAllowance() public {
        token.mint(alice, 500 * 1e6);
        vm.prank(alice);
        token.approve(bob, 100 * 1e6);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(AUSD.InsufficientAllowance.selector, bob, 100 * 1e6, 200 * 1e6));
        token.transferFrom(alice, bob, 200 * 1e6);
    }

    function test_Approve_RevertsIf_InvalidSpender() public {
        vm.prank(alice);
        vm.expectRevert(AUSD.InvalidSpender.selector);
        token.approve(address(0), 100 * 1e6);
    }

    function test_Mint_RevertsIf_InvalidRecipient() public {
        vm.expectRevert(AUSD.InvalidRecipient.selector);
        token.mint(address(0), 100 * 1e6);
    }
}
