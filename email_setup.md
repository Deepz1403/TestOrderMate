# 📧 OrderMate Gmail Integration Setup

This guide will walk you through setting up automated email processing for your OrderMate application. Incoming emails to your designated Gmail inbox will be automatically analyzed by AI and, if identified as an order, converted into a new entry in your database.

## 🔄 How It Works

1.  **Email Received:** Your configured Gmail account receives a new email.
2.  **Gmail Pub/Sub Notification:** Gmail sends a real-time notification to a Google Cloud Pub/Sub topic.
3.  **Webhook Triggered:** Your OrderMate application's webhook (`/api/email/webhook/gmail`) receives this notification.
4.  **Email Content Fetched:** Your application uses the Gmail API to fetch the full content of the new email.
5.  **AI Processing:** Google Gemini analyzes the email content to classify if it's an order and extracts relevant details (products, quantities, customer info).
6.  **Order Creation:** If it's an order email, a new order is automatically created and saved to your MongoDB database.

## 🚀 Setup Steps

### Step 1: Google Cloud Project & API Setup

1.  **Go to Google Cloud Console:** [https://console.cloud.google.com/](https://console.cloud.com/)
2.  **Create a New Project:**
    *   Click on the project dropdown at the top.
    *   Click **"New Project"**.
    *   Give your project a name (e.g., "OrderMate Integration") and click **"CREATE"**.
3.  **Enable the Gmail API:**
    *   In the search bar at the top, type "Gmail API" and select it.
    *   Click the **"Enable"** button.
4.  **Configure OAuth Consent Screen:**
    *   In the search bar, type "OAuth consent screen" and select it.
    *   **User Type:** Select **"External"** and click **"CREATE"**.
    *   **App Information:**
        *   **App name:** `OrderMate`
        *   **User support email:** Your email address
        *   **Developer contact information:** Your email address
        *   Click **"SAVE AND CONTINUE"**.
    *   **Scopes:**
        *   Click **"+ ADD OR REMOVE SCOPES"**.
        *   In the filter, search for `gmail.modify`.
        *   Select the scope: `.../auth/gmail.modify` (This allows reading, composing, and sending emails).
        *   Click **"UPDATE"**, then **"SAVE AND CONTINUE"**.
    *   **Test Users:**
        *   Under "Test users", click **"+ ADD USERS"**.
        *   Enter the Google email address(es) you will use for testing and development. This is crucial to avoid "Access blocked" errors during token generation.
        *   Click **"ADD"**, then **"SAVE AND CONTINUE"**.
    *   **Summary:** Review the summary and click **"BACK TO DASHBOARD"**.

### Step 2: Create OAuth 2.0 Client ID

1.  **Go to Credentials:** In the search bar, type "Credentials" and select it.
2.  Click **"+ CREATE CREDENTIALS"** and choose **"OAuth client ID"**.
3.  **Application type:** Select **"Web application"**.
4.  **Name:** You can leave the default or name it `OrderMate Web Client`.
5.  **Authorized redirect URIs:**
    *   Click **"+ ADD URI"** and add: `http://localhost:3000/auth/gmail/callback`
    *   Click **"+ ADD URI"** again and add: `https://developers.google.com/oauthplayground`
    *   *(Optional, but recommended for future deployment)* If you plan to deploy to Vercel, add your future Vercel domain here (e.g., `https://your-app-name.vercel.app/auth/gmail/callback`).
6.  Click **"CREATE"**.
7.  A dialog will appear showing your **Client ID** and **Client Secret**. **Copy these values** and keep them safe. You can also download the JSON file.

### Step 3: Configure Environment Variables

Create a file named `.env.local` in the root of your project (if it doesn't exist) and add the following variables. Replace the placeholder values with your actual Client ID and Client Secret.

```bash
# Google Gemini AI (if used in your project)
GEMINI_API_KEY=your_gemini_api_key_here

# Gmail Integration
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/auth/gmail/callback # Keep this for local development

# Next.js (if used in your project)
NEXTAUTH_URL=http://localhost:3000 # For local development. Change to your Vercel URL in production.

# Database (if used in your project)
MONGODB_URI=your_mongodb_connection_string
DATABASE_NAME=OrderMate
```

### Step 4: Get Access & Refresh Tokens

You need a long-lived `refresh_token` to allow your application to get new `access_token`s without manual re-authentication.

1.  **Go to Google OAuth 2.0 Playground:** [https://developers.google.com/oauthplayground/](https://developers.google.com/oauthplayground/)
2.  **Configure with your credentials:**
    *   In the top-right corner, click the **gear icon** (⚙️ OAuth 2.0 Configuration).
    *   Check **"Use your own OAuth credentials"**.
    *   Paste your **OAuth Client ID** and **OAuth Client Secret**. Close the box.
3.  **Authorize the API:**
    *   In **Step 1** (left sidebar), in the "Input your own scopes" field, enter:
        `https://www.googleapis.com/auth/gmail.modify`
    *   Click **"Authorize APIs"**.
    *   You will be redirected to Google's authentication page. Select your account (the one you added as a test user). You might see a warning about the app not being verified; click "Advanced" and "Go to (your app name)" to proceed. Grant the permissions.
4.  **Exchange for Tokens:**
    *   After authorization, you'll be redirected back to the Playground. In **Step 2**, click **"Exchange authorization code for tokens"**.
    *   In **Step 3** (right sidebar), you will see your `refresh_token` and `access_token`.
5.  **Update `.env.local`:** Copy these tokens and add them to your `.env.local` file:

    ```bash
    GMAIL_ACCESS_TOKEN=your_new_access_token_here
    GMAIL_REFRESH_TOKEN=your_new_refresh_token_here
    ```

### Step 5: Google Cloud Pub/Sub Setup

This sets up the real-time notification system from Gmail to your application.

1.  **Create a Pub/Sub Topic:**
    *   Go to [Google Cloud Pub/Sub Topics](https://console.cloud.google.com/cloudpubsub/topic/list).
    *   Click **"+ CREATE TOPIC"**.
    *   **Topic ID:** Enter a unique ID (e.g., `gmail-inbox-changes`).
    *   Click **"CREATE"**.
2.  **Grant Gmail Permissions:**
    *   After creating the topic, go to its **"PERMISSIONS"** tab.
    *   Click **"+ ADD PRINCIPAL"**.
    *   **New principals:** `gmail-api-push@system.gserviceaccount.com`
    *   **Assign roles:** Select **"Pub/Sub Publisher"**.
    *   Click **"SAVE"**.
3.  **Create a Pub/Sub Subscription:**
    *   Go to [Google Cloud Pub/Sub Subscriptions](https://console.cloud.google.com/cloudpubsub/subscription/list).
    *   Click **"+ CREATE SUBSCRIPTION"**.
    *   **Subscription ID:** Enter a unique ID (e.g., `ordermate-webhook-sub`).
    *   **Select a Cloud Pub/Sub topic:** Choose the topic you just created (e.g., `projects/your-project-id/topics/gmail-inbox-changes`).
    *   **Delivery type:** Select **"Push"**.
    *   **Endpoint URL:** This is your application's public webhook URL.
        *   **For local testing:** `http://localhost:3000/api/email/webhook/gmail`
        *   **For production (Vercel):** `https://your-app-name.vercel.app/api/email/webhook/gmail`
        *   *(Important: You must deploy your app to Vercel first to get this URL)*
    *   Click **"CREATE"**.

### Step 6: Start Gmail Watch (One-Time Setup)

This step tells Gmail to start sending notifications to your Pub/Sub topic. This is a one-time API call.

You need to make a `POST` request to the Gmail API's `users.watch` endpoint from your running application. This ensures the call is authenticated with your application's credentials.

**Example of the API call (conceptual, as your app handles this):**

Your application's backend (e.g., a temporary route or a dedicated setup script) needs to execute a call similar to this using the `googleapis` library:

```typescript
import { google } from 'googleapis';

// ... (your OAuth2 client setup using GMAIL_CLIENT_ID, SECRET, ACCESS_TOKEN, REFRESH_TOKEN)

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

const response = await gmail.users.watch({
  userId: 'me',
  requestBody: {
    labelIds: ['INBOX'], // Watch for changes in the INBOX
    topicName: 'projects/YOUR_GOOGLE_CLOUD_PROJECT_ID/topics/YOUR_PUB_SUB_TOPIC_ID',
  },
});

console.log('Gmail API watch response:', response.data);
// Expected response: { historyId: "...", expiration: "..." }
```

*   **Replace `YOUR_GOOGLE_CLOUD_PROJECT_ID`** with your actual Google Cloud Project ID.
*   **Replace `YOUR_PUB_SUB_TOPIC_ID`** with the Topic ID you created in Step 5 (e.g., `gmail-inbox-changes`).

Once this call is successful, Gmail will begin sending notifications to your Pub/Sub topic whenever new emails arrive in your inbox.

## 🧪 Testing the Integration

1.  **Ensure your application is running:**
    ```bash
    npm run dev
    ```
    (Or deployed on Vercel)
2.  **Send a test email:** Send an email to the Gmail account you configured. Make sure the content resembles an order (e.g., "Hi, I would like to order 2 iPhone 15 Pro and 1 MacBook Air. My email is test@example.com").
3.  **Check your database:** After a short delay, the new order should appear in your MongoDB database.

## 🔍 Monitoring & Debugging

*   **Application Logs:** Check the terminal where your `npm run dev` is running for logs from your `/api/email/webhook/gmail` and `/api/email/process` routes.
*   **Google Cloud Pub/Sub:** Monitor your topic and subscription in the Google Cloud Console for message delivery and errors.
*   **Gmail API Dashboard:** Check the API usage dashboard in Google Cloud Console for any errors or rate limits.

## 🚨 Important Notes

*   **Webhook URLs must be HTTPS in production.**
*   **Keep OAuth tokens secure and refresh them regularly.** Your application's `getGmailInstance` function should handle token refreshing automatically.
*   **Monitor API usage** to avoid rate limits.
*   **Test thoroughly** before relying on this in a production environment.

---

Your OrderMate system will now automatically process incoming emails and create orders in real-time! 🎉
