#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod trading_pair {
    use erc20::Erc20;
    #[cfg(not(feature = "ink-as-dependency"))]
    use ink_storage::Lazy;
    use ink_env::call::FromAccountId;
    use ink_prelude::string::String;

    #[ink(storage)]
    pub struct TradingPair {
        token_a: Lazy<Erc20>,
        token_b: Lazy<Erc20>,
    }

    impl TradingPair {
        #[ink(constructor)]
        pub fn new(token_a_id: AccountId, token_b_id: AccountId) -> Self {
            let token_a = Erc20::from_account_id(token_a_id);
            let token_b = Erc20::from_account_id(token_b_id);

            Self {
                token_a: Lazy::new(token_a),
                token_b: Lazy::new(token_b),
            }
        }

        #[ink(message)]
        pub fn get_info(&self) -> (String, String) {
            let token_a = self.token_a.symbol();
            let token_b = self.token_b.symbol();

            (token_a, token_b)
        }
    }
}
