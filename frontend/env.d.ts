/// <reference types="vite/client" />

// Declare all VITE_ environment variables your frontend will use
interface ImportMetaEnv {
  readonly VITE_API_URL: string         // Backend API URL
  readonly VITE_STRIPE_KEY?: string     // Optional Stripe public key
  readonly VITE_ANOTHER_KEY?: string    // Add any other VITE_ env variables here
}

// Tell TypeScript that import.meta has an env object
interface ImportMeta {
  readonly env: ImportMetaEnv
}