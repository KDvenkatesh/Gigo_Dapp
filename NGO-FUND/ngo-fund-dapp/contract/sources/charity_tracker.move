module charity_tracker::charity_tracker {
    use std::signer;
    use std::string::{String};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::account;

    // --- STRUCTS ---

    /// A central registry to hold shared resources like event handles.
    /// This is created once by the module deployer.
    struct Registry has key {
        expense_events: event::EventHandle<ExpenseRecordedEvent>,
    }

    /// The Charity resource holds the donation balance for an organization.
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct Charity has key {
        balance: coin::Coin<AptosCoin>,
        total_raised: u64,
        total_spent: u64,
    }

    /// Event emitted every time the charity records an expense.
    struct ExpenseRecordedEvent has drop, store {
        charity_address: address,
        expense_amount: u64,
        purpose: String,
        remaining_balance: u64,
    }

    // --- ERROR CONSTANTS ---
    const E_NOT_ADMIN: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_CHARITY_ALREADY_EXISTS: u64 = 3;
    const E_CHARITY_NOT_INITIALIZED: u64 = 4;
    const E_INSUFFICIENT_FUNDS: u64 = 5;
    const E_ZERO_DONATION: u64 = 6;
    const E_INVALID_EXPENSE_AMOUNT: u64 = 7;
    const E_MODULE_NOT_INITIALIZED: u64 = 8;


    // --- ENTRY FUNCTIONS ---

    /// NEW: Must be called ONCE by the deployer to set up the central registry for events.
    public entry fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @charity_tracker, E_NOT_ADMIN);
        assert!(!exists<Registry>(admin_addr), E_ALREADY_INITIALIZED);

        let capability = account::create_capability_for<Registry>(admin);
        move_to(admin, Registry {
            expense_events: event::new_event_handle<ExpenseRecordedEvent>(&capability),
        });
        account::destroy_capability(capability);
    }

    /// The charity owner calls this function once to set up their account.
    public entry fun init_charity(charity_owner: &signer) {
        let charity_address = signer::address_of(charity_owner);
        assert!(!exists<Charity>(charity_address), E_CHARITY_ALREADY_EXISTS);
        move_to(charity_owner, Charity {
            balance: coin::zero<AptosCoin>(),
            total_raised: 0,
            total_spent: 0,
        });
    }
    
    /// Public function to donate to a charity.
    public entry fun donate_with_signer(donor: &signer, charity_address: address, amount: u64) acquires Charity {
        assert!(amount > 0, E_ZERO_DONATION);
        let payment = coin::withdraw<AptosCoin>(donor, amount);
        
        assert!(exists<Charity>(charity_address), E_CHARITY_NOT_INITIALIZED);
        let charity = borrow_global_mut<Charity>(charity_address);
        coin::merge(&mut charity.balance, payment);
        charity.total_raised = charity.total_raised + amount;
    }

    /// MODIFIED: The charity owner now provides a 'purpose' for the expense, which is emitted as an event.
    public entry fun record_expense(
        charity_owner: &signer,
        expense_amount: u64,
        purpose: String,
    ) acquires Charity, Registry {
        let charity_address = signer::address_of(charity_owner);
        assert!(exists<Charity>(charity_address), E_CHARITY_NOT_INITIALIZED);
        assert!(expense_amount > 0, E_INVALID_EXPENSE_AMOUNT);

        let charity = borrow_global_mut<Charity>(charity_address);
        let current_balance = coin::value(&charity.balance);
        assert! (current_balance >= expense_amount, E_INSUFFICIENT_FUNDS);

        let expense_payment = coin::extract(&mut charity.balance, expense_amount);
        coin::deposit(charity_address, expense_payment);
        charity.total_spent = charity.total_spent + expense_amount;
        let new_balance = coin::value(&charity.balance);

        assert!(exists<Registry>(@charity_tracker), E_MODULE_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(@charity_tracker);
        event::emit_event(&mut registry.expense_events, ExpenseRecordedEvent {
            charity_address,
            expense_amount,
            purpose,
            remaining_balance: new_balance,
        });
    }

    // --- VIEW FUNCTION ---
    
    /// A read-only function to get key stats about the charity.
    #[view]
    public fun get_charity_stats(charity_address: address): (u64, u64, u64) acquires Charity {
        assert!(exists<Charity>(charity_address), E_CHARITY_NOT_INITIALIZED);
        let charity = borrow_global<Charity>(charity_address);
        (
            coin::value(&charity.balance),
            charity.total_raised,
            charity.total_spent
        )
    }
}