import axiosClient from "./axiosClient";

export const login = async (username, password) => {
  const response = await axiosClient.post("/auth/login", { username, password });
  return response.data; 
};

export const getCurrentUser = async () => {
  const response = await axiosClient.get("/auth/me");
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

export const requestPasswordReset = async (email) => (await axiosClient.post("/auth/forgot-password", { email })).data;
export const resetPassword = async (token, newPassword, confirmPassword) => (await axiosClient.post("/auth/reset-password", { token, new_password: newPassword, confirm_password: confirmPassword })).data;
