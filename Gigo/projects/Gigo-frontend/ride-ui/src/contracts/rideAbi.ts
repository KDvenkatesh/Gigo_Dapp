import algosdk from 'algosdk'

export const rideAbiMethods = {
  createRide: new algosdk.ABIMethod({
    name: 'createRide',
    args: [
      { name: 'pickup_location_hash', type: 'byte[]' },
      { name: 'drop_location_hash', type: 'byte[]' },
      { name: 'fare_price', type: 'uint64' },
    ],
    returns: { type: 'uint64' },
  }),
  acceptRide: new algosdk.ABIMethod({
    name: 'acceptRide',
    args: [{ name: 'ride_id', type: 'uint64' }],
    returns: { type: 'void' },
  }),
  storeOTP: new algosdk.ABIMethod({
    name: 'storeOTP',
    args: [
      { name: 'ride_id', type: 'uint64' },
      { name: 'otp', type: 'byte[]' },
    ],
    returns: { type: 'void' },
  }),
  verifyOTPAndStartRide: new algosdk.ABIMethod({
    name: 'verifyOTPAndStartRide',
    args: [
      { name: 'ride_id', type: 'uint64' },
      { name: 'otp_input', type: 'byte[]' },
    ],
    returns: { type: 'void' },
  }),
  endRide: new algosdk.ABIMethod({
    name: 'endRide',
    args: [{ name: 'ride_id', type: 'uint64' }],
    returns: { type: 'void' },
  }),
  releasePayment: new algosdk.ABIMethod({
    name: 'releasePayment',
    args: [{ name: 'ride_id', type: 'uint64' }],
    returns: { type: 'void' },
  }),
}
