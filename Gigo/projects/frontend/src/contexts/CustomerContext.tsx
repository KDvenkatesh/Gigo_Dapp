import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useRideContract } from '../hooks/useRideContract';

// Extract the return type of useRideContract for the context
type RideContractReturn = ReturnType<typeof useRideContract>;

interface CustomerContextType {
  ride: RideContractReturn;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const ride = useRideContract();

  return (
    <CustomerContext.Provider value={{ ride }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomerContext() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomerContext must be used within a CustomerProvider');
  }
  return context;
}
