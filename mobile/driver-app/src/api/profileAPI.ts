import { authClient } from './authAPI';

export interface DriverProfile {
  user_id: number;
  driver_id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
  vehicle_plate_number?: string | null;
  email: string | null;
  license_num: string;
  license_expiry: string;
  account: {
    account_id: number;
    account_code: string;
    username: string;
  };
}

export async function getMyProfile(): Promise<DriverProfile> {
  const { data } = await authClient.get<DriverProfile>('/users/me');
  return data;
}

export async function updateMyProfile(
  payload: Pick<DriverProfile, 'first_name' | 'last_name' | 'email'> & {
    contact_number?: string;
    current_password?: string;
  },
): Promise<DriverProfile & { email_verification_pending?: boolean; pending_email?: string | null }> {
  const { data } = await authClient.patch<DriverProfile & { email_verification_pending?: boolean; pending_email?: string | null }>('/users/me', payload);
  return data;
}

export async function verifyMyEmailOtp(code: string): Promise<DriverProfile> {
  const { data } = await authClient.post<DriverProfile>('/users/me/verify-email', { code });
  return data;
}

export async function resendMyEmailOtp(): Promise<void> {
  await authClient.post('/users/me/verify-email/resend');
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  await authClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
}
