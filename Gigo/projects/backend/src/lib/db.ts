import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/db.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface DBStructure {
  drivers: Record<string, { metadataCID: string; updatedAt: string }>;
  customers: Record<string, { profileCID: string; updatedAt: string }>;
  rides: Record<string, { metadataCID: string; createdAt: string }>;
}

const dbPath = path.join(process.cwd(), 'data', 'db.json');

export const db = {
  read(): DBStructure {
    if (!fs.existsSync(dbPath)) {
      return { drivers: {}, customers: {}, rides: {} };
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  },

  write(data: DBStructure) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  },

  getDriverCID(walletAddress: string): string | null {
    const data = this.read();
    return data.drivers[walletAddress.toLowerCase()]?.metadataCID || null;
  },

  saveDriverCID(walletAddress: string, metadataCID: string) {
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
    return this.read().customers[walletAddress]?.profileCID || null;
  },

  saveCustomerCID(walletAddress: string, profileCID: string) {
    const data = this.read();
    data.customers[walletAddress] = {
      profileCID,
      updatedAt: new Date().toISOString()
    };
    this.write(data);
  },

  // Ride Methods
  getRideCID(rideId: string) {
    return this.read().rides[rideId]?.metadataCID || null;
  },

  saveRideCID(rideId: string, metadataCID: string) {
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
