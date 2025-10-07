# Frontend - NextJS with Shadcn/UI

This is the frontend application for the Golang MCP User Management System.

## Features

- **Authentication**: Login and registration with JWT tokens
- **Profile Management**: View and edit user profiles
- **Avatar Upload**: Upload and manage user avatars
- **Security Dashboard**: View security status and configuration
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Modern UI**: Built with Shadcn/UI components

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Lucide React** - Icons

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the frontend directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Protected dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── layout.tsx        # Root layout with AuthProvider
├── components/           # Reusable components
│   ├── ui/              # Shadcn/UI components
│   └── ProtectedRoute.tsx # Route protection component
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication context
└── lib/                 # Utilities and API client
    └── api.ts          # API client and types
```

## API Integration

The frontend communicates with the Golang backend API through:

- **Authentication endpoints**: `/register`, `/login`, `/logout`
- **Profile endpoints**: `/profile`, `/profile/avatar`
- **Security endpoints**: `/security/status`, `/security/csrf-token`

## Authentication Flow

1. User visits the app
2. If not authenticated, redirected to login page
3. After successful login, redirected to dashboard
4. JWT token stored in localStorage
5. Token automatically included in API requests
6. On 401 response, user redirected to login

## Security Features

- **JWT Token Management**: Automatic token handling
- **Protected Routes**: Authentication required for dashboard
- **CSRF Protection**: Token-based CSRF protection
- **Input Validation**: Client-side form validation
- **XSS Protection**: Sanitized user input

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Backend Requirements

Make sure the Golang backend is running on `http://localhost:8080` before starting the frontend.

## Deployment

The frontend can be deployed to any platform that supports Next.js:

- **Vercel** (recommended)
- **Netlify**
- **AWS Amplify**
- **Docker**

For production deployment, update the `NEXT_PUBLIC_API_URL` environment variable to point to your production backend URL.