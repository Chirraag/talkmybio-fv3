# StoryMind Backend

This is the backend server for StoryMind, handling Retell webhooks and story processing.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your environment variables to `.env`:
- OPENAI_API_KEY: Your OpenAI API key
- Firebase Service Account variables (from serviceAccount.json):
  - FIREBASE_PROJECT_ID
  - FIREBASE_PRIVATE_KEY_ID
  - FIREBASE_PRIVATE_KEY
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_CLIENT_ID
  - FIREBASE_AUTH_URI
  - FIREBASE_TOKEN_URI
  - FIREBASE_AUTH_PROVIDER_CERT_URL
  - FIREBASE_CLIENT_CERT_URL

To get Firebase service account credentials:
1. Go to Firebase Console
2. Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Copy each value from the downloaded JSON file into the corresponding environment variable in your .env file

## Development

Run the development server:
```bash
npm run dev
```

## Production

Start the production server:
```bash
npm start
```

## Endpoints

- POST `/webhook/retell`: Handles Retell webhook events for call_ended and call_analyzed