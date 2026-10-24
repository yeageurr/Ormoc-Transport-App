import { get, post, saveAccessToken } from './http';

export async function login(username, password) {
  const result = await post('/auth/login', { username, password, portal: 'ticketing_officer' });
  saveAccessToken(result.access_token);
  return result;
}

export async function getCurrentAccount() {
  return get('/auth/me?portal=ticketing_officer');
}

export async function logout() {
  try {
    return await post('/auth/logout', {});
  } finally {
    saveAccessToken(null);
  }
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  return post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
}

export const requestPasswordResetCode = (email) => post('/auth/password-reset/request-code', { email });
export const resendPasswordResetCode = (email) => post('/auth/password-reset/resend-code', { email });
export const verifyPasswordResetCode = (email, code) => post('/auth/password-reset/verify-code', { email, code });
export const completePasswordReset = (resetToken, newPassword, confirmPassword) => post('/auth/password-reset/complete', {
  reset_token: resetToken,
  new_password: newPassword,
  confirm_password: confirmPassword,
});
