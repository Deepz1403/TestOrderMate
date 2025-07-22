import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Order } from '@/models/Order';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Get orders that require review (AI confidence < 90% or flagged)
    const ordersNeedingReview = await Order.find({
      $or: [
        { requiresReview: true },
        { aiConfidence: { $lt: 90 } },
        { status: 'pending' }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    // Get recent AI-processed orders
    const recentAIOrders = await Order.find({
      aiProcessed: true
    }).sort({ createdAt: -1 }).limit(20);

    // Get statistics
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          aiProcessedOrders: {
            $sum: { $cond: [{ $eq: ['$aiProcessed', true] }, 1, 0] }
          },
          ordersNeedingReview: {
            $sum: { $cond: [{ $eq: ['$requiresReview', true] }, 1, 0] }
          },
          averageConfidence: {
            $avg: { $cond: [{ $gt: ['$aiConfidence', 0] }, '$aiConfidence', null] }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ordersNeedingReview,
        recentAIOrders,
        stats: stats[0] || {
          totalOrders: 0,
          aiProcessedOrders: 0,
          ordersNeedingReview: 0,
          averageConfidence: 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AI orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI orders' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { orderId, status, reviewNotes } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
    }
    
    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }
    
    // Mark as reviewed
    updateData.requiresReview = false;
    updateData.reviewedAt = new Date();

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}