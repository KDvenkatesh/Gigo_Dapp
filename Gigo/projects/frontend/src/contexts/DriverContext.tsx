import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRideContract } from '../hooks/useRideContract';

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

  // Load status from local storage when wallet changes
  useEffect(() => {
    if (walletAddress !== 'disconnected') {
      const storedData = localStorage.getItem('gigo_drivers');
      if (storedData) {
        try {
          const drivers = JSON.parse(storedData);
          const driverData = drivers[walletAddress];
          if (driverData && driverData.status) {
            setStatusState(driverData.status as DriverStatus);
          } else {
            setStatusState('none');
          }
        } catch (e) {
          console.error('Failed to parse driver data', e);
          setStatusState('none');
        }
      } else {
        setStatusState('none');
      }
    } else {
      setStatusState('none');
    }
    // Default offline when switching accounts
    setActive(false);
  }, [walletAddress]);

  const setStatus = (newStatus: DriverStatus) => {
    setStatusState(newStatus);
    if (walletAddress !== 'disconnected') {
      const storedData = localStorage.getItem('gigo_drivers');
      const drivers = storedData ? JSON.parse(storedData) : {};
      drivers[walletAddress] = { ...drivers[walletAddress], status: newStatus };
      localStorage.setItem('gigo_drivers', JSON.stringify(drivers));
    }
  };

  const submitApplication = (data: any) => {
    setStatus('pending');
    if (walletAddress !== 'disconnected') {
      const storedData = localStorage.getItem('gigo_drivers');
      const drivers = storedData ? JSON.parse(storedData) : {};
      drivers[walletAddress] = {
        ...drivers[walletAddress],
        ...data,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };
      localStorage.setItem('gigo_drivers', JSON.stringify(drivers));
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
