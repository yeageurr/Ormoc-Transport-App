import { get } from './http';

export const listPortalUsers = () => get('/accounts/portal-users');
