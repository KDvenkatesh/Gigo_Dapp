import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

export const ipfs = {
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${BACKEND_URL}/api/storage/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.cid;
  },

  async uploadJSON(data: any): Promise<string> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/upload-json`, data);
    return response.data.cid;
  },

  async saveDriverMetadata(walletAddress: string, metadataCID: string): Promise<void> {
    await axios.post(`${BACKEND_URL}/api/storage/driver-metadata`, {
      walletAddress,
      metadataCID,
    });
  },

  async getDriverMetadataCID(walletAddress: string): Promise<string | null> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/driver-metadata`, {
      walletAddress,
    });
    return response.data.cid;
  },

  async getAllDrivers(): Promise<Record<string, { metadataCID: string; updatedAt: string }>> {
    const response = await axios.get(`${BACKEND_URL}/api/storage/all-drivers`);
    return response.data;
  },

  // Customer Methods
  async saveCustomerProfile(walletAddress: string, profileCID: string): Promise<void> {
    await axios.post(`${BACKEND_URL}/api/storage/customer-profile`, {
      walletAddress,
      profileCID,
    });
  },

  async getCustomerProfileCID(walletAddress: string): Promise<string | null> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/get-customer-profile`, {
      walletAddress,
    });
    return response.data.cid;
  },

  // Ride Methods
  async saveRideMetadata(rideId: string, metadataCID: string): Promise<void> {
    await axios.post(`${BACKEND_URL}/api/storage/ride-metadata`, {
      rideId,
      metadataCID,
    });
  },

  async getRideMetadataCID(rideId: string): Promise<string | null> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/get-ride-metadata`, {
      rideId,
    });
    return response.data.cid;
  },

  async getAllRides(): Promise<Record<string, { metadataCID: string; createdAt: string }>> {
    const response = await axios.get(`${BACKEND_URL}/api/storage/all-rides`);
    return response.data;
  },

  async getJSON(cid: string): Promise<any> {
    const response = await axios.get(`${GATEWAY_URL}${cid}`);
    return response.data;
  },

  getGatewayUrl(cid: string): string {
    return `${GATEWAY_URL}${cid}`;
  }
};
