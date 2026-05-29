const algosdk = require('algosdk');

const ALGORAND_NODE = 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

async function checkUserAssets() {
  try {
    const address = 'YCY7HQEOOXF5SVD6GTROS77PJXZLU6NW6AX3IU5XTR6NKFBNEO46IIBCDY';
    const accountInfo = await algodClient.accountInformation(address).do();
    const assets = accountInfo.assets || [];
    console.log(`Address: ${address}`);
    for (const a of assets) {
      console.log(`Asset ID: ${a['asset-id']}, Amount: ${a.amount}`);
    }
  } catch (err) {
    console.error(err);
  }
}

checkUserAssets();
