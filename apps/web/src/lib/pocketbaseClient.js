import PocketBase from 'pocketbase';

// Initialize PocketBase with your backend URL
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

// Optional: Configure auth settings
pb.autoCancelOutstandingRequests = true;

export default pb;
