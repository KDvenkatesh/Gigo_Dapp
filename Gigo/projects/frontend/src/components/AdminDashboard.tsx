import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, X, ArrowLeft, Clock, Eye, FileText } from 'lucide-react';
import { useAdminContext } from '../contexts/AdminContext';
import { WalletConnectButton } from './WalletConnectButton';
import { PWAInstallFooter } from './PWAInstallFooter';
import { ipfs } from '../lib/ipfs';

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { isAdmin, isChecking, pendingDrivers, approveDriver, rejectDriver } = useAdminContext();
  const [viewDoc, setViewDoc] = useState<{name: string, data: string} | null>(null);

  if (isChecking) {
    return <div className="flex h-screen items-center justify-center bg-[#05060a] text-white">Checking permissions...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-[#05060a] text-white">
        <div className="inline-flex rounded-full bg-red-500/10 p-4 text-red-400 mb-6 ring-1 ring-inset ring-red-500/20">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Access Denied</h2>
        <p className="text-white/60 mb-8 max-w-md">
          Only authorized admin wallets can access this dashboard. Please connect with an approved wallet.
        </p>
        <WalletConnectButton />
        <button onClick={onBack} className="mt-8 text-white/50 hover:text-white flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#05060a] text-white">
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="glass-container glass-container--rounded text-white/60 transition hover:text-white" style={{ borderRadius: '9999px' }}>
                <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
                <div className="glass-overlay" style={{ borderRadius: '9999px' }}></div>
                <div className="glass-specular" style={{ borderRadius: '9999px' }}></div>
                <div className="glass-content p-2.5 flex items-center justify-center">
                  <ArrowLeft className="h-5 w-5 text-white/60" />
                </div>
              </button>
              <h1 className="text-title-1 font-bold">Admin Approval Dashboard</h1>
            </div>
            <WalletConnectButton />
          </div>

          <div className="glass-container glass-container--rounded glass-container--large">
            <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
            <div className="glass-overlay"></div>
            <div className="glass-specular"></div>
            <div className="glass-content p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
              <Clock className="h-6 w-6 text-emerald-400" />
              <h2 className="text-title-2 font-semibold">Pending Riders ({pendingDrivers.length})</h2>
            </div>

            {pendingDrivers.length === 0 ? (
              <div className="text-center py-16 text-white/50">
                <ShieldCheck className="h-16 w-16 mx-auto mb-4 text-white/20" />
                <p className="text-lg">No pending rider applications at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingDrivers.map((driver) => {
                  const docs = driver.documents || {};
                  const docNames = Object.keys(docs);
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={driver.walletAddress} 
                      className="transition-all glass-container glass-container--rounded hover:bg-white/[0.14] border-white/30"
                    >
                      <div className="glass-filter"></div>
                      <div className="glass-overlay"></div>
                      <div className="glass-specular"></div>
                      <div className="glass-content flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6">
                      <div>
                        <p className="text-xs text-white/40 mb-1 font-mono">{driver.walletAddress}</p>
                        <p className="font-semibold text-lg flex items-center gap-2">
                          Vehicle: <span className="capitalize text-emerald-300">{driver.vehicleType || 'Unknown'}</span>
                        </p>
                        <p className="text-sm text-white/60 mt-2">
                          Submitted: {driver.submittedAt ? new Date(driver.submittedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <div className="mt-4 space-y-2">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Submitted Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {docNames.length > 0 ? docNames.map(doc => (
                              <div 
                                key={doc} 
                                className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg group hover:border-white/20 transition cursor-pointer" 
                                onClick={() => setViewDoc({name: doc, data: docs[doc]})}
                              >
                                <FileText className="h-3.5 w-3.5 text-white/40" />
                                <span className="text-[11px] font-medium text-white/70">{doc}</span>
                                <Eye className="h-3 w-3 text-white/20 group-hover:text-emerald-400 transition" />
                              </div>
                            )) : (
                              <span className="text-xs text-white/40">No documents attached (Legacy)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full sm:w-auto gap-3 shrink-0">
                        <button 
                          onClick={() => rejectDriver(driver.walletAddress)}
                          className="flex-1 sm:flex-none clay-btn clay-btn-danger text-xs px-4 py-2.5"
                        >
                          <X className="h-4 w-4" /> Reject
                        </button>
                        <button 
                          onClick={() => approveDriver(driver.walletAddress)}
                          className="flex-1 sm:flex-none clay-btn clay-btn-success py-2.5 px-5 text-xs"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                      </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
      <PWAInstallFooter />

      <AnimatePresence>
        {viewDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setViewDoc(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-container glass-container--rounded glass-container--large rounded-[32px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl"
            >
              <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
              <div className="glass-overlay"></div>
              <div className="glass-specular"></div>
              <div className="glass-content p-6 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{viewDoc.name}</h3>
                <button onClick={() => setViewDoc(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center bg-black/50 rounded-xl border border-white/5">
                {viewDoc.data.startsWith('data:application/pdf') ? (
                  <iframe src={viewDoc.data} className="w-full h-[60vh] rounded-lg" title={viewDoc.name} />
                ) : (
                  <img 
                    src={ipfs.getGatewayUrl(viewDoc.data)} 
                    alt={viewDoc.name} 
                    className="max-w-full max-h-[60vh] object-contain rounded-lg" 
                  />
                )}
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
