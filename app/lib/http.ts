import axios from "axios";

const http1 = axios.create({
  baseURL: `${process.env.MOCK_API_V1}`,
});

const http2 = axios.create({
  baseURL: `${process.env.MOCK_API_V2}`,
});

const http3 = axios.create({
  baseURL: `${process.env.MOCK_API_V3}`,
});

export { http1, http2, http3 };
