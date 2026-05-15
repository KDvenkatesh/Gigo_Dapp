import algosdk
import os
from dotenv import load_dotenv

def test_account():
    load_dotenv()
    mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not mnemonic:
        print("No mnemonic")
        return
    
    pk = algosdk.mnemonic.to_private_key(mnemonic)
    address = algosdk.account.address_from_private_key(pk)
    
    # Try different node
    algod = algosdk.v2client.algod.AlgodClient("", "https://testnet-api.4160.nodely.io", "")
    
    try:
        status = algod.status()
        print(f"Connected to TestNet. Block: {status['last-round']}")
        info = algod.account_info(address)
        print(f"Address: {address}")
        print(f"Balance: {info['amount'] / 1_000_000} ALGO")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_account()
