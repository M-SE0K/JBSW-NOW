import axios, { AxiosError } from "axios";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const message =
      (error.response?.data as any)?.error?.message || error.message || "API Error";
    const status = error.response?.status;
    const wrapped = new Error(`${status ?? ""} ${message}`.trim());
    (wrapped as any).status = status;
    (wrapped as any).original = error;
    return Promise.reject(wrapped);
  }
);


