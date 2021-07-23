#![cfg_attr(not(feature = "std"), no_std)]

pub use self::lock::Lock;
use ink_lang as ink;

#[ink::contract]
mod lock {
    #[ink(storage)]
    pub struct Lock {
        owner: AccountId,
        unlock_after: Timestamp,
    }

    impl Lock {
        #[ink(constructor)]
        pub fn new(owner: AccountId, unlock_after: Timestamp) -> Self {
            Self {
                owner,
                unlock_after,
            }
        }

        #[ink(message, payable)]
        pub fn unlock(&mut self) {
            let now = self.env().block_timestamp();

            // check if the lock can be opened yet
            assert!(now > self.unlock_after);

            let caller = self.env().caller();

            // check if the caller is the owner
            assert_eq!(caller, self.owner);

            // send all of your balance to the owner
            match self.env().transfer(caller, self.env().balance()) {
                Err(ink_env::Error::BelowSubsistenceThreshold) => {
                    panic!(
                        "requested transfer would have brought contract\
                        below subsistence threshold!"
                    )
                }
                Err(_) => panic!("transfer failed!"),
                Ok(_) => {}
            }
        }

        #[ink(message)]
        pub fn balance(&self) -> Balance {
            Self::env().balance()
        }
    }
}
