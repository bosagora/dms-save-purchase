// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.2;

contract StorePurchaseStorage {
    struct BlockHeader {
        uint64 height;
        bytes32 curBlock;
        bytes32 prevBlock;
        bytes32 merkleRoot;
        uint64 timestamp;
        string CID;
    }

    struct BlockHeight {
        uint64 height;
        bool exists;
    }

    /// @dev The most recent block height
    uint64 internal lastHeight;

    /// @dev Array containing block headers
    BlockHeader[] internal blockArray;

    /// @dev Block map with block hash as key
    mapping(bytes32 => BlockHeight) internal blockMap;
}
