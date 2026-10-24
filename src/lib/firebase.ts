import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Configure local persistence to survive page refreshes and tab reloads
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase persistence warning:', err);
  });
} catch (e) {
  // Persistence already set or unsupported environment
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline, check connection.');
      return false;
    }
    // Non-existent document is normal for test check, connection is working
    return true;
  }
}

// Global concurrency guard to prevent duplicate authentication calls
let isAuthInProgress = false;

export function getIsAuthInProgress(): boolean {
  return isAuthInProgress;
}

export interface ParsedAuthError {
  code: string;
  message: string;
  isCancelled: boolean;
  isConsoleConfigRequired?: boolean;
  solution?: string;
}

export function parseAuthError(error: unknown, method: 'google' | 'guest'): ParsedAuthError {
  const err = error as { code?: string; message?: string };
  const code = err?.code || 'auth/unknown';

  // 1. Recoverable User Cancellations (do NOT show fatal error)
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      code,
      message: 'Sign-in popup was closed.',
      isCancelled: true
    };
  }

  // 2. Disabled Provider in Firebase Console (e.g. auth/admin-restricted-operation)
  if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
    if (method === 'guest') {
      return {
        code,
        message: 'Anonymous (Guest) Sign-In is currently disabled in your Firebase project.',
        isCancelled: false,
        isConsoleConfigRequired: true,
        solution: 'To enable Guest mode: Open Firebase Console -> Build -> Authentication -> Sign-in method, click "Anonymous", toggle "Enable", and click Save. In the meantime, please use "Continue with Google".'
      };
    }
    return {
      code,
      message: 'Google Sign-In provider is not enabled in your Firebase project.',
      isCancelled: false,
      isConsoleConfigRequired: true,
      solution: 'Open Firebase Console -> Build -> Authentication -> Sign-in method, click "Google", and enable it.'
    };
  }

  // 3. Unauthorized Domain
  if (code === 'auth/unauthorized-domain') {
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return {
      code,
      message: `The domain "${currentDomain}" is not authorized for Firebase Authentication.`,
      isCancelled: false,
      isConsoleConfigRequired: true,
      solution: `To authorize: Open Firebase Console -> Build -> Authentication -> Settings -> Authorized domains -> click "Add domain" and paste "${currentDomain}".`
    };
  }

  // 4. Popup Blocked by Browser
  if (code === 'auth/popup-blocked') {
    return {
      code,
      message: 'The sign-in popup was blocked by your browser or mobile popup blocker.',
      isCancelled: false,
      solution: 'Please allow popups for this site, or use the "Sign In with Redirect" option below.'
    };
  }

  // 5. Network Request Failed
  if (code === 'auth/network-request-failed') {
    return {
      code,
      message: 'Network connection failed. Please check your internet connection and try again.',
      isCancelled: false
    };
  }

  return {
    code,
    message: err?.message || 'Authentication error. Please try again.',
    isCancelled: false
  };
}

// Google Sign-In with Popup (Desktop & Default)
export async function loginWithGoogle(): Promise<User | null> {
  if (isAuthInProgress) {
    console.warn('Authentication already in progress, skipping duplicate request.');
    return null;
  }

  isAuthInProgress = true;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (error) {
    const parsed = parseAuthError(error, 'google');
    if (parsed.isCancelled) {
      return null;
    }
    throw error;
  } finally {
    isAuthInProgress = false;
  }
}

// Google Sign-In with Redirect (Mobile & Fallback)
export async function loginWithGoogleRedirect(): Promise<void> {
  if (isAuthInProgress) {
    console.warn('Authentication already in progress, skipping duplicate request.');
    return;
  }

  isAuthInProgress = true;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    isAuthInProgress = false;
    throw error;
  }
}

// Check Redirect Result on Application Boot
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
    }
  } catch (error) {
    const parsed = parseAuthError(error, 'google');
    if (!parsed.isCancelled) {
      console.warn('Redirect sign-in result error:', error);
    }
    throw error;
  }
  return null;
}

// Guest Sign-In with Anonymous Auth + Display Name Preservation
export async function loginAsGuest(displayName: string): Promise<User> {
  if (isAuthInProgress) {
    throw new Error('An authentication operation is already in progress.');
  }

  isAuthInProgress = true;
  const sanitizedName = displayName.trim() || `Player_${Math.floor(Math.random() * 9000 + 1000)}`;

  try {
    const cred = await signInAnonymously(auth);
    if (cred.user) {
      await updateProfile(cred.user, {
        displayName: sanitizedName
      });
      // Store chosen display name in localStorage for session restoration
      try {
        localStorage.setItem('ipl_guest_display_name', sanitizedName);
      } catch {
        // Local storage unavailable
      }
    }
    return cred.user;
  } catch (error) {
    console.error('Guest Sign-In error:', error);
    throw error;
  } finally {
    isAuthInProgress = false;
  }
}

export { onAuthStateChanged };
