import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import logger from '../utils/logger.js';

// Initialize Google Drive client
export const initGoogleDrive = async () => {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Drive credentials not properly configured');
    }
    
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth: serviceAccountAuth });
    return drive;
  } catch (error) {
    logger.error('Error initializing Google Drive:', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Find PDF file in Google Drive folder by enrollment number
export const findPdfByEnrollmentNumber = async (enrollmentNumber: string): Promise<string | null> => {
  try {
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('Google Drive folder ID not configured');
    }
    
    const drive = await initGoogleDrive();
    
    logger.info(`Searching for PDF with enrollment number: ${enrollmentNumber} in folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    
    // Search for PDF files in the specified folder that match the enrollment number
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and name contains '${enrollmentNumber}' and mimeType='application/pdf' and trashed=false`,
      fields: 'files(id, name, webContentLink)',
      spaces: 'drive',
    });
    
    const files = response.data.files;
    
    if (!files || files.length === 0) {
      logger.warn(`No PDF found for enrollment number: ${enrollmentNumber}`);
      return null;
    }
    
    // Get the first matching file
    const file = files[0];
    logger.info(`Found PDF file: ${file.name}`);
    
    // Get the webContentLink for the file
    if (!file.id) {
      logger.warn('File ID is missing');
      return null;
    }
    
    // Generate a direct download link
    // Note: This creates a link that requires authentication. For public files, you might need a different approach.
    const fileResponse = await drive.files.get({
      fileId: file.id,
      fields: 'webContentLink',
    });
    
    const webContentLink = fileResponse.data.webContentLink;
    
    if (!webContentLink) {
      logger.warn('Could not generate download link for the file');
      return null;
    }
    
    // Convert the webContentLink to a direct download link
    const directDownloadLink = webContentLink.replace('&export=download', '');
    
    logger.info(`Generated download link for PDF file`);
    return directDownloadLink;
  } catch (error) {
    logger.error('Error finding PDF in Google Drive:', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};