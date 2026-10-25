import { get } from './http';

export const listDispatchers = () => get('/accounts/dispatchers');
export const listAuditLogs = (targetTable, excludeTargetTable) => {
  const params = new URLSearchParams();
  if (targetTable) params.set('target_table', targetTable);
  if (excludeTargetTable) params.set('exclude_target_table', excludeTargetTable);
  const query = params.toString();
  return get(`/audit-logs${query ? `?${query}` : ''}`);
};
export const listDispatchHistory = (operatingDate) => get(`/dispatch-tickets/records${operatingDate ? `?operating_date=${encodeURIComponent(operatingDate)}` : ''}`);
export const listDispatchRecordDates = () => get('/dispatch-tickets/records/dates');
