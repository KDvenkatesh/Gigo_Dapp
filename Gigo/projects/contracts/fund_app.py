import os
from dotenv import load_dotenv
import algokit_utils
import algosdk

load_dotenv()

# Configuration
APP_ID = 757618327
FUND_AMOUNT_ALGO = 5

def fund_app():
    # Initialize Algorand client for TestNet
    algorand = algokit_utils.AlgorandClient.testnet()
    
    # Load deployer account
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        print("Error: DEPLOYER_MNEMONIC not found in .env")
        return
    
    # Corrected: mnemonic must be passed as a keyword argument in algokit-utils 4.x
    deployer = algorand.account.from_mnemonic(mnemonic=deployer_mnemonic)
    app_address = algosdk.logic.get_application_address(APP_ID)
    
    print(f"Deployer Address: {deployer.address}")
    print(f"App ID: {APP_ID}")
    print(f"App Address: {app_address}")
    
    # Check current balance
    try:
        info = algorand.account.get_information(app_address)
        print(f"Current App Balance: {info.amount.micro_algo / 1_000_000} ALGO")
    except Exception as e:
        print(f"App account info error (it might not exist yet): {e}")
    
    print(f"Sending {FUND_AMOUNT_ALGO} ALGO to app address...")
    try:
        result = algorand.send.payment(
            algokit_utils.PaymentParams(
                sender=deployer.address,
                receiver=app_address,
                amount=algokit_utils.AlgoAmount(algo=FUND_AMOUNT_ALGO)
            )
        )
        print(f"Transaction successful! ID: {result.tx_id}")
        
        # Verify new balance
        new_info = algorand.account.get_information(app_address)
        print(f"New App Balance: {new_info.amount.micro_algo / 1_000_000} ALGO")
    except Exception as e:
        print(f"Error funding app: {e}")

if __name__ == "__main__":
    fund_app()
