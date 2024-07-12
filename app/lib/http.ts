import axios from "axios";

const http1 = axios.create({
  baseURL: `${process.env.MOCK_API_V1}`,
});

const http2 = axios.create({
  baseURL: `${process.env.MOCK_API_V2}`,
});

export { http1, http2 };
