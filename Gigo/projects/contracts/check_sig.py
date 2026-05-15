import algokit_utils
from algokit_utils import AlgorandClient
import inspect

algorand = AlgorandClient.testnet()
print(f"AccountManager methods: {dir(algorand.account)}")
print(f"from_mnemonic signature: {inspect.signature(algorand.account.from_mnemonic)}")
