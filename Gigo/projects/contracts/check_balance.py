import os
from dotenv import load_dotenv
from algokit_utils import AlgorandClient

load_dotenv()

algorand = AlgorandClient.from_environment()
deployer = algorand.account.from_environment("DEPLOYER")
print(f"Deployer Address: {deployer.address}")

info = algorand.account.get_information(deployer.address)
print(f"Balance: {info.amount / 1_000_000} ALGO")
