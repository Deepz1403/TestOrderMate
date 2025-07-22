import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';

// Microsoft Outlook webhook endpoint
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    
    // Verify the request is from Microsoft
    const validationToken = request.headers.get('validation-token');
    if (validationToken) {
      // This is a webhook validation request
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.log('Outlook webhook received:', body);

    // Process the notification
    const { value } = body;
    if (value && Array.isArray(value)) {
      for (const notification of value) {
        await processOutlookNotification(notification);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Outlook webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function processOutlookNotification(notification: any) {
  try {
    const { resourceData, changeType } = notification;
    
    if (changeType === 'created') {
      console.log('New email received:', resourceData);
      
      // In a real implementation, you would:
      // 1. Use Microsoft Graph API to fetch the full message
      // 2. Extract email content
      // 3. Call the email processing API
      
      /*
      const emailContent = await fetchOutlookMessage(resourceData.id);
      
      await fetch('/api/email/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent: emailContent.body.content,
          subject: emailContent.subject,
          senderEmail: emailContent.from.emailAddress.address,
          receivedDate: emailContent.receivedDateTime
        })
      });
      */
    }
  } catch (error) {
    console.error('Error processing Outlook notification:', error);
  }
}