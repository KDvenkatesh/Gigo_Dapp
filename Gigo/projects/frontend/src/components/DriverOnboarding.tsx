import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, CarFront, Bike, Car, BatteryCharging, ShieldCheck } from 'lucide-react';
import { useDriverContext } from '../contexts/DriverContext';
import { WalletConnectButton } from './WalletConnectButton';

export function DriverOnboarding({ onBack }: { onBack: () => void }) {
  const { status, submitApplication, ride } = useDriverContext();
  const [vehicleType, setVehicleType] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
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

  const handleDocUpload = (doc: string, file: File | null) => {
    if (!file) return;
    if (file.size > 100 * 1024) {
      alert(`File ${file.name} is too large. Please upload a file below 100KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedDocs(prev => ({ ...prev, [doc]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const vehicleOptions = [
    { id: 'bike', label: 'Bike', icon: Bike },
    { id: 'auto', label: 'Auto', icon: CarFront },
    { id: 'car', label: 'Car', icon: Car },
    { id: 'ev', label: 'EV', icon: BatteryCharging },
  ];

  if (!ride.activeAddress) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Connect Wallet</h2>
        <p className="text-white/60 mb-8">Please connect your wallet to apply as a driver.</p>
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
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-3xl max-w-md w-full">
          <div className="inline-flex rounded-full bg-yellow-400/10 p-4 text-yellow-400 mb-6 ring-1 ring-inset ring-yellow-400/20">
            <Upload className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Application Pending</h2>
          <p className="text-white/60 mb-6">Your driver application is currently under review by our admin team. Please check back later.</p>
          <button onClick={onBack} className="w-full rounded-2xl bg-white/10 p-4 font-semibold text-white hover:bg-white/20 transition">
            Return to Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-3xl max-w-md w-full border-red-500/20">
          <h2 className="text-2xl font-bold mb-2 text-red-400">Application Rejected</h2>
          <p className="text-white/60 mb-6">Unfortunately, your application was not approved.</p>
          <button onClick={() => submitApplication({ vehicleType: 'bike' })} className="w-full rounded-2xl bg-white/10 p-4 font-semibold text-white hover:bg-white/20 transition mb-3">
            Re-apply
          </button>
          <button onClick={onBack} className="w-full text-white/50 hover:text-white text-sm py-2">
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#05060a]">
      <div className="flex-1 overflow-y-auto pb-20 px-4 pt-8 sm:px-6 md:pt-12 no-scrollbar">
        <div className="max-w-2xl mx-auto w-full">
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-sm font-semibold text-white/50 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        
        <h1 className="text-4xl font-black tracking-tight mb-2">Become a Driver</h1>
        <p className="text-white/60 mb-10">Join the decentralized ride-sharing revolution.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">1. Select Vehicle Type</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {vehicleOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVehicleType(option.id)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition ${
                    vehicleType === option.id 
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300' 
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <option.icon className="h-8 w-8" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">2. Upload Documents</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {['Driving License', 'Vehicle RC', 'Insurance (Optional)', 'Profile Photo'].map(doc => {
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
                      className={`rounded-2xl border border-dashed p-6 text-center transition ${
                        isUploaded ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/[0.02]'
                      }`}
                    >
                      {isUploaded ? <ShieldCheck className="mx-auto h-6 w-6 text-emerald-400 mb-3" /> : <Upload className="mx-auto h-6 w-6 text-white/40 mb-3" />}
                      <p className={`text-sm font-medium ${isUploaded ? 'text-emerald-300' : 'text-white/80'}`}>
                        {isUploaded ? `${doc} Uploaded` : `Upload ${doc}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={!vehicleType || Object.keys(uploadedDocs).length < 2 || isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 p-4 font-bold text-slate-950 disabled:opacity-50 transition-transform active:scale-95"
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  </div>
  );
}
