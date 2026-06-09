import logging
import os
import algokit_utils
import algosdk
from pathlib import Path
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

def deploy() -> None:
    # Load env from parent dir of smart_contracts (projects/contracts/.env)
    env_path = Path(__file__).parent.parent.parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
    
    print("Deploy function called", flush=True)
    from smart_contracts.artifacts.hello_world.hello_world_client import (
        RideContractFactory,
    )

    algorand = algokit_utils.AlgorandClient.from_environment()
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC")
    if not deployer_mnemonic:
        raise Exception("DEPLOYER_MNEMONIC not found in environment")
    deployer_ = algorand.account.from_mnemonic(mnemonic=deployer_mnemonic)

    factory = algorand.client.get_typed_app_factory(
        RideContractFactory, 
        default_sender=deployer_.address,
        app_name="GigoRideApp_RECOVERY_V1" 
    )

    print("Starting deployment (V6)...", flush=True)
    app_client, result = factory.deploy(
        on_update=algokit_utils.OnUpdate.UpdateApp,
        on_schema_break=algokit_utils.OnSchemaBreak.ReplaceApp,
    )
    print(f"Deployment result: {result.operation_performed}", flush=True)
    print(f"App ID: {app_client.app_id}", flush=True)
    print(f"App Address: {app_client.app_address}", flush=True)

    print("App updated successfully!", flush=True)

if __name__ == "__main__":
    deploy()
