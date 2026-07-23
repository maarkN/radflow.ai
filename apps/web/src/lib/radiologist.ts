import { getAuth } from './auth';

/** The signed-in user's id — used as the acting radiologist across the app. */
export function getRadiologistId(): string {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Not authenticated');
  }
  return auth.user.id;
}
