import React, { useState } from 'react';
import { Send, FileText, Database, CheckCircle, XCircle, Search, FileCheck } from 'lucide-react';

function App() {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/webhook/receive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phoneNumber }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }
      
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Webhook PDF Sender</h1>
          <p className="text-gray-600">
            Send PDFs via WhatsApp using WATI API after verifying phone numbers in Google Sheets
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Send className="mr-2 h-5 w-5 text-blue-500" />
            Test Webhook
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter recipient name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter phone number (with country code)"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out flex justify-center items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Send PDF
                </>
              )}
            </button>
          </form>
        </div>

        {(response || error) && (
          <div className={`bg-white rounded-lg shadow-md p-6 ${error ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`}>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              {error ? (
                <>
                  <XCircle className="mr-2 h-5 w-5 text-red-500" />
                  Error
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  Response
                </>
              )}
            </h2>
            
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-60">
              <pre className="text-sm">
                {error ? error : JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Database className="mr-2 h-5 w-5 text-purple-500" />
            How It Works
          </h2>
          
          <div className="space-y-4">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                1
              </div>
              <div>
                <h3 className="font-medium">Receive Webhook</h3>
                <p className="text-gray-600 text-sm">The server receives a webhook with name and phone number.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                2
              </div>
              <div>
                <h3 className="font-medium">Check Google Sheet</h3>
                <p className="text-gray-600 text-sm">The system checks if the phone number exists in the connected Google Sheet.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                3
              </div>
              <div>
                <h3 className="font-medium">Find Enrollment Number</h3>
                <p className="text-gray-600 text-sm">If the number is found, the system extracts the enrollment number from the matching row.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                4
              </div>
              <div>
                <h3 className="font-medium">Search Google Drive</h3>
                <p className="text-gray-600 text-sm">The system searches Google Drive for a PDF file matching the enrollment number.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                5
              </div>
              <div>
                <h3 className="font-medium">Send PDF via WATI</h3>
                <p className="text-gray-600 text-sm">If the PDF is found, the system sends it via WATI API to the WhatsApp number.</p>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mr-3">
                6
              </div>
              <div>
                <h3 className="font-medium">Error Handling</h3>
                <p className="text-gray-600 text-sm">If the number is not found or PDF is not available, an error message is sent to the user.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;