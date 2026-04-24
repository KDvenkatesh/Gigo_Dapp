from algopy import (
    ARC4Contract,
    GlobalState,
    BoxMap,
    UInt64,
    Bytes,
    Account,
    Txn,
    Global,
    gtxn,
    itxn,
    arc4,
    op,
)


class RideContract(ARC4Contract):
    """
    Decentralized ride-sharing contract with OTP escrow on Algorand.
    Status lifecycle: REQUESTED → RIDER_ASSIGNED → RIDE_STARTED → RIDE_COMPLETED → PAID
    """

    def __init__(self) -> None:
        self.next_ride_id = GlobalState(UInt64(0))

        self.ride_customer = BoxMap(UInt64, Account, key_prefix="cu_")
        self.ride_rider = BoxMap(UInt64, Account, key_prefix="ri_")
        self.ride_status = BoxMap(UInt64, Bytes, key_prefix="st_")
        self.ride_pickup = BoxMap(UInt64, Bytes, key_prefix="pu_")
        self.ride_drop = BoxMap(UInt64, Bytes, key_prefix="dr_")
        self.ride_fare = BoxMap(UInt64, UInt64, key_prefix="fa_")
        self.ride_otp_hash = BoxMap(UInt64, Bytes, key_prefix="oh_")
        self.payment_locked = BoxMap(UInt64, Bytes, key_prefix="pl_")

    @arc4.abimethod
    def createRide(
        self,
        pickup_location_hash: Bytes,
        drop_location_hash: Bytes,
        fare_price: arc4.UInt64,
    ) -> arc4.UInt64:
        assert pickup_location_hash != Bytes(b""), "pickup location required"
        assert drop_location_hash != Bytes(b""), "drop location required"
        assert fare_price.native > UInt64(0), "fare must be greater than zero"

        ride_id = self.next_ride_id.value
        self.next_ride_id.value = ride_id + UInt64(1)

        self.ride_customer[ride_id] = Txn.sender
        self.ride_pickup[ride_id] = pickup_location_hash
        self.ride_drop[ride_id] = drop_location_hash
        self.ride_fare[ride_id] = fare_price.native
        self.ride_status[ride_id] = Bytes(b"REQUESTED")

        return arc4.UInt64(ride_id)

    @arc4.abimethod
    def acceptRide(self, ride_id: arc4.UInt64) -> None:
        """
        Any rider can accept a ride in REQUESTED state.
        """
        rid = ride_id.native

        status, exists = self.ride_status.maybe(rid)
        assert exists, "ride does not exist"
        assert status == Bytes(b"REQUESTED"), "ride is not in REQUESTED state"

        # FIX: Properly unpack the (value, exists) tuple from maybe()
        rider_value, rider_already_exists = self.ride_rider.maybe(rid)
        assert not rider_already_exists, "ride already has a rider"

        self.ride_rider[rid] = Txn.sender
        self.ride_status[rid] = Bytes(b"RIDER_ASSIGNED")

    @arc4.abimethod
    def storeOTP(self, ride_id: arc4.UInt64, otp: Bytes) -> None:
        """
        Called by the oracle/backend after a rider is assigned.
        Stores the raw OTP for later verification.
        """
        rid = ride_id.native

        status, exists = self.ride_status.maybe(rid)
        assert exists, "ride does not exist"
        assert status == Bytes(b"RIDER_ASSIGNED"), "ride must be in RIDER_ASSIGNED state"

        assert otp != Bytes(b""), "OTP cannot be empty"

        self.ride_otp_hash[rid] = otp


    @arc4.abimethod
    def verifyOTPAndStartRide(
        self,
        ride_id: arc4.UInt64,
        otp_input: Bytes,
    ) -> None:
        """
        Rider submits the OTP. Contract compares it directly to the stored OTP.
        Customer must include a payment transaction in the same atomic group.
        """
        rid = ride_id.native

        status, exists = self.ride_status.maybe(rid)
        assert exists, "ride does not exist"
        assert status == Bytes(b"RIDER_ASSIGNED"), "ride must be in RIDER_ASSIGNED state"

        rider, rider_exists = self.ride_rider.maybe(rid)
        assert rider_exists, "no rider assigned"
        assert Txn.sender == rider, "only the assigned rider can start the ride"

        stored_otp, otp_exists = self.ride_otp_hash.maybe(rid)
        assert otp_exists, "OTP not set"
        assert otp_input == stored_otp, "OTP verification failed"

        fare, f_exists = self.ride_fare.maybe(rid)
        assert f_exists and fare > UInt64(0), "fare not set"

        customer, c_exists = self.ride_customer.maybe(rid)
        assert c_exists, "customer not found"

        assert Txn.group_index > UInt64(0), "payment transaction missing from group"
        pay_txn = gtxn.PaymentTransaction(Txn.group_index - UInt64(1))

        assert pay_txn.sender == customer, "payment must come from the customer"
        assert pay_txn.receiver == Global.current_application_address, "payment must go to contract escrow"
        assert pay_txn.amount == fare, "payment amount must match the fare"

        self.payment_locked[rid] = Bytes(b"LOCKED")
        self.ride_status[rid] = Bytes(b"RIDE_STARTED")

    @arc4.abimethod
    def endRide(self, ride_id: arc4.UInt64) -> None:
        rid = ride_id.native

        status, exists = self.ride_status.maybe(rid)
        assert exists, "ride does not exist"
        assert status == Bytes(b"RIDE_STARTED"), "ride must be in RIDE_STARTED state"

        rider, rider_exists = self.ride_rider.maybe(rid)
        assert rider_exists and Txn.sender == rider, "only the assigned rider can end the ride"

        self.ride_status[rid] = Bytes(b"RIDE_COMPLETED")

    @arc4.abimethod
    def releasePayment(self, ride_id: arc4.UInt64) -> None:
        rid = ride_id.native

        status, exists = self.ride_status.maybe(rid)
        assert exists, "ride does not exist"
        assert status == Bytes(b"RIDE_COMPLETED"), "ride must be in RIDE_COMPLETED state"

        rider, rider_exists = self.ride_rider.maybe(rid)
        assert rider_exists, "rider not found"

        fare, f_exists = self.ride_fare.maybe(rid)
        assert f_exists and fare > UInt64(0), "fare not set"

        itxn.Payment(
            receiver=rider,
            amount=fare,
            fee=0,
        ).submit()

        self.ride_status[rid] = Bytes(b"PAID")
