import { get, post, saveAccessToken } from './http';

export async function login(username, password) {
  const result = await post('/auth/login', { username, password });
  saveAccessToken(result.access_token);
  return result;
}

export async function getCurrentAccount() {
  return get('/auth/me');
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
