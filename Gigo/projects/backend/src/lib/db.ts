import fs from 'fs';
import path from 'path';

interface DBStructure {
  drivers: Record<string, { metadataCID: string; updatedAt: string }>;
  customers: Record<string, { profileCID: string; updatedAt: string }>;
  rides: Record<string, { metadataCID: string; createdAt: string }>;
}

// Consistently use process.cwd() for data storage
const dbPath = path.join(process.cwd(), 'data', 'db.json');

// Ensure data directory exists on startup
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = {
  read(): DBStructure {
    const defaultData: DBStructure = { drivers: {}, customers: {}, rides: {} };
    if (!fs.existsSync(dbPath)) {
      return defaultData;
    }
    try {
      const content = fs.readFileSync(dbPath, 'utf-8');
      const data = JSON.parse(content);
      return { 
        drivers: data.drivers || {}, 
        customers: data.customers || {}, 
        rides: data.rides || {} 
      };
    } catch (e) {
      console.error('DB Read Error:', e);
      return defaultData;
    }
  },

  write(data: DBStructure) {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('DB Write Error:', e);
    }
  },

  getDriverCID(walletAddress: string): string | null {
    if (!walletAddress) return null;
    const data = this.read();
    return data.drivers[walletAddress.toLowerCase()]?.metadataCID || null;
  },

  saveDriverCID(walletAddress: string, metadataCID: string) {
    if (!walletAddress) return;
    const data = this.read();
    data.drivers[walletAddress.toLowerCase()] = {
      metadataCID,
      updatedAt: new Date().toISOString()
    };
    this.write(data);
  },

  getAllDrivers() {
    return this.read().drivers;
  },

  // Customer Methods
  getCustomerCID(walletAddress: string) {
    if (!walletAddress) return null;
    return this.read().customers[walletAddress]?.profileCID || null;
  },

  saveCustomerCID(walletAddress: string, profileCID: string) {
    if (!walletAddress) return;
    const data = this.read();
    data.customers[walletAddress] = {
      profileCID,
      updatedAt: new Date().toISOString()
    };
    this.write(data);
  },

  // Ride Methods
  getRideCID(rideId: string) {
    if (!rideId) return null;
    return this.read().rides[rideId]?.metadataCID || null;
  },

  saveRideCID(rideId: string, metadataCID: string) {
    if (!rideId) return;
    const data = this.read();
    data.rides[rideId] = {
      metadataCID,
      createdAt: new Date().toISOString()
    };
    this.write(data);
  },

  getAllRides() {
    return this.read().rides;
  }
};
