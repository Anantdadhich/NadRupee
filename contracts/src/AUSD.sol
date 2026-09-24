// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./IERC20.sol";

/**
 * @title AUSD
 * @notice Agora USD Stablecoin for Monad Testnet Settlement.
 * @dev 6 decimals matching Agora / USDC standard. Includes public testnet mint for funding.
 */
contract AUSD is IERC20 {
    string public constant name = "Agora USD";
    string public constant symbol = "AUSD";
    uint8 public constant decimals = 6;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    error InsufficientBalance(address account, uint256 available, uint256 required);
    error InsufficientAllowance(address spender, uint256 available, uint256 required);
    error InvalidRecipient();
    error InvalidSpender();

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        if (spender == address(0)) revert InvalidSpender();
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) {
                revert InsufficientAllowance(msg.sender, currentAllowance, amount);
            }
            unchecked {
                _allowances[from][msg.sender] = currentAllowance - amount;
            }
            emit Approval(from, msg.sender, _allowances[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Testnet faucet minting for clients and testing.
     * @param to Recipient address
     * @param amount Amount of AUSD to mint
     */
    function mint(address to, uint256 amount) external {
        if (to == address(0)) revert InvalidRecipient();
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Burn tokens from account.
     * @param from Account to burn tokens from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external {
        uint256 balance = _balances[from];
        if (balance < amount) {
            revert InsufficientBalance(from, balance, amount);
        }
        unchecked {
            _balances[from] = balance - amount;
            _totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert InvalidRecipient();
        uint256 balance = _balances[from];
        if (balance < amount) {
            revert InsufficientBalance(from, balance, amount);
        }
        unchecked {
            _balances[from] = balance - amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
