
https://echo.win/api-docs

# Authentication - echowin API Documentation

The echowin API uses API keys to authenticate requests. You can view and manage your API keys in the API Keys page of your portal.

## How it works

Authentication to the API is performed via API keys. Include your API key in the X-API-Key header of every request.

## API Key Header

All API requests require the following header:

Header Name: X-API-Key
Header Value: your-api-key-here

Example Request:
curl -X GET "https://echo.win/api/v1/contacts" \
  -H "X-API-Key: ew_xxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json"

## Getting Your API Key

1. Log in to your echowin portal
2. Navigate to Settings > Integrations
3. Click "Create API Key"
4. Copy your key immediately (it won't be shown again)

## Security Best Practices

1. Never share your API key: Keep your API key confidential. Do not share it in public repositories or client-side code.

2. Rotate keys regularly: Create new API keys periodically and delete old ones.

3. Use environment variables: Store your API key in environment variables, not in your codebase.

4. Monitor usage: Regularly check your API usage in the portal for any unusual activity.

## Error Response (401 Unauthorized)

If authentication fails, you'll receive:

{
  "error": "Invalid or missing API key",
  "code": "UNAUTHORIZED"
}

Common causes:
- Missing X-API-Key header
- Invalid or expired API key
- API key doesn't have required permissions

## Rate Limiting

API requests are rate limited per team to ensure fair usage and system stability. Rate limits vary by operation type:

| Operation Type | Limit | Window |
|---------------|-------|--------|
| Standard (GET requests) | 100 requests | per minute |
| Search operations | 30 requests | per minute |
| Write operations (POST/PUT) | 60 requests | per minute |
| Bulk operations | 10 requests | per minute |
| Resource-specific (e.g., webpage refresh) | 1 request | per day |

### Rate Limit Headers

When rate limited, you'll receive a 429 status code with the following headers:
- X-RateLimit-Limit: Maximum requests allowed
- X-RateLimit-Remaining: Requests remaining in current window
- X-RateLimit-Reset: ISO timestamp when the rate limit resets
- Retry-After: Seconds to wait before retrying

### Rate Limit Response

{
  "error": "Rate limit exceeded",
  "retryAfter": 45,
  "resetAt": "2024-01-15T10:30:00.000Z"
}


# Instructions to Mary Agent

Agent Instructions:





All understanding is in English, no foreign language interpretation..



Registration Data: Collect full name, email address (ask to spell letter by letter), phone number, mailing address, and estimated retirement year.



Guest Policy: Ask if they are bringing a guest → If yes, collect the guest's full name and ask if they are also a Federals employee.



In this campaign we are offering two location in two states both of then on Sunday June 14th: 
Location #1: Holiday Inn Express at 1780 Sharley Way In Lexington Kentucky 40511, 
Location #2: Embassy Suites Greenville Golf Report & Conference Cente at 670 Verae Blvd, Greensville, SC 29607.



So it is very important we ask caller what location they want to attend at.



VERY IMPORTANT! At the end of the call you MUST summurize their reservation with location and time and finally thank caller

Conference Time and Location: 
Lexington Kentucky on Sunday June 14th from 2 PM-3:30PM 
Greensville Scouth Carolina on Sunday June 14th from 2 PM-3:30PM

Hi there. 
You've reached the Fed Safe Retirement seminar registration line. 
This is Lisa, your virtual team member. 
On Sunday, June 14th, we have two conferences, 
I'll be helping you save your spot today. one in Lexington Kentucky from 2 PM-3:30PM 
and the second one in Greensville Scouth Carolina from 2 PM-3:30PM.

Which conference are you calling to enroll in? 
Can I start with your full name? 
Could you please provide your email address, spelling it out for me letter by letter? 
I want to make sure I get it exactly right. Now, could I please get your phone number? 
Next could I please get your mailing address? 
And what is your estimated retirement year? 
Are you planning on bringing a guest to the seminar? 
Wonderfull, you are all set for the seminar {selected seminar info including date and time}

Tell caller to "Please remember to bring a pen and notepad and feel free to invite any other colleagues who might be interested. we look forward to seeing you there."

Thank you for registering and have a wonderfull day! Good bye