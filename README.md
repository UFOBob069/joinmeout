# JoinMeOut

A lightweight, mobile-first social platform for spontaneous in-person plans.

## Overview

JoinMeOut is a social platform where people can spontaneously post and join casual in-person plans in their city. It's designed to foster low-pressure social connections, local exploration, and community engagement.

## Features

- Post and discover casual plans in your city
- Mobile-first design
- Real-time updates
- Location-based discovery
- Privacy controls
- Auto-expiring plans
- Group chat functionality

## Tech Stack

- React (Frontend)
- Node.js (Backend)
- Firebase Firestore (Database)
- Firebase Auth (Authentication)
- Material-UI (UI Components)
- React Router (Routing)
- Zustand (State Management)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  ├── components/     # Reusable UI components
  ├── pages/         # Page components
  ├── hooks/         # Custom React hooks
  ├── services/      # API and Firebase services
  ├── store/         # State management
  ├── utils/         # Utility functions
  └── styles/        # Global styles
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 