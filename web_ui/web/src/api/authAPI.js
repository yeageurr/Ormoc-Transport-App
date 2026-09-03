import axiosClient from "./axiosClient";

export const login = async (username, password) => {
  const response = await axiosClient.post("/auth/login", { username, password });
  return response.data; // { access_token, token_type, must_change_password }
};

export const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const response = await axiosClient.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  });
  return response.data;
};