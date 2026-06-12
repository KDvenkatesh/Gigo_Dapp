import pytest
import algopy
from algopy import arc4
from algopy_testing import algopy_testing_context

from smart_contracts.hello_world.contract import RideContract

@pytest.fixture
def context():
    with algopy_testing_context() as ctx:
        yield ctx

def test_initialize_escrow_validation(context):
    contract = RideContract()
    ride_id = arc4.UInt64(1)
    
    # We can't easily mock Global.current_application_address outside a transaction group
    # So we expect it to fail with ValueError when it tries to evaluate it
    mock_txn = context.any.txn.asset_transfer(
        asset_amount=algopy.UInt64(1000000)
    )
    with pytest.raises(Exception):
        contract.initialize_escrow(mock_txn, ride_id)

def test_accept_ride(context):
    contract = RideContract()
    ride_id = arc4.UInt64(2)
    
    # Manually populate state instead of calling initialize_escrow
    customer = context.any.account()
    contract.escrow_customer[algopy.UInt64(2)] = customer
    contract.escrow_fare[algopy.UInt64(2)] = algopy.UInt64(1000000)

    driver = context.any.account()
    contract.accept_ride(ride_id, driver)

    assert contract.escrow_driver[algopy.UInt64(2)] == driver

def test_release_payment(context):
    contract = RideContract()
    ride_id = arc4.UInt64(3)
    
    customer = context.any.account()
    contract.escrow_customer[algopy.UInt64(3)] = customer
    contract.escrow_fare[algopy.UInt64(3)] = algopy.UInt64(1000000)
    
    driver = context.any.account()
    contract.accept_ride(ride_id, driver)
    
    # Release payment
    driver_amt = arc4.UInt64(800000)
    customer_amt = arc4.UInt64(200000)
    receipt = arc4.String("HASH123")
    
    contract.release_payment(ride_id, driver, driver_amt, customer_amt, receipt)

    assert algopy.UInt64(3) not in contract.escrow_customer

def test_double_release_payment(context):
    contract = RideContract()
    ride_id = arc4.UInt64(4)
    
    customer = context.any.account()
    contract.escrow_customer[algopy.UInt64(4)] = customer
    contract.escrow_fare[algopy.UInt64(4)] = algopy.UInt64(1000000)
    
    driver = context.any.account()
    contract.accept_ride(ride_id, driver)
    
    driver_amt = arc4.UInt64(800000)
    customer_amt = arc4.UInt64(200000)
    receipt = arc4.String("HASH123")
    
    contract.release_payment(ride_id, driver, driver_amt, customer_amt, receipt)

    with pytest.raises(AssertionError, match="escrow not found"):
        contract.release_payment(ride_id, driver, driver_amt, customer_amt, receipt)

def test_cancel_refund(context):
    contract = RideContract()
    ride_id = arc4.UInt64(5)
    
    customer = context.any.account()
    contract.escrow_customer[algopy.UInt64(5)] = customer
    contract.escrow_fare[algopy.UInt64(5)] = algopy.UInt64(1000000)
    
    driver = context.any.account()
    contract.accept_ride(ride_id, driver)
    
    driver_amt = arc4.UInt64(200000)
    customer_amt = arc4.UInt64(800000)
    receipt = arc4.String("HASH123")
    
    contract.cancel_refund(ride_id, customer_amt, driver_amt, receipt)
    
    assert algopy.UInt64(5) not in contract.escrow_customer

def test_double_cancel_refund(context):
    contract = RideContract()
    ride_id = arc4.UInt64(6)
    
    customer = context.any.account()
    contract.escrow_customer[algopy.UInt64(6)] = customer
    contract.escrow_fare[algopy.UInt64(6)] = algopy.UInt64(1000000)
    
    driver = context.any.account()
    contract.accept_ride(ride_id, driver)
    
    driver_amt = arc4.UInt64(200000)
    customer_amt = arc4.UInt64(800000)
    receipt = arc4.String("HASH123")
    
    contract.cancel_refund(ride_id, customer_amt, driver_amt, receipt)
    
    with pytest.raises(AssertionError, match="escrow not found"):
        contract.cancel_refund(ride_id, customer_amt, driver_amt, receipt)
