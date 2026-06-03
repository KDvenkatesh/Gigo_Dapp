import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { ipfs } from '../lib/ipfs';

export interface PendingDriver {
  walletAddress: string;
  status: string;
  vehicleType?: string;
  documents?: Record<string, string>;
  submittedAt?: string;
  // Other mock data fields
}

interface AdminContextType {
  isAdmin: boolean;
  isChecking: boolean;
  pendingDrivers: PendingDriver[];
  refreshDrivers: () => void;
  approveDriver: (walletAddress: string) => void;
  rejectDriver: (walletAddress: string, reason?: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ALLOWED_ADMINS = [
  "FDSKCI2DHPIOTFR2CXHPESMLAUA4Y66B6KKGJ2CDKDY3UX34W43QVN52NA",
  "35VTBJ7SOB4QHJVTIFVT2HA2WBOSWDWB3IWJYHTU7GW64J34CHK3FZNWFM"
];

export function AdminProvider({ children }: { children: ReactNode }) {
  const { activeAddress } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);

  useEffect(() => {
    setIsChecking(true);
    if (activeAddress && ALLOWED_ADMINS.includes(activeAddress)) {
      setIsAdmin(true);
      refreshDrivers();
    } else {
      setIsAdmin(false);
      setPendingDrivers([]);
    }
    setIsChecking(false);
  }, [activeAddress]);

  const refreshDrivers = async () => {
    try {
      const driverMappings = await ipfs.getAllDrivers();
      const pending: PendingDriver[] = [];
      
      for (const walletAddress in driverMappings) {
        const { metadataCID } = driverMappings[walletAddress];
        const driverData = await ipfs.getJSON(metadataCID);
        
        if (driverData && driverData.status === 'pending') {
          pending.push({
            walletAddress,
            ...driverData
          });
        }
      }
      setPendingDrivers(pending);
    } catch (e) {
      console.error('Failed to fetch pending drivers from IPFS', e);
    }
  };

  const updateDriverStatus = async (walletAddress: string, status: string, reason?: string) => {
    try {
      const currentCid = await ipfs.getDriverMetadataCID(walletAddress);
      if (!currentCid) return;
      
      const currentData = await ipfs.getJSON(currentCid);
      
      // If rejecting, delete all uploaded driver documents to clean up Pinata
      if (status === 'rejected' && currentData.documents) {
        for (const docKey in currentData.documents) {
          const docCid = currentData.documents[docKey];
          await ipfs.deleteFile(docCid);
        }
        // Clear documents so they aren't kept in the metadata
        currentData.documents = {};
      }

      const updatedData = {
        ...currentData,
        status,
        ...(reason && { rejectionReason: reason }),
        updatedAt: new Date().toISOString()
      };
      
      const newCid = await ipfs.uploadJSON(updatedData, walletAddress, 'driver', 'metadata');
      await ipfs.saveDriverMetadata(walletAddress, newCid, status, updatedData.vehicleType);
      
      // Since the metadata file was updated to a new CID, delete the old metadata file
      await ipfs.deleteFile(currentCid);
      
      refreshDrivers();
    } catch (e) {
      console.error('Failed to update driver status on IPFS', e);
    }
  };

  const approveDriver = (walletAddress: string) => updateDriverStatus(walletAddress, 'approved');
  const rejectDriver = (walletAddress: string, reason?: string) => updateDriverStatus(walletAddress, 'rejected', reason);

  return (
    <AdminContext.Provider value={{ isAdmin, isChecking, pendingDrivers, refreshDrivers, approveDriver, rejectDriver }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
}
