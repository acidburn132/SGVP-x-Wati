# Webhook PDF Sender

This application receives webhooks with name and phone number, checks if the phone number exists in a Google Sheet, and if found, sends a PDF document via the WATI API to the corresponding WhatsApp number.

## Features

- Webhook endpoint to receive name and phone number
- Google Sheets integration to verify phone numbers
- WATI API integration to send PDFs via WhatsApp
- Simple UI for testing the webhook functionality

## Setup

### Prerequisites

- Node.js and npm
- Google Cloud Platform account with Google Sheets API enabled
- Service account with access to Google Sheets
- WATI account with API access

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@example.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id

# WATI API
WATI_API_KEY=your-wati-api-key
WATI_BASE_URL=https://api.wati.io
WATI_BEARER_TOKEN=your-wati-bearer-token

# PDF URL (replace with your actual PDF URL)
PDF_URL=https://example.com/your-document.pdf
```

### Google Sheets Setup

1. Create a Google Sheet with a column for phone numbers
2. Share the sheet with your service account email
3. Copy the Sheet ID from the URL (the long string between /d/ and /edit in the URL)

### Installation

```bash
npm install
```

### Running the Application

```bash
npm run dev
```

This will start both the frontend and backend servers.

## API Endpoints

### Webhook Endpoint

```
POST /webhook/receive
```

Request body:
```json
{
  "name": "John Doe",
  "phoneNumber": "+1234567890"
}
```

Response (success):
```json
{
  "success": true,
  "message": "PDF sent successfully",
  "data": { ... } // WATI API response
}
```

### Test Endpoint

```
GET /webhook/test
```

Response:
```json
{
  "success": true,
  "message": "Webhook endpoint is working"
}
```

## Google Sheets Structure

The application expects a Google Sheet with at least one of the following column headers for phone numbers:
- `phoneNumber`
- `phone`
- `mobile`

## License

MIT