import axios from 'axios';
import FormData from 'form-data';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Utility function to convert a stream to a string
const streamToString = (stream: NodeJS.ReadableStream): Promise<string> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on('error', reject);
    stream.on('end', () =>
      resolve(Buffer.concat(chunks).toString('utf8'))
    );
  });
};

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to download a file from a URL with confirmation token handling.
// It returns the full path of the downloaded file, preserving the original file name.
export const downloadFile = async (url: string): Promise<string> => {
  // Make the initial request
  let response = await axios.get(url, { responseType: 'stream', validateStatus: status => status < 400 });
  
  // Check if the response is HTML (indicating a confirmation page)
  if (
    response.headers['content-type'] &&
    response.headers['content-type'].includes('text/html')
  ) {
    logger.warn('Received HTML content. Attempting to extract confirmation token...');
    const htmlData = await streamToString(response.data);
    // Use a permissive regex to capture the confirmation token
    const confirmMatch = htmlData.match(/confirm=([^&]+)/);
    if (confirmMatch && confirmMatch[1]) {
      const confirmToken = confirmMatch[1];
      logger.info(`Extracted confirmation token: ${confirmToken}`);
      // Append the confirmation token to the URL and retry
      const confirmedUrl = `${url}&confirm=${confirmToken}`;
      logger.info(`Retrying download with URL: ${confirmedUrl}`);
      response = await axios.get(confirmedUrl, { responseType: 'stream', validateStatus: status => status < 400 });
    } else {
      throw new Error('Failed to extract confirmation token from HTML response.');
    }
  }
  
  // Determine the file name from the response headers, if available.
  let fileName = '';
  const contentDisposition = response.headers['content-disposition'];
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
    if (fileNameMatch && fileNameMatch[1]) {
      fileName = fileNameMatch[1];
    }
  }
  if (!fileName) {
    // Fallback: use the file ID from the URL (if available) or a default name.
    const fileIdRegex = /id=([^&]+)/;
    const fileIdMatch = url.match(fileIdRegex);
    fileName = fileIdMatch && fileIdMatch[1] ? `${fileIdMatch[1]}.pdf` : 'downloaded.pdf';
  }
  
  const filePath = path.join(__dirname, fileName);
  
  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    let error: Error | null = null;
    writer.on('error', err => {
      error = err;
      writer.close();
      reject(err);
    });
    writer.on('finish', () => {
      if (!error) {
        resolve(true);
      }
    });
  });
  
  return filePath;
};

/**
 * Sends a PDF via WATI API.
 * @param phoneNumber - The recipient's phone number.
 * @param name - Recipient's name (used in caption).
 * @param pdfUrl - The URL to the PDF file OR the file ID.
 *                 If only a file ID is provided, it will be formatted as:
 *                 "https://drive.google.com/uc?export=download&id=[FILE_ID]"
 */
export const sendPdfViaWati = async (
  phoneNumber: string,
  name: string,
  pdfUrl: string
): Promise<any> => {
  let downloadedFilePath: string | undefined;
  try {
    const { WATI_BASE_URL, WATI_BEARER_TOKEN } = process.env;
    if (!WATI_BASE_URL || !WATI_BEARER_TOKEN) {
      throw new Error('WATI API credentials are not properly configured');
    }
    if (!pdfUrl) {
      throw new Error('PDF URL cannot be null or undefined');
    }

    // Process pdfUrl: If it starts with "http" and is a Google Drive link, extract the file ID.
    if (pdfUrl.startsWith('http')) {
      if (pdfUrl.includes('drive.google.com')) {
        const fileIdRegex = /(?:\/d\/|open\?id=|id=)([^\/&]+)/;
        const match = pdfUrl.match(fileIdRegex);
        if (match && match[1]) {
          pdfUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
          logger.info(`Extracted file ID and constructed PDF URL: ${pdfUrl}`);
        } else {
          logger.warn(`Google Drive URL provided but file ID could not be extracted. Using original URL: ${pdfUrl}`);
        }
      }
    } else {
      // Assume pdfUrl is a file ID if it doesn't start with "http"
      pdfUrl = `https://drive.google.com/uc?export=download&id=${pdfUrl}`;
      logger.info(`Constructed PDF URL from file ID: ${pdfUrl}`);
    }

    // Download the PDF to a temporary file, preserving its original name.
    downloadedFilePath = await downloadFile(pdfUrl);

    // Get the file name from the downloaded file path.
    const fileName = path.basename(downloadedFilePath);

    // Create FormData and attach the file and additional fields.
    const form = new FormData();
    form.append('file', fs.createReadStream(downloadedFilePath), fileName);
    form.append('phone', phoneNumber);
    form.append('caption', `Hello ${name}, here's your requested document.`);
    form.append('filename', fileName);

    const url = `${WATI_BASE_URL}/api/v1/sendSessionFile/${phoneNumber}`;
    logger.info(`Sending PDF to ${phoneNumber} via WATI API`);

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${WATI_BEARER_TOKEN}`
      },
      timeout: 10000, // 10-second timeout
    });

    if (response.data && (response.data.success === true || response.data.result === true)) {
      logger.info('PDF sent successfully via WATI API');
    } else {
      logger.error('Failed to send PDF via WATI API. Full response:', response.data);
      throw new Error('Failed to send PDF via WATI API');
    }

    return response.data;
  } catch (error) {
    logger.error('Error sending PDF via WATI:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber,
      pdfUrl,
    });
    throw error;
  } finally {
    // Clean up the temporary file if it was downloaded.
    if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
      fs.unlinkSync(downloadedFilePath);
    }
  }
};

// Send error message via WATI API
export const sendErrorMessageViaWati = async (
  phoneNumber: string,
  message: string
): Promise<any> => {
  try {
    const { WATI_BASE_URL, WATI_BEARER_TOKEN } = process.env;
    if (!WATI_BASE_URL || !WATI_BEARER_TOKEN) {
      throw new Error('WATI API credentials are not properly configured');
    }
    
    const url = `${WATI_BASE_URL}/api/v1/sendSessionMessage/${phoneNumber}`;
    logger.info(`Sending error message to ${phoneNumber} via WATI API`);
    
    const response = await axios.post(
      url,
      {
        phone: phoneNumber,
        message: message,
      },
      {
        headers: {
          'Authorization': `Bearer ${WATI_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10-second timeout
      }
    );
    
    if (response.data && (response.data.success === true || response.data.result === true)) {
      logger.info('Error message sent successfully via WATI API');
    } else {
      logger.error('Failed to send error message via WATI API:', { info: response.data.message });
      throw new Error(response.data.message || 'Unknown error');
    }
    
    return response.data;
  } catch (error) {
    logger.error('Error sending message via WATI:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      phoneNumber,
      message,
    });
    throw error;
  }
};
