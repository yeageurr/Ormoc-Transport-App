import { del, get, patch, post } from './http';

export const listVehicles = () => get('/vehicles');
export const createVehicle = (payload) => post('/vehicles', payload);
export const updateVehicle = (vehicleId, payload) => patch(`/vehicles/${vehicleId}`, payload);
export const deleteVehicle = (vehicleId) => del(`/vehicles/${vehicleId}`);
