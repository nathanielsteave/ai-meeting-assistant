// Environment-based API URL
const isDevelopment = (import.meta as any).env?.DEV;
const isVercel = (import.meta as any).env?.VERCEL;

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000'
  : 'https://your-backend-url.vercel.app'; // Ganti dengan URL backend Vercel Anda

export const WS_BASE_URL = isDevelopment
  ? 'ws://localhost:8000'
  : 'wss://your-backend-url.vercel.app'; // WebSocket menggunakan WSS untuk HTTPS