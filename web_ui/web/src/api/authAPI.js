import axiosClient from "./axiosClient";

export const login = async (username, password) => {
  const response = await axiosClient.post("/auth/login", { username, password, portal: "admin" });
  return response.data; 
};

export const getCurrentUser = async () => {
  const response = await axiosClient.get("/auth/me?portal=admin");
  return response.data; 
};

export const logout = async () => {
  const response = await axiosClient.post("/auth/logout");
  return response.data;
};

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const response = await axiosClient.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
};

export const requestAdminEmailChange = async (currentPassword, newEmail) => (
  await axiosClient.post("/auth/me/email/request", {
    current_password: currentPassword,
    new_email: newEmail,
  })
).data;

export const resendAdminEmailChangeCode = async () => (
  await axiosClient.post("/auth/me/email/resend")
).data;

export const verifyAdminEmailChange = async (code) => (
  await axiosClient.post("/auth/me/email/verify", { code })
).data;

export const requestPasswordReset = async (email) => (await axiosClient.post("/auth/forgot-password", { email })).data;
export const resetPassword = async (token, newPassword, confirmPassword) => (await axiosClient.post("/auth/reset-password", { token, new_password: newPassword, confirm_password: confirmPassword })).data;
