import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRideContract } from '../hooks/useRideContract';
import { ipfs } from '../lib/ipfs';

type RideContractReturn = ReturnType<typeof useRideContract>;

export type DriverStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface DriverContextType {
  ride: RideContractReturn;
  status: DriverStatus;
  setStatus: (status: DriverStatus) => void;
  active: boolean;
  setActive: (active: boolean) => void;
  submitApplication: (data: any) => void;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function DriverProvider({ children }: { children: ReactNode }) {
  const ride = useRideContract();
  
  // Use wallet address as the key for driver status in local storage to simulate backend
  const walletAddress = ride.activeAddress || 'disconnected';
  
  const [status, setStatusState] = useState<DriverStatus>('none');
  const [active, setActive] = useState(false);

  // Load status from IPFS when wallet changes
  useEffect(() => {
    if (walletAddress !== 'disconnected') {
      const fetchDriverData = async () => {
        try {
          const cid = await ipfs.getDriverMetadataCID(walletAddress);
          if (cid) {
            const driverData = await ipfs.getJSON(cid);
            if (driverData && driverData.status) {
              setStatusState(driverData.status as DriverStatus);
            } else {
              setStatusState('none');
            }
          } else {
            // Fallback for demo if no CID found on backend yet
            setStatusState('none');
          }
        } catch (e) {
          console.error('Failed to fetch driver data from IPFS', e);
          setStatusState('none');
        }
      };
      fetchDriverData();
    } else {
      setStatusState('none');
    }
    // Default offline when switching accounts
    setActive(false);
  }, [walletAddress]);

  const setStatus = async (newStatus: DriverStatus) => {
    setStatusState(newStatus);
    if (walletAddress !== 'disconnected') {
      try {
        const currentCid = await ipfs.getDriverMetadataCID(walletAddress);
        let currentData: any = {};
        if (currentCid) {
          currentData = await ipfs.getJSON(currentCid);
        }
        
        const updatedData = {
          ...currentData,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
        
        const newCid = await ipfs.uploadJSON(updatedData);
        await ipfs.saveDriverMetadata(walletAddress, newCid);
      } catch (e) {
        console.error('Failed to update driver status on IPFS', e);
      }
    }
  };

  const submitApplication = async (data: any) => {
    setStatusState('pending');
    if (walletAddress !== 'disconnected') {
      try {
        const applicationData = {
          ...data,
          status: 'pending',
          submittedAt: new Date().toISOString()
        };
        
        const cid = await ipfs.uploadJSON(applicationData);
        await ipfs.saveDriverMetadata(walletAddress, cid);
      } catch (e) {
        console.error('Failed to submit application to IPFS', e);
        setStatusState('none');
      }
    }
  };

  return (
    <DriverContext.Provider value={{ ride, status, setStatus, active, setActive, submitApplication }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriverContext() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error('useDriverContext must be used within a DriverProvider');
  }
  return context;
}
