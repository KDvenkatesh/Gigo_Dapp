import urllib.request
print("Testing algod...")
try:
    with urllib.request.urlopen("https://testnet-api.algonode.cloud/health", timeout=10) as r:
        print(f"Algod health: {r.status}")
except Exception as e:
    print(f"Algod error: {e}")

print("Testing indexer...")
try:
    with urllib.request.urlopen("https://testnet-idx.algonode.cloud/health", timeout=10) as r:
        print(f"Indexer health: {r.status}")
except Exception as e:
    print(f"Indexer error: {e}")
