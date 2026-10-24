import { del, get, patch, post } from './http';

export const listDrivers = () => get('/accounts/drivers');
export const createDriver = (payload) => post('/accounts/drivers', payload);
export const createDispatcher = (payload) => post('/accounts/dispatchers', payload);
export const updateDriver = (driverId, payload) => patch(`/accounts/drivers/${driverId}`, payload);
export const suspendDriver = (driverId) => patch(`/accounts/drivers/${driverId}/suspend`, {});
export const reactivateDriver = (driverId) => patch(`/accounts/drivers/${driverId}/reactivate`, {});
export const disableDriver = (driverId) => del(`/accounts/drivers/${driverId}`);
