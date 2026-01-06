import axios from "axios";
import e from "express";

const zohoHttpClient = axios.create({
  timeout: 30000, // 30 seconds
});
export default zohoHttpClient;
