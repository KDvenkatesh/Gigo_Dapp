const fs = require('fs');

let code = fs.readFileSync('src/components/CustomerDashboard.tsx', 'utf8');

code = code.replace(
    'const { location, isLocating, locationError } = useGeolocation()',
    'const { activeAddress, signTransactions } = useWallet()\n   const { location, isLocating, locationError } = useGeolocation()'
);

code = code.replace(
    'const passData = useAlgorandAssets()',
    'const passData = useAlgorandAssets()\n   const [outstandingDebt, setOutstandingDebt] = useState<number>(0)\n   const [isClearingDebt, setIsClearingDebt] = useState(false)'
);

const effect1 = `    useEffect(() => {
      if (!pickupTouched) {
         setPickupInput(location.label)
         setPickupLocation(location)
      }
    }, [location, pickupTouched])`;

const newEffect1 = effect1 + `

    const fetchCustomerDebt = useCallback(async () => {
      if (!activeAddress) return;
      try {
         let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
         if (typeof window !== 'undefined') {
            if (window.location.hostname === 'localhost') {
               BACKEND_URL = 'http://localhost:3001'
            } else if (BACKEND_URL.includes('localhost')) {
               BACKEND_URL = 'https://gigo-dapp.onrender.com'
            }
         }
         const res = await axios.get(\`\${BACKEND_URL}/api/customers/\${activeAddress}\`)
         setOutstandingDebt(res.data.outstandingDebt || 0)
      } catch (e) {
         console.error('Failed to fetch customer debt:', e)
      }
    }, [activeAddress])

    useEffect(() => {
       void fetchCustomerDebt()
    }, [fetchCustomerDebt, ride.customerRides])`;

code = code.replace(effect1, newEffect1);

const hasActivePass = `const hasActivePass = Boolean(passData.activePass && passData.activePass.isActive)`;
const handleClearDebt = `
    const handleClearDebt = async () => {
      if (!activeAddress || outstandingDebt <= 0) return;
      try {
         setIsClearingDebt(true);
         const algodClient = algorandConfig.client;
         const suggestedParams = await algodClient.getTransactionParams().do();
         const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS || '6C2QYZ2JOSL3XMMF3Z2JWWZ23EGB6N2X3T2YI2J37XUXU3YIZW276BOGU4';
         const assetId = Number(import.meta.env.VITE_GIGC_ASSET_ID || '763011769');
         
         const transferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: activeAddress,
            to: treasuryAddress,
            amount: outstandingDebt,
            assetIndex: assetId,
            suggestedParams,
         });

         const encodedTxn = algosdk.encodeUnsignedTransaction(transferTxn);
         const signedTxns = await signTransactions([encodedTxn]);
         const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
         
         let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
         if (typeof window !== 'undefined') {
            if (window.location.hostname === 'localhost') {
               BACKEND_URL = 'http://localhost:3001';
            } else if (BACKEND_URL.includes('localhost')) {
               BACKEND_URL = 'https://gigo-dapp.onrender.com';
            }
         }
         
         let cleared = false;
         for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const res = await axios.post(\`\${BACKEND_URL}/api/customers/clear-debt\`, {
               walletAddress: activeAddress,
               txId
            }).catch(() => null);
            
            if (res?.data?.success) {
               cleared = true;
               break;
            }
         }
         
         if (cleared) {
            setOutstandingDebt(0);
         } else {
            alert('Payment submitted but verification taking longer than expected. Please refresh in a moment.');
         }
      } catch (err) {
         console.error('Failed to clear debt', err);
         alert('Failed to process payment. Please ensure you have enough ALGO for gas and GIGC.');
      } finally {
         setIsClearingDebt(false);
      }
    };
`;

code = code.replace(hasActivePass, hasActivePass + '\n' + handleClearDebt);

const origLocErr = `{locationError && (
                           <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-sm text-amber-200/80">
                              {locationError}
                           </div>
                        )}`;

const newLocErr = `{outstandingDebt > 0 && (
                           <div className="glass-container glass-container--rounded glass-container--large mb-4 overflow-hidden">
                              <div className="glass-filter" style={{ backdropFilter: 'blur(20px) saturate(120%)' }}></div>
                              <div className="glass-overlay bg-gradient-to-b from-red-500/10 to-transparent"></div>
                              <div className="glass-specular"></div>
                              <div className="glass-content p-6 text-center space-y-5">
                                 <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                                    <Wallet className="h-7 w-7" />
                                 </div>
                                 <div>
                                    <h3 className="text-lg font-bold text-white mb-2">Outstanding Balance</h3>
                                    <p className="text-sm text-white/70">
                                       You have an unpaid balance of <span className="font-bold text-red-400">{ride.formatAlgoAmount(outstandingDebt)}</span> from wait fees or traffic delays on a previous ride.
                                    </p>
                                    <p className="text-xs text-white/50 mt-2">
                                       Please clear this balance to unlock ride booking.
                                    </p>
                                 </div>
                                 <button
                                    onClick={handleClearDebt}
                                    disabled={isClearingDebt}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] transition hover:from-red-400 hover:to-rose-500 disabled:opacity-50"
                                 >
                                    {isClearingDebt ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Coins className="h-5 w-5" />}
                                    {isClearingDebt ? 'Processing Payment...' : 'Pay Outstanding Balance'}
                                 </button>
                              </div>
                           </div>
                        )}

                        {outstandingDebt <= 0 && locationError && (
                           <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4 text-sm text-amber-200/80">
                              {locationError}
                           </div>
                        )}`;

code = code.replace(origLocErr, newLocErr);

code = code.replace(
    '{/* Pickup + Destination (Glassmorphic Container) */}',
    '{outstandingDebt <= 0 && (\n                        <>\n                        {/* Pickup + Destination (Glassmorphic Container) */}'
);

code = code.replace(
    '{refundedTxId && (',
    '</>\n                        )}\n\n                        {refundedTxId && ('
);

fs.writeFileSync('src/components/CustomerDashboard.tsx', code);
console.log('Modifications completed.');
