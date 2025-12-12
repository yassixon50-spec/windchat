import axios from 'axios';

// Eskiz.uz SMS API configuration
// Boshqa SMS provayderlar ham ishlatish mumkin (Twilio, PlayMobile, etc.)
const SMS_API_URL = process.env.SMS_API_URL || 'https://notify.eskiz.uz/api';
const SMS_EMAIL = process.env.SMS_EMAIL || '';
const SMS_PASSWORD = process.env.SMS_PASSWORD || '';

let authToken: string | null = null;
let tokenExpiry: number = 0;

// Get auth token from Eskiz
async function getAuthToken(): Promise<string> {
  if (authToken && Date.now() < tokenExpiry) {
    return authToken;
  }

  try {
    const response = await axios.post(`${SMS_API_URL}/auth/login`, {
      email: SMS_EMAIL,
      password: SMS_PASSWORD,
    });

    authToken = response.data.data.token;
    tokenExpiry = Date.now() + 29 * 24 * 60 * 60 * 1000; // 29 days
    return authToken!;
  } catch (error) {
    console.error('SMS auth error:', error);
    throw new Error('Failed to authenticate with SMS service');
  }
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Send SMS
export async function sendSMS(phone: string, message: string): Promise<SMSResult> {
  try {
    // Format phone number (remove + and spaces)
    const formattedPhone = phone.replace(/[\s+]/g, '');
    
    const token = await getAuthToken();
    
    const response = await axios.post(
      `${SMS_API_URL}/message/sms/send`,
      {
        mobile_phone: formattedPhone,
        message: message,
        from: '4546', // Eskiz default sender ID
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.status === 'success') {
      return {
        success: true,
        messageId: response.data.id,
      };
    }

    return {
      success: false,
      error: response.data.message || 'SMS sending failed',
    };
  } catch (error: any) {
    console.error('SMS send error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to send SMS',
    };
  }
}

// For development/testing - mock SMS
export async function sendSMSMock(phone: string, message: string): Promise<SMSResult> {
  console.log('\n========================================');
  console.log('📱 SMS MOCK MODE (Test)');
  console.log('========================================');
  console.log(`📞 To: ${phone}`);
  console.log(`💬 Message: ${message}`);
  console.log('✅ Status: SENT (simulated)');
  console.log('========================================\n');
  
  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
}

// Check if real SMS credentials exist
const useRealSMS = !!(SMS_EMAIL && SMS_PASSWORD);

if (!useRealSMS) {
  console.log('\n⚠️  SMS Mock Mode Active - No real SMS will be sent');
  console.log('   To enable real SMS, add SMS_EMAIL and SMS_PASSWORD to .env\n');
}

// Use mock in development if no SMS credentials
export const smsService = {
  send: useRealSMS ? sendSMS : sendSMSMock,
};
