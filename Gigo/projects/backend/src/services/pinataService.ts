import axios from 'axios';
import FormData from 'form-data';

const PINATA_JWT = process.env.PINATA_JWT;

export const pinataService = {
  async pinFileToIPFS(fileBuffer: Buffer, fileName: string) {
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    
    const data = new FormData();
    data.append('file', fileBuffer, fileName);
    
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        ...data.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    
    return response.data; // { IpfsHash: "CID", PinSize: 123, Timestamp: "..." }
  },

  async pinJSONToIPFS(jsonBody: any) {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    
    const response = await axios.post(url, jsonBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
    });
    
    return response.data; // { IpfsHash: "CID", PinSize: 123, Timestamp: "..." }
  }
};
