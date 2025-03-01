import express from 'express';
import { findPhoneNumberInSheet, getEnrollmentNumber } from '../services/googleSheets.js';
import { findPdfByEnrollmentNumber } from '../services/googleDrive.js';
import { sendPdfViaWati, sendErrorMessageViaWati } from '../services/watiApi.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Webhook endpoint to receive name and number
router.post('/receive', async (req, res) => {
  try {
    const { name, phoneNumber, phone_number } = req.body;
    const userPhoneNumber = phoneNumber || phone_number; // Support both formats
    
    logger.info('Received webhook request', { name, phoneNumber: userPhoneNumber });
    
    // Input validation
    if (!name || !userPhoneNumber) {
      logger.warn('Missing required fields', { name, phoneNumber: userPhoneNumber });
      return res.status(400).json({ 
        success: false, 
        message: 'Name and phone number are required' 
      });
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(userPhoneNumber.replace(/\s/g, ''))) {
      logger.warn('Invalid phone number format', { phoneNumber: userPhoneNumber });
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    // Sanitize inputs
    const sanitizedName = name.trim().replace(/[<>]/g, '');
    const sanitizedPhone = userPhoneNumber.replace(/\s/g, '');
    
    logger.info(`Processing webhook for ${sanitizedName} with phone number ${sanitizedPhone}`);
    
    // Find the phone number in Google Sheet
    const matchedRow = await findPhoneNumberInSheet(sanitizedPhone);
    
    if (!matchedRow) {
      logger.info('Phone number not found in database, sending error message');
      
      // Send error message via WATI API
      const errorMessage = "Invalid phone number. Please ensure you've registered with the correct number.";
      const watiResponse = await sendErrorMessageViaWati(sanitizedPhone, errorMessage);
      
      return res.status(404).json({ 
        success: false, 
        message: 'Phone number not found in the database',
        data: watiResponse
      });
    }
    
    // Get enrollment number from the matched row
    const enrollmentNumber = getEnrollmentNumber(matchedRow);
    
    if (!enrollmentNumber) {
      logger.warn('Enrollment number not found in the matched row');
      return res.status(404).json({
        success: false,
        message: 'Enrollment number not found for the matched phone number'
      });
    }
    
    // Find PDF file in Google Drive by enrollment number
    const pdfUrl = await findPdfByEnrollmentNumber(enrollmentNumber);
    
    if (!pdfUrl) {
      logger.warn(`PDF not found for enrollment number: ${enrollmentNumber}`);
      
      // Send error message via WATI API
      const errorMessage = "We couldn't find your document. Please contact support for assistance.";
      const watiResponse = await sendErrorMessageViaWati(sanitizedPhone, errorMessage);
      
      return res.status(404).json({
        success: false,
        message: 'PDF not found for the enrollment number',
        data: watiResponse
      });
    }
    
    // Send PDF via WATI API
    const watiResponse = await sendPdfViaWati(sanitizedPhone, sanitizedName, pdfUrl);
    
    logger.info('PDF sent successfully');
    
    return res.status(200).json({
      success: true,
      message: 'PDF sent successfully',
      data: watiResponse
    });
    
  } catch (error) {
    logger.error('Error processing webhook:', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({ 
      success: false, 
      message: 'Error processing webhook', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Test endpoint to verify the webhook is working
router.get('/test', (req, res) => {
  logger.info('Test endpoint accessed');
  res.status(200).json({ 
    success: true, 
    message: 'Webhook endpoint is working' 
  });
});

export const webhookRoutes = router;