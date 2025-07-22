import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { classifyEmail, extractOrderData } from '@/lib/ai-email-parser';
import { Order } from '@/models/Order';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { emailContent, subject, senderEmail, receivedDate } = body;

    if (!emailContent || !subject) {
      return NextResponse.json(
        { success: false, error: 'Email content and subject are required' },
        { status: 400 }
      );
    }

    console.log('Processing email:', { subject, senderEmail });

    // Step 1: Classify if this is an order email
    const classification = await classifyEmail(emailContent, subject);
    
    console.log('Classification result:', classification);

    if (!classification.isOrder || classification.confidence < 70) {
      return NextResponse.json({
        success: true,
        isOrder: false,
        classification,
        message: 'Email classified as non-order'
      });
    }

    // Step 2: Extract order data
    const extractedData = await extractOrderData(emailContent, subject);
    
    if (!extractedData) {
      return NextResponse.json({
        success: false,
        error: 'Failed to extract order data from email',
        classification
      });
    }

    console.log('Extracted order data:', extractedData);

    // Step 3: Create order in database
    const orderData = {
      // Map extracted data to Order schema
      date: extractedData.orderDate || new Date().toISOString().split('T')[0], // Use extracted date or fallback to today
      time: new Date().toLocaleTimeString(),
      products: extractedData.products.map(p => ({
        name: p.name,
        quantity: p.quantity,
        price: p.price || 0
      })),
      status: 'pending', // Default status for AI-created orders
      orderLink: extractedData.orderNumber || `AI-${Date.now()}`,
      email: extractedData.customerEmail,
      name: extractedData.customerName,
      
      // AI-specific fields
      aiProcessed: true,
      aiConfidence: extractedData.confidence,
      originalEmail: {
        subject,
        content: emailContent,
        sender: senderEmail,
        receivedDate: receivedDate || new Date()
      },
      requiresReview: extractedData.confidence < 90,
      totalAmount: extractedData.totalAmount,
      shippingAddress: extractedData.shippingAddress
    };

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    return NextResponse.json({
      success: true,
      isOrder: true,
      classification,
      extractedData,
      order: savedOrder,
      message: 'Order created successfully from email'
    });

  } catch (error) {
    console.error('Error processing email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process email' },
      { status: 500 }
    );
  }
}