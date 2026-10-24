import { get } from './http';

export const listDispatchers = () => get('/accounts/dispatchers');
export const listAuditLogs = (targetTable) => get(`/audit-logs?target_table=${encodeURIComponent(targetTable)}`);
