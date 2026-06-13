import axios from 'axios';
import FormData from 'form-data';
import https from 'https';

const PINATA_JWT = process.env.PINATA_JWT;
const httpsAgent = new https.Agent({ family: 4 });

export const pinataService = {
  async pinFileToIPFS(fileBuffer: Buffer, fileName: string, metadata?: { name: string; keyvalues?: Record<string, string> }) {
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    
    const data = new FormData();
    data.append('file', fileBuffer, fileName);
    
    if (metadata) {
      data.append('pinataMetadata', JSON.stringify({
        name: metadata.name,
        keyvalues: metadata.keyvalues || {}
      }));
    }
    
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        ...data.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      httpsAgent,
    });
    
    return response.data; // { IpfsHash: "CID", PinSize: 123, Timestamp: "..." }
  },

  async pinJSONToIPFS(jsonBody: any, metadata?: { name: string; keyvalues?: Record<string, string> }) {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    
    const payload = {
      pinataOptions: { cidVersion: 1 },
      pinataContent: jsonBody,
      pinataMetadata: metadata ? {
        name: metadata.name,
        keyvalues: metadata.keyvalues || {}
      } : undefined
    };
    
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      httpsAgent,
    });
    
    return response.data; // { IpfsHash: "CID", PinSize: 123, Timestamp: "..." }
  },

  async unpinFile(cid: string) {
    const url = `https://api.pinata.cloud/pinning/unpin/${cid}`;
    try {
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
        httpsAgent,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to unpin ${cid}:`, error);
      throw error;
    }
  }
};
