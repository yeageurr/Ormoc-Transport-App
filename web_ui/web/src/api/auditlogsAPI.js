import axiosClient from "./axiosClient";

export const getAuditLogs = async ({ targetTable, actorId } = {}) => {
  const params = {};
  if (targetTable) params.target_table = targetTable;
  if (actorId) params.actor_id = actorId;

  const response = await axiosClient.get("/audit-logs", { params });
  return response.data;
};