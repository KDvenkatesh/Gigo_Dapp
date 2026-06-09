from algopy import (
    ARC4Contract,
    GlobalState,
    BoxMap,
    UInt64,
    Account,
    Txn,
    Global,
    gtxn,
    itxn,
    arc4,
)
import algopy

class RideContract(ARC4Contract):
    """
    Optimized Ride-Sharing Escrow Contract (V6 - Settlement Support).
    """

    def __init__(self) -> None:
        self.gigo_asset_id = GlobalState(UInt64(763011769))
        self.recovery_address = GlobalState(Account)
        self.escrow_customer = BoxMap(UInt64, Account, key_prefix="c_")
        self.escrow_fare = BoxMap(UInt64, UInt64, key_prefix="f_")
        self.escrow_driver = BoxMap(UInt64, Account, key_prefix="d_")

    @arc4.abimethod
    def opt_in_to_asa(self) -> None:
        assert Txn.sender == Global.creator_address, "only creator"
        itxn.AssetTransfer(
            xfer_asset=self.gigo_asset_id.value,
            asset_receiver=Global.current_application_address,
            asset_amount=0,
            fee=0
        ).submit()

    @arc4.abimethod
    def set_recovery_address(self, recovery_addr: Account) -> None:
        assert Txn.sender == Global.creator_address, "only creator"
        self.recovery_address.value = recovery_addr

    @arc4.abimethod
    def initialize_escrow(self, pay_txn: gtxn.AssetTransferTransaction, ride_id: arc4.UInt64) -> None:
        """
        Locks GIGC payment. The pay_txn is verified by the network to be an asset transfer
        to this contract for the correct GIGC asset.
        """
        rid = ride_id.native
        assert not self.escrow_customer.maybe(rid)[1], "ride_id already exists"

        # Verify the payment transaction using explicit argument checking
        assert pay_txn.asset_receiver == Global.current_application_address, "wrong receiver"
        assert pay_txn.xfer_asset.id == self.gigo_asset_id.value, "wrong asset"
        assert pay_txn.asset_amount > UInt64(0), "amount must be > 0"

        # Record escrow details
        self.escrow_customer[rid] = pay_txn.sender
        self.escrow_fare[rid] = pay_txn.asset_amount

    @arc4.abimethod
    def accept_ride(self, ride_id: arc4.UInt64, driver: Account) -> None:
        """
        Records the driver for a ride.
        """
        rid = ride_id.native
        assert self.escrow_customer.maybe(rid)[1], "escrow not found"
        assert not self.escrow_driver.maybe(rid)[1], "driver already assigned"
        
        self.escrow_driver[rid] = driver

    @arc4.abimethod
    def release_payment(self, ride_id: arc4.UInt64, driver: Account, driver_amount: arc4.UInt64, customer_amount: arc4.UInt64, receipt_hash: arc4.String) -> None:
        """
        Distributes the escrowed funds according to backend calculations.
        """
        algopy.log(receipt_hash.bytes)
        rid = ride_id.native
        customer, exists = self.escrow_customer.maybe(rid)
        assert exists, "escrow not found"
        assert Txn.sender == Global.creator_address or Txn.sender == self.recovery_address.value, "unauthorized"
        
        fare = self.escrow_fare[rid]
        assert (driver_amount.native + customer_amount.native) <= fare, "amounts exceed escrowed fare"

        if driver_amount.native > UInt64(0):
            itxn.AssetTransfer(
                xfer_asset=self.gigo_asset_id.value,
                asset_receiver=driver,
                asset_amount=driver_amount.native,
                fee=0
            ).submit()

        if customer_amount.native > UInt64(0):
            itxn.AssetTransfer(
                xfer_asset=self.gigo_asset_id.value,
                asset_receiver=customer,
                asset_amount=customer_amount.native,
                fee=0
            ).submit()

        # Delete state
        del self.escrow_customer[rid]
        del self.escrow_fare[rid]
        if self.escrow_driver.maybe(rid)[1]:
            del self.escrow_driver[rid]

        # Refund MBR
        itxn.Payment(
            receiver=customer,
            amount=29_000,
            fee=0
        ).submit()

    @arc4.abimethod
    def cancel_refund(self, ride_id: arc4.UInt64, customer_amount: arc4.UInt64, driver_amount: arc4.UInt64, receipt_hash: arc4.String) -> None:
        """
        Distributes funds during cancellation flows.
        """
        algopy.log(receipt_hash.bytes)
        rid = ride_id.native
        customer, exists = self.escrow_customer.maybe(rid)
        assert exists, "escrow not found"
        assert Txn.sender == Global.creator_address or Txn.sender == self.recovery_address.value, "unauthorized"

        fare = self.escrow_fare[rid]
        assert (customer_amount.native + driver_amount.native) <= fare, "amounts exceed escrowed fare"

        if customer_amount.native > UInt64(0):
            itxn.AssetTransfer(
                xfer_asset=self.gigo_asset_id.value,
                asset_receiver=customer,
                asset_amount=customer_amount.native,
                fee=0
            ).submit()

        if driver_amount.native > UInt64(0):
            driver, d_exists = self.escrow_driver.maybe(rid)
            assert d_exists, "driver not found"
            itxn.AssetTransfer(
                xfer_asset=self.gigo_asset_id.value,
                asset_receiver=driver,
                asset_amount=driver_amount.native,
                fee=0
            ).submit()

        # Delete state
        del self.escrow_customer[rid]
        del self.escrow_fare[rid]
        if self.escrow_driver.maybe(rid)[1]:
            del self.escrow_driver[rid]

        # Refund MBR
        itxn.Payment(
            receiver=customer,
            amount=29_000,
            fee=0
        ).submit()
