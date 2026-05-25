# Testing Daily Follow-up Notifications

## Prerequisites

1. Backend server must be running (`npm run start:dev` in clozzet-backend folder)
2. You need an admin user account
3. You need at least one customer with `nextFollowUpAt` set to today's date

## Step 1: Prepare Test Data

First, create or update a customer to have a follow-up due today:

1. Go to CRM Dashboard in your frontend
2. Create a new customer OR edit an existing one
3. Set the "Next Follow-up Date" to **today's date**
4. Save the customer

## Step 2: Test Using Postman/Thunder Client/Browser

### Option A: Using Postman or Thunder Client (VSCode Extension)

1. **Login first** to get your JWT token:
   - **Method**: POST
   - **URL**: `http://localhost:3000/auth/login`
   - **Body** (JSON):
     ```json
     {
       "email": "your-admin-email@example.com",
       "password": "your-password"
     }
     ```
   - **Copy the `access_token` from the response**

2. **Trigger the notifications**:
   - **Method**: POST
   - **URL**: `http://localhost:3000/customers/trigger-followup-notifications`
   - **Headers**:
     ```
     Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
     ```
   - **Click Send**

3. **Expected Response**:
   ```json
   {
     "success": true,
     "message": "Follow-up reminders sent successfully",
     "data": {
       "customersCount": 1,
       "managersNotified": 0
     }
   }
   ```

### Option B: Using cURL (Command Line)

1. **Login first**:
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"your-admin-email@example.com\",\"password\":\"your-password\"}"
   ```
   Copy the `access_token` from response

2. **Trigger notifications** (replace YOUR_TOKEN with actual token):
   ```bash
   curl -X POST http://localhost:3000/customers/trigger-followup-notifications \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Option C: Using the Frontend (Create a Test Button)

I can add a test button to your CRM dashboard if you prefer to test from the UI.

## Step 3: Verify Notifications Were Sent

1. **Check the backend console logs** - you should see:
   ```
   🔔 Starting daily follow-up reminder task...
   📅 Checking follow-ups for: [Today's Date]
   📊 Found X customers with follow-ups due today
   👥 Notifying X managers
   ✉️ Notification sent to manager...
   📧 Sending notifications to X admin(s)
   ✅ Daily follow-up reminders sent successfully
   ```

2. **Check notifications in the frontend**:
   - Click the notification bell icon in your app
   - You should see new notifications about today's follow-ups

3. **Check MongoDB database directly** (optional):
   - Open MongoDB Compass or mongosh
   - Navigate to the `notifications` collection
   - Look for new notifications with `type: "follow_up_reminder"`

## Step 4: Test the Automatic Cron Job

The cron job runs automatically every workday (Monday-Friday) at 9:00 AM Armenia time.

To test it:
1. Keep your backend server running
2. Wait until Monday-Friday at 9:00 AM Armenia time
3. Check the console logs and notifications

**OR temporarily change the cron schedule for testing:**

Edit `clozzet-backend/src/customers/customers-scheduler.service.ts:25`:

```typescript
// Change from 9 AM every workday:
@Cron('0 0 9 * * 1-5', {

// To run every minute for testing:
@Cron('* * * * *', {
```

Then restart the backend and it will run every minute.

**⚠️ IMPORTANT:** Change it back after testing!

## Troubleshooting

### "No follow-ups due today" message
- Make sure you have customers with `nextFollowUpAt` set to exactly today
- The date comparison looks for dates between today 00:00:00 and tomorrow 00:00:00

### "Unauthorized" error
- Make sure you're logged in as an admin user
- The endpoint requires admin role
- Check your JWT token is valid and not expired

### No notifications appearing
- Check the backend console for errors
- Verify the NotificationsGateway is running
- Check the browser console for WebSocket connection
- Make sure the notification bell component is working

### Backend not building
- Run `npm install` in clozzet-backend folder
- Make sure `@nestjs/schedule` version 6.1.3 is installed
