import algokit_utils
from algokit_utils import AlgorandClient
import os
from dotenv import load_dotenv

load_dotenv()
algorand = AlgorandClient.testnet()
print("Checking algod...")
print(f"Status: {algorand.client.algod.status()}")
print("Checking indexer...")
print(f"Health: {algorand.client.indexer.health()}")
