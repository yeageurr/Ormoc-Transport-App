import { get, post } from './http';

export const listDispatcherAssignments = (operatingDate) => get(`/dispatcher-assignments?operating_date=${operatingDate}`);
export const createDispatcherAssignment = (payload) => post('/dispatcher-assignments', payload);
export const closeDispatcherAssignment = (assignmentId) => post(`/dispatcher-assignments/${assignmentId}/close`, {});
