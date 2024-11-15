import axios from 'axios';
import type { ResponseType } from 'src/types/types';

const API_URL = import.meta.env.VITE_APIGATEWAY_URL;

export async function submitRequest(question: string): Promise<ResponseType> {
  try {
    const { data } = await axios.post(`${API_URL}sandbox/prompt`, { question });
    return data;
  } catch (error) {
    console.error('Error sending request:', error);
    return error;
  }
}
