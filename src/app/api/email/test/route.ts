import { NextResponse } from 'next/server';

// Test endpoint to manually process an email for demo purposes
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailContent, subject } = body;

    // Example test email content
    const testEmailContent = emailContent || `
Dear OrderMate Team,

I would like to place an order for the following items:

1. Widget Pro X1 - Quantity: 5 pieces - $29.99 each
2. Super Tool Kit - Quantity: 2 sets - $89.50 each  
3. Premium Cable Bundle - Quantity: 10 units - $15.75 each

Customer Details:
Name: John Smith
Email: john.smith@example.com
Phone: (555) 123-4567

Shipping Address:
123 Main Street
New York, NY 10001
United States

Please confirm this order and let me know the total cost including shipping.

Best regards,
John Smith
`;

    const testSubject = subject || "New Order Request - John Smith";

    // Call the actual email processing API
    const processResponse = await fetch(`${request.url.replace('/test', '/process')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailContent: testEmailContent,
        subject: testSubject,
        senderEmail: 'john.smith@example.com',
        receivedDate: new Date().toISOString()
      })
    });

    const result = await processResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Test email processed',
      result
    });

  } catch (error) {
    console.error('Test email processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Test failed' },
      { status: 500 }
    );
  }
}