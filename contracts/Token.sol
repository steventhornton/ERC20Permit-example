// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20Permit {
    constructor(uint256 _initialSupply) ERC20Permit("Steven") ERC20("Steven", "SET") {
        _mint(msg.sender, _initialSupply);
    }
}
