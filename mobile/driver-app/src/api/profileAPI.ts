import { authClient } from './authAPI';

export interface DriverProfile {
  user_id: number;
  driver_id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
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
  payload: Pick<DriverProfile, 'first_name' | 'last_name' | 'email'>,
): Promise<DriverProfile> {
  const { data } = await authClient.patch<DriverProfile>('/users/me', payload);
  return data;
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
