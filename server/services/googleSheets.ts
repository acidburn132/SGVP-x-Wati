import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import logger from '../utils/logger.js';

// Initialize Google Sheets client
export const initGoogleSheets = async () => {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error('Google Sheets credentials not properly configured');
    }
    
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    logger.error('Error initializing Google Sheets:', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Find a phone number in the Google Sheet and return the matching row
export const findPhoneNumberInSheet = async (phoneNumber: string) => {
  try {
    const doc = await initGoogleSheets();
    const sheet = doc.sheetsByIndex[0]; // Using the first sheet
    
    if (!sheet) {
      throw new Error('No sheet found in the Google Spreadsheet');
    }
    
    await sheet.loadCells();
    
    const rows = await sheet.getRows();
    
    // Normalize the phone number (remove non-digit characters)
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, '');
    
    logger.info(`Searching for phone number in sheet: ${normalizedPhoneNumber}`);
    
    // Find the row with the matching phone number
    // This specifically looks for the "PhoneNumber" column as in your sheet format
    const matchedRow = rows.find(row => {
      // Get the phone number from the "PhoneNumber" column
      const phone = row.get('PhoneNumber') || '';
      // Normalize it and compare
      return phone.toString().replace(/\D/g, '') === normalizedPhoneNumber;
    });
    
    if (matchedRow) {
      logger.info('Phone number found in sheet');
    } else {
      logger.info('Phone number not found in sheet');
    }
    
    return matchedRow;
  } catch (error) {
    logger.error('Error finding phone number in sheet:', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Get enrollment number from the matched row
export const getEnrollmentNumber = (matchedRow: any): string | null => {
  try {
    // Specifically look for the "enrollmentNumber" column as in your sheet format
    const enrollmentNumber = matchedRow.get('enrollmentNumber');
    
    if (!enrollmentNumber) {
      logger.warn('Enrollment number not found in the matched row');
      return null;
    }
    
    logger.info(`Found enrollment number: ${enrollmentNumber}`);
    return enrollmentNumber.toString();
  } catch (error) {
    logger.error('Error getting enrollment number:', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
};