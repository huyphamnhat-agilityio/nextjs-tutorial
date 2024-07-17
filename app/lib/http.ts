import axios from "axios";
import { RequestOptions } from "./definitions";

const http1 = axios.create({
  baseURL: `${process.env.MOCK_API_V1}`,
});

const http2 = axios.create({
  baseURL: `${process.env.MOCK_API_V2}`,
});

const http3 = axios.create({
  baseURL: `${process.env.MOCK_API_V3}`,
});

const fetchApi = async <T>(url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    method: options?.method || "GET",
    headers: options?.headers || {
      "Content-Type": "application/json",
    },
    body: options?.body,
  });

  if (response.ok) return response.json() as T;

  throw new Error(`Failed to fetch ${url}: ${response.status}`);
};

export { http1, http2, http3, fetchApi };
