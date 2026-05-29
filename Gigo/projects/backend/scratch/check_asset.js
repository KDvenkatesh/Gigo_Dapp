const algosdk = require('algosdk');

const ALGORAND_NODE = 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

async function checkAsset() {
  try {
    const assetId = 763011769;
    const assetInfo = await algodClient.getAssetByID(assetId).do();
    console.log(`Asset Name: ${assetInfo.params.name}`);
    console.log(`Unit Name: ${assetInfo.params['unit-name']}`);
    console.log(`Total: ${assetInfo.params.total}`);
    console.log(`Decimals: ${assetInfo.params.decimals}`);
    console.log(`Creator: ${assetInfo.params.creator}`);
  } catch (err) {
    console.error(err);
  }
}

checkAsset();
