import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://gigo-dapp.onrender.com';


const GATEWAY_URL = 'https://gateway.pinata.cloud/ipfs/';

export const ipfs = {
  async uploadFile(file: File, walletAddress?: string, role?: string, dataType?: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    if (walletAddress) formData.append('walletAddress', walletAddress);
    if (role) formData.append('role', role);
    if (dataType) formData.append('dataType', dataType);

    const response = await axios.post(`${BACKEND_URL}/api/storage/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.cid;
  },

  async deleteFile(cid: string): Promise<void> {
    try {
      await axios.delete(`${BACKEND_URL}/api/storage/unpin/${cid}`);
    } catch (error) {
      console.error(`Failed to delete file with CID ${cid}`, error);
    }
  },

  async uploadJSON(data: any, walletAddress?: string, role?: string, dataType?: string): Promise<string> {
    const payload = walletAddress ? { data, walletAddress, role, dataType } : data;
    const response = await axios.post(`${BACKEND_URL}/api/storage/upload-json`, payload);
    return response.data.cid;
  },

  async saveDriverMetadata(walletAddress: string, metadataCID: string, status?: string, vehicleType?: string): Promise<void> {
    await axios.post(`${BACKEND_URL}/api/storage/driver-metadata`, {
      walletAddress,
      metadataCID,
      status,
      vehicleType
    });
  },

  async getDriverMetadataCID(walletAddress: string): Promise<string | null> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/driver-metadata`, {
      walletAddress,
    });
    return response.data.cid || null;
  },

  async getDriverRecord(walletAddress: string): Promise<{ cid: string | null, status: string, vehicleType?: string }> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/driver-metadata`, {
      walletAddress,
    });
    return {
      cid: response.data.cid || null,
      status: response.data.status || 'none',
      vehicleType: response.data.vehicleType
    };
  },

  async getAllDrivers(): Promise<Record<string, { metadataCID: string; updatedAt: string }>> {
    const response = await axios.get(`${BACKEND_URL}/api/storage/all-drivers`);
    return response.data;
  },

  // Customer Methods
  async saveCustomerProfile(walletAddress: string, profilePhotoBase64: string): Promise<void> {
    await axios.post(`${BACKEND_URL}/api/storage/customer-profile`, {
      walletAddress,
      profilePhotoBase64,
    });
  },

  async getCustomerProfileBase64(walletAddress: string): Promise<string | null> {
    const response = await axios.post(`${BACKEND_URL}/api/storage/get-customer-profile`, {
      walletAddress,
    });
    return response.data.profilePhotoBase64;
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
