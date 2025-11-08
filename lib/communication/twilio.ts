/**
 * Twilio Communication Service
 * Provides SMS, voice calls, and messaging capabilities
 */

import twilio from 'twilio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SmsMessage {
  to: string;
  body: string;
  mediaUrl?: string[];
}

interface VoiceCall {
  to: string;
  message: string;
  language?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TwilioService {
  private client: any;
  private phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  constructor() {
    if (!this.isConfigured()) {
      throw new Error('Twilio is not configured');
    }

    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  /**
   * Check if Twilio is configured
   */
  private isConfigured(): boolean {
    return (
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_PHONE_NUMBER
    );
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SmsMessage): Promise<SendResult> {
    try {
      const result = await this.client.messages.create({
        body: message.body,
        from: this.phoneNumber,
        to: message.to,
        mediaUrl: message.mediaUrl,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(
    tenantId: string,
    messages: SmsMessage[]
  ): Promise<{ success: number; failed: number; messageIds: string[] }> {
    const results: {
      success: number;
      failed: number;
      messageIds: string[];
    } = {
      success: 0,
      failed: 0,
      messageIds: [],
    };

    for (const message of messages) {
      const result = await this.sendSMS(message);
      if (result.success && result.messageId) {
        results.success++;
        results.messageIds.push(result.messageId);

        // Log to database
        await this.logMessage(tenantId, 'SMS', message.to, true);
      } else {
        results.failed++;
        await this.logMessage(
          tenantId,
          'SMS',
          message.to,
          false,
          result.error
        );
      }
    }

    return results;
  }

  /**
   * Make voice call with TTS (Text-To-Speech)
   */
  async makeCall(call: VoiceCall): Promise<SendResult> {
    try {
      const twiml = new twilio.twiml.VoiceResponse();

      // Add speech with optional language
      twiml.say(
        { voice: 'alice', language: call.language || 'en-US' },
        call.message
      );

      const result = await this.client.calls.create({
        twiml: twiml.toString(),
        to: call.to,
        from: this.phoneNumber,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      console.error('Error making call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Make bulk voice calls
   */
  async makeBulkCalls(
    tenantId: string,
    calls: VoiceCall[]
  ): Promise<{ success: number; failed: number; callIds: string[] }> {
    const results: {
      success: number;
      failed: number;
      callIds: string[];
    } = {
      success: 0,
      failed: 0,
      callIds: [],
    };

    for (const call of calls) {
      const result = await this.makeCall(call);
      if (result.success && result.messageId) {
        results.success++;
        results.callIds.push(result.messageId);

        // Log to database
        await this.logMessage(tenantId, 'VOICE', call.to, true);
      } else {
        results.failed++;
        await this.logMessage(
          tenantId,
          'VOICE',
          call.to,
          false,
          result.error
        );
      }
    }

    return results;
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<{
    status: string;
    dateCreated: Date;
    dateSent?: Date;
    errorCode?: number;
    errorMessage?: string;
  }> {
    try {
      const message = await this.client.messages(messageId).fetch();

      return {
        status: message.status,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error) {
      console.error('Error getting message status:', error);
      throw error;
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<{
    status: string;
    duration: number;
    dateCreated: Date;
    endTime?: Date;
    price?: string;
  }> {
    try {
      const call = await this.client.calls(callId).fetch();

      return {
        status: call.status,
        duration: call.duration,
        dateCreated: call.dateCreated,
        endTime: call.endTime,
        price: call.price,
      };
    } catch (error) {
      console.error('Error getting call status:', error);
      throw error;
    }
  }

  /**
   * List SMS messages for a phone number
   */
  async listSMSMessages(
    phoneNumber: string,
    limit = 20
  ): Promise<
    Array<{
      sid: string;
      from: string;
      to: string;
      body: string;
      status: string;
      dateSent: Date;
    }>
  > {
    try {
      const messages = await this.client.messages.list({
        to: phoneNumber,
        limit,
      });

      return messages.map((msg: any) => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        dateSent: msg.dateSent,
      }));
    } catch (error) {
      console.error('Error listing SMS messages:', error);
      throw error;
    }
  }

  /**
   * List calls for a phone number
   */
  async listCalls(
    phoneNumber: string,
    limit = 20
  ): Promise<
    Array<{
      sid: string;
      from: string;
      to: string;
      status: string;
      duration: number;
      dateCreated: Date;
    }>
  > {
    try {
      const calls = await this.client.calls.list({
        to: phoneNumber,
        limit,
      });

      return calls.map((call: any) => ({
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        dateCreated: call.dateCreated,
      }));
    } catch (error) {
      console.error('Error listing calls:', error);
      throw error;
    }
  }

  /**
   * Log communication message to database
   */
  private async logMessage(
    tenantId: string,
    type: 'SMS' | 'VOICE' | 'WHATSAPP',
    recipient: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      await prisma.communication_Logs.create({
        data: {
          tenant_id: tenantId,
          communication_type: type,
          recipient,
          status: success ? 'SENT' : 'FAILED',
          error_message: error,
        },
      });
    } catch (err) {
      console.error('Error logging communication:', err);
    }
  }
}

export const twilioService = new TwilioService();
