import algosdk from 'algosdk'

export const rideAbiMethods = {
  init_escrow: new algosdk.ABIMethod({
    name: 'initialize_escrow',
    args: [
      { name: 'pay_txn', type: 'axfer' },
      { name: 'ride_id', type: 'uint64' },
    ],
    returns: { type: 'void' },
  }),
  accept_ride: new algosdk.ABIMethod({
    name: 'accept_ride',
    args: [
      { name: 'ride_id', type: 'uint64' },
      { name: 'driver', type: 'address' },
    ],
    returns: { type: 'void' },
  }),
  payout: new algosdk.ABIMethod({
    name: 'payout',
    args: [
      { name: 'ride_id', type: 'uint64' },
      { name: 'rider', type: 'address' },
    ],
    returns: { type: 'void' },
  }),
  cancel_and_refund: new algosdk.ABIMethod({
    name: 'cancel_and_refund',
    args: [
      { name: 'ride_id', type: 'uint64' },
    ],
    returns: { type: 'void' },
  }),
  opt_in_to_asa: new algosdk.ABIMethod({
    name: 'opt_in_to_asa',
    args: [],
    returns: { type: 'void' },
  }),
}
