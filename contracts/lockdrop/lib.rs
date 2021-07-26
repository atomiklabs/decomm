#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod lockdrop {
    use lock::Lock;

    #[ink(storage)]
    pub struct Lockdrop {
        lock_contract_code_hash: Hash,
    }

    impl Lockdrop {
        #[ink(constructor)]
        pub fn new(lock_contract_code_hash: Hash) -> Self {
            Self {
                lock_contract_code_hash,
            }
        }

        #[ink(message,payable)]
        pub fn lock(&mut self) {
            let balance_to_be_locked = self.env().transferred_balance();

            let now = self.env().block_timestamp();
            let unlock_after = now;

            let salt = 2u32.to_le_bytes();

            let lock: Lock = Lock::new(self.env().caller(), unlock_after)
                .endowment(balance_to_be_locked)
                .code_hash(self.lock_contract_code_hash.clone())
                .salt_bytes(salt)
                .instantiate()
                .expect("failed at instantiating the `Lock` contract");

            assert!(lock.balance() >= balance_to_be_locked);
        }
    }
}
