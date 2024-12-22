contract;

mod errors;
mod interface;

use std::bytes::Bytes;
use std::hash::Hasher;
use std::bytes_conversions::u64::*;
use errors::{MintError, SetError};
use interface::Constructor;
use standards::{src20::SRC20, src3::SRC3, src5::{SRC5, State}, src7::{Metadata, SRC7},};
use sway_libs::{
    asset::{
        base::{
            _name,
            _set_name,
            _set_symbol,
            _symbol,
            _total_assets,
            _total_supply,
            SetAssetAttributes,
        },
        metadata::*,
        supply::{
            _burn,
            _mint,
        },
    },
    ownership::{
        _owner,
        initialize_ownership,
        only_owner,
    },
    pausable::{
        _is_paused,
        _pause,
        _unpause,
        Pausable,
        require_not_paused,
    },
};
use std::{hash::Hash, storage::storage_string::*, string::String};

storage {
    /// The total number of unique assets minted by this contract.
    ///
    /// # Additional Information
    ///
    /// This is the number of NFTs that have been minted.
    total_assets: u64 = 0,
    /// The total number of coins minted for a particular asset.
    ///
    /// # Additional Information
    ///
    /// This should always be 1 for any asset as this is an NFT contract.
    total_supply: StorageMap<AssetId, u64> = StorageMap {},
    /// The name associated with a particular asset.
    name: StorageMap<AssetId, StorageString> = StorageMap {},
    /// The symbol associated with a particular asset.
    symbol: StorageMap<AssetId, StorageString> = StorageMap {},
    /// The metadata associated with a particular asset.
    ///
    /// # Additional Information
    ///
    /// In this NFT contract, there is no metadata provided at compile time. All metadata
    /// is added by users and stored into storage.
    metadata: StorageMetadata = StorageMetadata {},
}

configurable {
    /// The maximum number of NFTs that may be minted.
    MAX_SUPPLY: u64 = 3,
}

impl SRC20 for Contract {
    /// Returns the total number of individual NFTs for this contract.
    ///
    /// # Returns
    ///
    /// * [u64] - The number of assets that this contract has minted.
    ///
    /// # Number of Storage Accesses
    ///
    /// * Reads: `1`
    ///
    /// # Examples
    ///
    /// ```sway
    /// use src20::SRC20;
    ///
    /// fn foo(contract_id: ContractId) {
    ///     let contract_abi = abi(SRC20, contract_id);
    ///     let total_assets = contract_abi.total_assets();
    ///     assert(total_assets != 0);
    /// }
    /// ```
    #[storage(read)]
    fn total_assets() -> u64 {
        _total_assets(storage.total_assets)
    }

    /// Returns the total supply of coins for an asset.
    ///
    /// # Additional Information
    ///
    /// This must always be at most 1 for NFTs.
    ///
    /// # Arguments
    ///
    /// * `asset`: [AssetId] - The asset of which to query the total supply.
    ///
    /// # Returns
    ///
    /// * [Option<u64>] - The total supply of coins for `asset`.
    ///
    /// # Number of Storage Accesses
    ///
    /// * Reads: `1`
    ///
    /// # Examples
    ///
    /// ```sway
    /// use src20::SRC20;
    ///
    /// fn foo(contract_id: ContractId, asset: AssetId) {
    ///     let contract_abi = abi(SRC20, contract_id);
    ///     let total_supply = contract_abi.total_supply(asset).unwrap();
    ///     assert(total_supply == 1);
    /// }
    /// ```
    #[storage(read)]
    fn total_supply(asset: AssetId) -> Option<u64> {
        _total_supply(storage.total_supply, asset)
    }

    /// Returns the name of the asset, such as “Ether”.
    #[storage(read)]
    fn name(asset: AssetId) -> Option<String> {
        _name(storage.name, asset)
    }
    /// Returns the symbol of the asset, such as “ETH”.
    #[storage(read)]
    fn symbol(asset: AssetId) -> Option<String> {
        _symbol(storage.symbol, asset)
    }
    /// Returns the number of decimals the asset uses.
    #[storage(read)]
    fn decimals(_asset: AssetId) -> Option<u8> {
        Some(0u8)
    }
}

fn verify_solution(answer: Bytes) -> bool {
    // Sudoku is a 9x9 grid, so the answer should be 81 bytes long
    if (answer.len() != 81) {
        return false;
    }
    
    // Check that each row, column, and 3x3 square contains the numbers 1-9 exactly once
    // We can do this by checking that the sum of each row, column, and square is 45
    // (1 + 2 + ... + 9 = 45)
    // And also by checking that the product of each row, column, and square is 362880
    // (1 * 2 * ... * 9 = 362880)
    let mut i = 0;
    while i < 9 {
        let mut row_sum = 0;
        let mut row_product = 1;
        let mut col_sum = 0;
        let mut col_product = 1;
        let mut square_sum = 0;
        let mut square_product = 1;
        let mut j = 0;
        while j < 9 {
            let row_index = i * 9 + j;
            let col_index = j * 9 + i;
            let square_index = (i / 3) * 27 + (i % 3) * 3 + (j / 3) * 9 + (j % 3);
            row_sum += answer.get(row_index).unwrap().as_u64();
            row_product *= answer.get(row_index).unwrap().as_u64();
            col_sum += answer.get(col_index).unwrap().as_u64();
            col_product *= answer.get(col_index).unwrap().as_u64();
            square_sum += answer.get(square_index).unwrap().as_u64();
            square_product *= answer.get(square_index).unwrap().as_u64();
            j += 1;
        }
        if (row_sum != 45 || row_product != 362880 || col_sum != 45 || col_product != 362880 || square_sum != 45 || square_product != 362880) {
            return false;
        }
        i += 1;
    }
    true
}

abi Swaydoku {
    #[storage(read, write)]
    fn mint(recipient: Identity, amount: u64, answer: Bytes);
    #[payable]
    #[storage(read, write)]
    fn burn(sub_id: SubId, amount: u64);
}

impl Swaydoku for Contract {
    /// Mints new assets if the answer is correct.
    ///
    /// # Additional Information
    ///
    /// This conforms to the SRC-20 NFT portion of the standard for a maximum
    /// mint amount of 1 coin per asset.
    ///
    /// # Arguments
    ///
    /// * `recipient`: [Identity] - The user to which the newly minted assets are transferred to.
    /// * `amount`: [u64] - The quantity of coins to mint.
    /// * `answer`: [Bytes] - The answer to the sudoku puzzle.
    ///
    /// # Reverts
    ///
    /// * When the contract is paused.
    /// * When amount is greater than one.
    /// * When the asset has already been minted.
    /// * When more than the MAX_SUPPLY NFTs have been minted.
    /// * When the answer is incorrect.
    ///
    /// # Number of Storage Accesses
    ///
    /// * Reads: `3`
    /// * Writes: `2`
    ///
    /// # Examples
    ///
    /// ```sway
    /// use src3::SRC3;
    ///
    /// fn foo(contract_id: ContractId) {
    ///     let contract_abi = abi(SR3, contract_id);
    ///     contract_abi.mint(Identity::ContractId(ContractId::this()), 1, Bytes::with_capacity(81));
    /// }
    /// ```
    #[storage(read, write)]
    fn mint(recipient: Identity, amount: u64, answer: Bytes) {
        require_not_paused();

        let is_correct = verify_solution(answer);
        require(is_correct, MintError::IncorrectAnswer);

        let mut hasher = Hasher::new();
        answer.hash(hasher);
        let sub_id = hasher.sha256();

        // Checks to ensure this is a valid mint.
        let asset = AssetId::new(ContractId::this(), sub_id);
        require(amount == 1, MintError::CannotMintMoreThanOneNFTWithSubId);
        require(
            storage
                .total_supply
                .get(asset)
                .try_read()
                .is_none(),
            MintError::NFTAlreadyMinted,
        );
        require(
            storage
                .total_assets
                .try_read()
                .unwrap_or(0) + amount <= MAX_SUPPLY,
            MintError::MaxNFTsMinted,
        );

        let id = storage.total_assets.read() + 1;
        // let mut name = String::from_ascii_str("Swaydoku NFT #").as_bytes();
        let name = String::from_ascii_str("Swaydoku NFT");
        // name.append(id.to_be_bytes());

        // let name = String::from_ascii(name);
        _set_name(storage.name, asset, name);
        let symbol = String::from_ascii_str("SDOKU");
        _set_symbol(storage.symbol, asset, symbol);
        let key = String::from_ascii_str("solution");
        let metadata = Metadata::Bytes(answer);
        _set_metadata(storage.metadata, asset, key, metadata);

        // Mint the NFT
        let _ = _mint(
            storage
                .total_assets,
            storage
                .total_supply,
            recipient,
            sub_id,
            amount,
        );
    }

    /// Burns assets sent with the given `sub_id`.
    #[payable]
    #[storage(read, write)]
    fn burn(sub_id: SubId, amount: u64) {
        require_not_paused();
        _burn(storage.total_supply, sub_id, amount);
    }
}

impl SRC7 for Contract {
    /// Returns metadata for the corresponding `asset` and `key`.
    ///
    /// # Arguments
    ///
    /// * `asset`: [AssetId] - The asset of which to query the metadata.
    /// * `key`: [String] - The key to the specific metadata.
    ///
    /// # Returns
    ///
    /// * [Option<Metadata>] - `Some` metadata that corresponds to the `key` or `None`.
    ///
    /// # Number of Storage Accesses
    ///
    /// * Reads: `1`
    ///
    /// # Examples
    ///
    /// ```sway
    /// use src_7::{SRC7, Metadata};
    /// use std::string::String;
    ///
    /// fn foo(contract_id: ContractId, asset: AssetId) {
    ///     let contract_abi = abi(SRC7, contract_id);
    ///     let key = String::from_ascii_str("image");
    ///     let data = contract_abi.metadata(asset, key);
    ///     assert(data.is_some());
    /// }
    /// ```
    #[storage(read)]
    fn metadata(asset: AssetId, key: String) -> Option<Metadata> {
        storage.metadata.get(asset, key)
    }
}

impl SRC5 for Contract {
    /// Returns the owner.
    #[storage(read)]
    fn owner() -> State {
        _owner()
    }
}

impl SetAssetAttributes for Contract {
    /// Sets the name of an asset.
    #[storage(write)]
    fn set_name(asset: AssetId, name: String) {
        only_owner();
        require(
            storage
                .name
                .get(asset)
                .read_slice()
                .is_none(),
            SetError::ValueAlreadySet,
        );
        _set_name(storage.name, asset, name);
    }

    /// Sets the symbol of an asset.
    #[storage(write)]
    fn set_symbol(asset: AssetId, symbol: String) {
        only_owner();
        require(
            storage
                .symbol
                .get(asset)
                .read_slice()
                .is_none(),
            SetError::ValueAlreadySet,
        );
        _set_symbol(storage.symbol, asset, symbol);
    }

    /// This function should never be called.
    #[storage(write)]
    fn set_decimals(_asset: AssetId, _decimals: u8) {
        require(false, SetError::ValueAlreadySet);
    }
}

impl SetAssetMetadata for Contract {
    /// Stores metadata for a specific asset and key pair.
    #[storage(read, write)]
    fn set_metadata(asset: AssetId, key: String, metadata: Metadata) {
        require(
            storage
                .metadata
                .get(asset, key)
                .is_none(),
            SetError::ValueAlreadySet,
        );
        _set_metadata(storage.metadata, asset, key, metadata);
    }
}

impl Pausable for Contract {
    /// Pauses the contract.
    #[storage(write)]
    fn pause() {
        only_owner();
        _pause();
    }

    /// Returns whether the contract is paused.
    #[storage(read)]
    fn is_paused() -> bool {
        _is_paused()
    }

    /// Unpauses the contract.
    #[storage(write)]
    fn unpause() {
        only_owner();
        _unpause();
    }
}

impl Constructor for Contract {
    /// Sets the defaults for the contract.
    #[storage(read, write)]
    fn constructor(owner: Identity) {
        initialize_ownership(owner);
    }
}