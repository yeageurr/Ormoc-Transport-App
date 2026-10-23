import { get, post } from './http';

export const createDispatcherAssignment = (payload) => post('/dispatcher-assignments', payload);
export const closeDispatcherAssignment = (assignmentId) => post(`/dispatcher-assignments/${assignmentId}/close`, {});

// Assignment list/open-operation and dispatcher-option endpoints are not currently exposed by the backend.
