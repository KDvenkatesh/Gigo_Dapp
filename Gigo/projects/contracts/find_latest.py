import algosdk
import os
from dotenv import load_dotenv

def find_latest_app():
    load_dotenv()
    mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not mnemonic:
        print("No mnemonic found")
        return
    
    deployer = algosdk.mnemonic.to_private_key(mnemonic)
    address = algosdk.account.address_from_private_key(deployer)
    
    algod = algosdk.v2client.algod.AlgodClient("", "https://testnet-api.algonode.cloud", "")
    
    account_info = algod.account_info(address)
    created_apps = account_info.get('created-apps', [])
    
    if not created_apps:
        print("No apps found for address", address)
        return

    # Sort by ID descending
    created_apps.sort(key=lambda x: x['id'], reverse=True)
    
    for app in created_apps[:5]:
        print(f"App ID: {app['id']}")

if __name__ == "__main__":
    find_latest_app()
