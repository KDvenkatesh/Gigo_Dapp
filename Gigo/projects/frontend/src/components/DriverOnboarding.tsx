import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, ShieldCheck } from 'lucide-react';
import bodaIcon from '../assets/Boda.png';
import carIcon from '../assets/Car.png';
import autoIcon from '../assets/Auto.png';
import { useDriverContext } from '../contexts/DriverContext';
import { WalletConnectButton } from './WalletConnectButton';
import { ipfs } from '../lib/ipfs';
import { Loader2 } from 'lucide-react';

export function DriverOnboarding({ onBack }: { onBack: () => void }) {
  const { status, submitApplication, ride } = useDriverContext();
  const [vehicleType, setVehicleType] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const docKeys = Object.keys(uploadedDocs);
    if (!vehicleType || docKeys.length < 2) return;
    setIsSubmitting(true);
    // Simulate submission delay
    setTimeout(() => {
      submitApplication({ vehicleType, documents: uploadedDocs });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleDocUpload = async (doc: string, file: File | null) => {
    if (!file) return;
    
    setUploadingDocs(prev => ({ ...prev, [doc]: true }));
    try {
      const cid = await ipfs.uploadFile(file);
      setUploadedDocs(prev => ({ ...prev, [doc]: cid }));
    } catch (error) {
      console.error(`Failed to upload ${doc}`, error);
    } finally {
      setUploadingDocs(prev => ({ ...prev, [doc]: false }));
    }
  };

  const vehicleOptions = [
    { id: 'boda', label: 'Boda', icon: bodaIcon },
    { id: 'car', label: 'Car', icon: carIcon },
    { id: 'auto', label: 'Auto', icon: autoIcon },
  ];

  if (!ride.activeAddress) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Connect Wallet</h2>
        <p className="text-white/60 mb-8">Please connect your wallet to apply as a rider.</p>
        <WalletConnectButton />
        <button onClick={onBack} className="mt-8 text-white/50 hover:text-white flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-container glass-container--rounded glass-container--large max-w-md w-full">
          <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
          <div className="glass-overlay"></div>
          <div className="glass-specular"></div>
          <div className="glass-content p-8">
            <div className="inline-flex rounded-full bg-yellow-400/10 p-4 text-yellow-400 mb-6 ring-1 ring-inset ring-yellow-400/20">
            <Upload className="h-8 w-8" />
          </div>
          <h2 className="text-title-2 font-bold mb-2">Application Pending</h2>
          <p className="text-white/60 mb-6">Your rider application is currently under review by our admin team. Please check back later.</p>
          <button onClick={onBack} className="w-full clay-btn clay-btn-brand py-3 text-sm">
            Return to Home
          </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-container glass-container--rounded glass-container--large max-w-md w-full border-red-500/25">
          <div className="glass-filter" style={{ backdropFilter: 'blur(24px) saturate(130%)' }}></div>
          <div className="glass-overlay"></div>
          <div className="glass-specular"></div>
          <div className="glass-content p-8">
            <h2 className="text-title-2 font-bold mb-2 text-red-400 font-mono">Application Rejected</h2>
          <p className="text-white/60 mb-6">Unfortunately, your application was not approved.</p>
          <button onClick={() => submitApplication({ vehicleType: 'boda' })} className="w-full clay-btn clay-btn-brand py-3 text-sm mb-3">
            Re-apply
          </button>
          <button onClick={onBack} className="w-full text-white/50 hover:text-white text-sm py-2">
            Back to Home
          </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#05060a]">
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-8 sm:px-6 md:pt-12 no-scrollbar">
        <div className="max-w-2xl mx-auto w-full">
        <button onClick={onBack} className="mb-8 glass-container glass-container--rounded text-footnote font-bold text-white/50 transition hover:text-white" style={{ borderRadius: '9999px' }}>
          <div className="glass-filter" style={{ borderRadius: '9999px' }}></div>
          <div className="glass-overlay" style={{ borderRadius: '9999px' }}></div>
          <div className="glass-specular" style={{ borderRadius: '9999px' }}></div>
          <div className="glass-content px-4 py-2 inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </div>
        </button>
        
        <h1 className="text-large-title tracking-tight mb-2">Become a Boda Rider</h1>
        <p className="text-body text-white/60 mb-10">Join the decentralized mobility revolution.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-white">1. Select Vehicle Type</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {vehicleOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVehicleType(option.id)}
                  className={`transition-all active:scale-[0.99] glass-container glass-container--rounded block ${
                    vehicleType === option.id 
                      ? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-300 shadow-[0_8px_24px_rgba(16,185,129,0.15)]' 
                      : 'bg-white/[0.05] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="glass-filter"></div>
                  <div className="glass-overlay"></div>
                  <div className="glass-specular"></div>
                  <div className="glass-content flex flex-col items-center gap-3 p-4.5">
                    <img 
                      src={option.icon} 
                      alt={option.label} 
                      className="h-[60px] w-[60px] object-contain drop-shadow-md dark:[filter:drop-shadow(1px_1px_0_white)_drop-shadow(-1px_-1px_0_white)_drop-shadow(1px_-1px_0_white)_drop-shadow(-1px_1px_0_white)]"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-white">2. Upload Documents</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {['Driving License', 'National ID', 'Vehicle Registration', 'Insurance', 'Profile Photo'].map(doc => {
                const isUploaded = !!uploadedDocs[doc];
                return (
                  <div key={doc} className="relative">
                    <input
                      type="file"
                      id={`file-${doc}`}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleDocUpload(doc, e.target.files?.[0] || null)}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      title={`Upload ${doc}`}
                    />
                    <div 
                      className={`border border-dashed transition-all glass-container glass-container--rounded ${
                        isUploaded ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-white/15 bg-white/[0.03] hover:border-white/30'
                      }`}
                    >
                      <div className="glass-filter"></div>
                      <div className="glass-overlay"></div>
                      <div className="glass-specular"></div>
                      <div className="glass-content p-6 text-center">
                        {uploadingDocs[doc] ? (
                          <Loader2 className="mx-auto h-6 w-6 text-white/40 mb-3 animate-spin" />
                        ) : isUploaded ? (
                          <ShieldCheck className="mx-auto h-6 w-6 text-emerald-400 mb-3" />
                        ) : (
                          <Upload className="mx-auto h-6 w-6 text-white/40 mb-3" />
                        )}
                        <p className={`text-sm font-medium ${isUploaded ? 'text-emerald-300' : 'text-white/80'}`}>
                          {uploadingDocs[doc] ? `Uploading ${doc}...` : isUploaded ? `${doc} Uploaded` : `Upload ${doc}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!vehicleType || Object.keys(uploadedDocs).length < 2 || isSubmitting}
            className="w-full clay-btn clay-btn-brand py-4 font-black disabled:opacity-40"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  </div>
  );
}
