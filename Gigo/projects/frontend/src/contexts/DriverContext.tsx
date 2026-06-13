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
  vehicleType: string | undefined;
  active: boolean;
  setActive: (active: boolean) => void;
  submitApplication: (data: any) => void;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function DriverProvider({ children }: { children: ReactNode }) {
  const ride = useRideContract();
  
  const walletAddress = ride.activeAddress || 'disconnected';
  
  const [status, setStatusState] = useState<DriverStatus>('none');
  const [vehicleType, setVehicleType] = useState<string | undefined>(undefined);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (walletAddress !== 'disconnected') {
      const fetchDriverData = async () => {
        try {
          const record = await ipfs.getDriverRecord(walletAddress);
          let realStatus = record.status;
          
          if (record.cid) {
             try {
                const ipfsData = await ipfs.getJSON(record.cid);
                if (ipfsData && ipfsData.status && ipfsData.status !== realStatus) {
                   realStatus = ipfsData.status;
                   // Sync DB with truth
                   await ipfs.saveDriverMetadata(walletAddress, record.cid, realStatus, record.vehicleType);
                }
             } catch (err) {
                console.error('Failed to verify IPFS status', err);
             }
          }
          
          setStatusState(realStatus as DriverStatus);
          setVehicleType(record.vehicleType);
        } catch (e) {
          console.error('Failed to fetch driver data from IPFS/Backend', e);
          setStatusState('none');
          setVehicleType(undefined);
        }
      };
      fetchDriverData();
    } else {
      setStatusState('none');
      setVehicleType(undefined);
    }
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
        
        const newCid = await ipfs.uploadJSON(updatedData, walletAddress, 'driver', 'profile');
        await ipfs.saveDriverMetadata(walletAddress, newCid, newStatus, vehicleType);
      } catch (e) {
        console.error('Failed to update driver status on IPFS', e);
      }
    }
  };

  const submitApplication = async (data: any) => {
    setStatusState('pending');
    setVehicleType(data.vehicle);
    if (walletAddress !== 'disconnected') {
      try {
        const applicationData = {
          ...data,
          status: 'pending',
          submittedAt: new Date().toISOString()
        };
        
        const cid = await ipfs.uploadJSON(applicationData, walletAddress, 'driver', 'profile');
        await ipfs.saveDriverMetadata(walletAddress, cid, 'pending', data.vehicle);
      } catch (e) {
        console.error('Failed to submit application to IPFS', e);
        setStatusState('none');
        setVehicleType(undefined);
      }
    }
  };

  return (
    <DriverContext.Provider value={{ ride, status, setStatus, vehicleType, active, setActive, submitApplication }}>
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
