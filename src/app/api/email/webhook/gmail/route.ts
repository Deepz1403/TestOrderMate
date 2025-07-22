import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { google, gmail_v1 } from 'googleapis';
import { Buffer } from 'buffer';

interface Header {
  name?: string | null;
  value?: string | null;
}

interface HistoryItem {
  messagesAdded?: Array<{ message?: { id?: string | null } | null }>;
}

// Gmail Pub/Sub webhook endpoint
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
    // Verify the request is from Google
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Extract the Pub/Sub message
    const { message } = body;
    if (!message) {
      return NextResponse.json({ error: 'No message found' }, { status: 400 });
    }

    // Decode the base64 message data
    const messageData = JSON.parse(Buffer.from(message.data, 'base64').toString());
    
    console.log('Gmail webhook received:', messageData);

    // Extract email details
    const { emailAddress, historyId } = messageData;
    
    // Process new emails immediately
    await processNewEmails(emailAddress, historyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function processNewEmails(emailAddress: string, historyId: string) {
  try {
    console.log(`Processing new emails for ${emailAddress}, history ID: ${historyId}`);
    
    // Get Gmail access token from your environment or database
    const gmail = await getGmailInstance();
    
    // Fetch message history since last historyId
    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded']
    });

    interface HistoryItem {
  messagesAdded?: Array<{ message?: { id?: string | null } | null }>;
}

    if (!history.data.history) {
      console.log('No new messages found');
      return;
    }

    // Process each new message
    for (const historyItem of history.data.history as HistoryItem[]) {
      if (historyItem.messagesAdded) {
        for (const messageAdded of historyItem.messagesAdded) {
          await processNewMessage(gmail, messageAdded.message?.id as string | undefined);
        }
      }
    }
    
  } catch (error) {
    console.error('Error processing new emails:', error);
  }
}

async function processNewMessage(gmail: gmail_v1.Gmail, messageId: string | undefined) {
  if (!messageId) return;
  
  try {
    // Fetch the full message
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    // Extract email content and metadata
        const headers: Header[] = message.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === 'Subject')?.value || '';
    const from = headers.find((h) => h.name === 'From')?.value || '';
    const date = headers.find((h) => h.name === 'Date')?.value || '';
    
    // Get email body
    let emailContent = '';
    if (message.data.payload?.body?.data) {
      emailContent = Buffer.from(message.data.payload.body.data, 'base64').toString();
    } else if (message.data.payload?.parts) {
      // Handle multipart messages
      for (const part of message.data.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          emailContent += Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    // Process the email through AI pipeline
    const processResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/email/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailContent,
        subject,
        senderEmail: from,
        receivedDate: new Date(date)
      })
    });

    const result = await processResponse.json();
    console.log(`Email ${messageId} processed:`, result.success ? 'Success' : 'Failed');
    
    if (result.success && result.isOrder) {
      console.log(`New order created from email: ${result.order._id}`);
    }

  } catch (error) {
    console.error(`Error processing message ${messageId}:`, error);
  }
}

async function getGmailInstance() {
  // This would typically use OAuth2 credentials stored in your database
  // For now, returning a placeholder - you'll need to implement proper OAuth2 flow
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  // Set credentials from stored tokens
  oauth2Client.setCredentials({
    access_token: process.env.GMAIL_ACCESS_TOKEN,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}