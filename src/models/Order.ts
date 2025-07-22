import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct {
  name: string;
  quantity: number;
  price?: number;
  sku?: string;
}

export interface IShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IOriginalEmail {
  subject: string;
  content: string;
  sender: string;
  receivedDate: Date;
}

export interface IOrder extends Document {
  _id: string;
  date: string;
  time: string;
  products: IProduct[];
  status: string;
  orderLink: string;
  email: string;
  name: string;
  
  // AI-specific fields
  aiProcessed?: boolean;
  aiConfidence?: number;
  originalEmail?: IOriginalEmail;
  requiresReview?: boolean;
  totalAmount?: number;
  shippingAddress?: IShippingAddress;
  
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    min: 0
  },
  sku: {
    type: String,
    trim: true
  }
});

const ShippingAddressSchema = new Schema<IShippingAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true }
});

const OriginalEmailSchema = new Schema<IOriginalEmail>({
  subject: { type: String, required: true },
  content: { type: String, required: true },
  sender: { type: String, required: true },
  receivedDate: { type: Date, required: true }
});

const OrderSchema = new Schema<IOrder>({
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  products: [ProductSchema],
  status: {
    type: String,
    required: true,
    trim: true
  },
  orderLink: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // AI-specific fields
  aiProcessed: {
    type: Boolean,
    default: false
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 100
  },
  originalEmail: OriginalEmailSchema,
  requiresReview: {
    type: Boolean,
    default: false
  },
  totalAmount: {
    type: Number,
    min: 0
  },
  shippingAddress: ShippingAddressSchema
}, {
  timestamps: true,
});

// Indexes
OrderSchema.index({ orderLink: 1 });
OrderSchema.index({ email: 1 });
OrderSchema.index({ date: 1 });
OrderSchema.index({ aiProcessed: 1 });
OrderSchema.index({ requiresReview: 1 });
OrderSchema.index({ status: 1 });

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);