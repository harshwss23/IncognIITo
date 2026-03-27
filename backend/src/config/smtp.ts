// FILE: src/config/mailer.ts (Ya jo bhi tera file ka naam hai)
import axios from 'axios';
import dotenv from 'dotenv';
// HttpsProxyAgent import kar lo taaki proxy ke through bahar ja sake
import { HttpsProxyAgent } from 'https-proxy-agent';

dotenv.config();

// Tera Google Apps Script ka Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDCf96lLIK7NPCrK6O8VmES0RnbvUr1NMYgG48cEKj9GlJLlYOcP1QYx2DcYn3_wG/exec";

export const sendEmailViaAppScript = async (to: string, subject: string, body: string) => {
  try {
    // 1. IITK Proxy set up (Jo humne Cloudinary ke liye kiya tha wahi yahan kaam aayega)
    const proxyUrl = process.env.IITK_PROXY_URL;
    const axiosConfig: any = {
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Agar server pe proxy set hai, toh Agent attach kar do
    if (proxyUrl) {
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
    }

    // 2. Google Script ko payload bhejo
    const payload = {
      to: to,
      subject: subject,
      body: body
    };

    const response = await axios.post(GOOGLE_SCRIPT_URL, payload, axiosConfig);

    // 3. Response check karo
    if (response.data && response.data.success) {
      console.log(`Email sent successfully to ${to} via AppScript!`);
      return true;
    } else {
      console.error('AppScript returned an error:', response.data);
      throw new Error('Failed to send email via AppScript');
    }

  } catch (error: any) {
    console.error('Error sending email through AppScript:', error.message || error);
    throw new Error('Email sending failed');
  }
};