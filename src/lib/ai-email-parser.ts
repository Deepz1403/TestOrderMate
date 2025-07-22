import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface EmailClassificationResult {
  isOrder: boolean;
  confidence: number;
  reasoning: string;
}

export interface ExtractedOrderData {
  customerName: string;
  customerEmail: string;
  orderNumber?: string;
  orderDate: string;
  products: Array<{
    name: string;
    quantity: number;
    price?: number;
    sku?: string;
  }>;
  totalAmount?: number;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  confidence: number;
}

export async function classifyEmail(emailContent: string, subject: string): Promise<EmailClassificationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an expert email classifier. Analyze the following email to determine if it contains a customer order or purchase request.

Email Subject: ${subject}
Email Content: ${emailContent}

Look for indicators such as:
- Product names and quantities
- Pricing information
- Order confirmations
- Purchase requests
- Shopping cart contents
- Customer information
- Shipping details

Respond with a JSON object containing:
- isOrder: boolean (true if this is an order email)
- confidence: number (0-100, how confident you are)
- reasoning: string (brief explanation of your decision)

Only classify as an order if there's clear evidence of a purchase or order request.

Response format: {"isOrder": boolean, "confidence": number, "reasoning": "string"}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[^}]*\}/);
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);
      return {
        isOrder: parsedResult.isOrder || false,
        confidence: parsedResult.confidence || 0,
        reasoning: parsedResult.reasoning || 'No reasoning provided'
      };
    }
    
    return {
      isOrder: false,
      confidence: 0,
      reasoning: 'Could not parse AI response'
    };
  } catch (error) {
    console.error('Error classifying email:', error);
    return {
      isOrder: false,
      confidence: 0,
      reasoning: 'Error occurred during classification'
    };
  }
}

export async function extractOrderData(emailContent: string, subject: string): Promise<ExtractedOrderData | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Extract order information from this email. Be precise and only extract information that is clearly present.

Email Subject: ${subject}
Email Content: ${emailContent}

Extract the following information and respond with a JSON object:
{
  "customerName": "string (full name of customer)",
  "customerEmail": "string (email address)",
  "orderNumber": "string (order/reference number if present)",
  "orderDate": "string (YYYY-MM-DD format, use email date if order date not specified)",
  "products": [
    {
      "name": "string (product name)",
      "quantity": number,
      "price": number (if specified),
      "sku": "string (if specified)"
    }
  ],
  "totalAmount": number (if specified),
  "shippingAddress": {
    "street": "string",
    "city": "string", 
    "state": "string",
    "zipCode": "string",
    "country": "string"
  },
  "confidence": number (0-100, confidence in extraction accuracy)
}

Rules:
- Only include fields where you have clear information
- For products, extract all items mentioned
- Use null for missing optional fields
- Be conservative with confidence scoring
- If customer email is not in content, extract from email headers/sender

Response format: Valid JSON object only
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedResult = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsedResult.products || parsedResult.products.length === 0) {
        console.log('Validation failed: No products found in parsed result.');
        return null;
      }

      // If customer name is missing, use the email address as a fallback
      if (!parsedResult.customerName && parsedResult.customerEmail) {
        parsedResult.customerName = parsedResult.customerEmail;
      }

      return parsedResult as ExtractedOrderData;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting order data:', error);
    return null;
  }
}