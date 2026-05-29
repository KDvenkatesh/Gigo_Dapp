const algosdk = require('algosdk');

const ALGORAND_NODE = 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

// Treasury wallet
const TREASURY_MNEMONIC = "magic mushroom lazy turtle erode matter aspect morning butter join where inherit step guitar skull skill sentence family unveil fortune true bless collect able hazard";

async function mint() {
  try {
    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    console.log(`Treasury Address: ${treasuryAccount.addr}`);
    
    const suggestedParams = await algodClient.getTransactionParams().do();
    
    const passesToMint = [
      { name: 'Gigo Silver Pass', unitName: 'GIGOSILV', total: 1000 },
      { name: 'Gigo Gold Pass', unitName: 'GIGOGOLD', total: 1000 },
      { name: 'Gigo Platinum Pass', unitName: 'GIGOPLAT', total: 1000 },
    ];
    
    const newAssets = {};

    for (const pass of passesToMint) {
      console.log(`Minting ${pass.name}...`);
      
      const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: treasuryAccount.addr,
        assetName: pass.name,
        unitName: pass.unitName,
        total: pass.total,
        decimals: 0,
        defaultFrozen: false,
        manager: treasuryAccount.addr,
        reserve: treasuryAccount.addr,
        freeze: treasuryAccount.addr,
        clawback: treasuryAccount.addr,
        suggestedParams,
      });
      
      const signedTxn = txn.signTxn(treasuryAccount.sk);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      console.log(`Sent creation transaction ${txId}. Waiting for confirmation...`);
      const confirmation = await algosdk.waitForConfirmation(algodClient, txId, 4);
      
      const assetId = confirmation['asset-index'];
      console.log(`Successfully created ${pass.name} with Asset ID: ${assetId}`);
      newAssets[pass.name] = assetId;
    }
    console.log("All passes minted successfully!");
    console.log(newAssets);
  } catch (err) {
    console.error('Error during minting:', err.message);
  }
}

mint();
