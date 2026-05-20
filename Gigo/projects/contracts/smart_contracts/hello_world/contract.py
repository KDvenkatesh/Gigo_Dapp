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


class RideContract(ARC4Contract):
    """
    Optimized Ride-Sharing Escrow Contract (V5 - Robust Verification).
    """

    def __init__(self) -> None:
        self.gigo_asset_id = GlobalState(UInt64(762258472))
        self.escrow_customer = BoxMap(UInt64, Account, key_prefix="c_")
        self.escrow_fare = BoxMap(UInt64, UInt64, key_prefix="f_")

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
    def init_escrow(self, pay_txn: gtxn.AssetTransferTransaction, ride_id: arc4.UInt64) -> None:
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
    def payout(self, ride_id: arc4.UInt64, rider: Account) -> None:
        rid = ride_id.native
        customer, exists = self.escrow_customer.maybe(rid)
        assert exists, "escrow not found"
        # Allow either the customer themselves OR the platform admin (creator) to release payment.
        # The admin releases payment automatically after GPS-verified ride completion.
        assert (Txn.sender == customer) or (Txn.sender == Global.creator_address), "only customer or admin can release payment"

        fare = self.escrow_fare[rid]

        itxn.AssetTransfer(
            xfer_asset=self.gigo_asset_id.value,
            asset_receiver=rider,
            asset_amount=fare,
            fee=0
        ).submit()

        del self.escrow_customer[rid]
        del self.escrow_fare[rid]

    @arc4.abimethod
    def cancel_and_refund(self, ride_id: arc4.UInt64) -> None:
        rid = ride_id.native
        customer, exists = self.escrow_customer.maybe(rid)
        assert exists, "escrow not found"
        # Allow either the customer themselves OR the platform admin (creator) to refund.
        # The admin triggers auto-refund when driver doesn't arrive within 10 minutes.
        assert (Txn.sender == customer) or (Txn.sender == Global.creator_address), "only customer or admin can refund"

        fare = self.escrow_fare[rid]

        itxn.AssetTransfer(
            xfer_asset=self.gigo_asset_id.value,
            asset_receiver=customer,
            asset_amount=fare,
            fee=0
        ).submit()

        del self.escrow_customer[rid]
        del self.escrow_fare[rid]
