import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';

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
  "FDSKCI2DHPIOTFR2CXHPESMLAUA4Y66B6KKGJ2CDKDY3UX34W43QVN52NA"
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

  const refreshDrivers = () => {
    const storedData = localStorage.getItem('gigo_drivers');
    if (storedData) {
      try {
        const drivers = JSON.parse(storedData);
        const pending: PendingDriver[] = Object.keys(drivers)
          .filter(key => drivers[key].status === 'pending')
          .map(key => ({
            walletAddress: key,
            ...drivers[key]
          }));
        setPendingDrivers(pending);
      } catch (e) {
        console.error('Failed to parse pending drivers', e);
      }
    }
  };

  const updateDriverStatus = (walletAddress: string, status: string, reason?: string) => {
    const storedData = localStorage.getItem('gigo_drivers');
    if (storedData) {
      const drivers = JSON.parse(storedData);
      if (drivers[walletAddress]) {
        drivers[walletAddress].status = status;
        if (reason) {
          drivers[walletAddress].rejectionReason = reason;
        }
        localStorage.setItem('gigo_drivers', JSON.stringify(drivers));
        refreshDrivers();
      }
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
