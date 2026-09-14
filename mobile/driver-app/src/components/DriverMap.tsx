// Metro chooses DriverMap.native.tsx on Android/iOS and DriverMap.web.tsx on web.
// This file gives TypeScript a platform-neutral module to resolve.
export { default } from './DriverMap.web';
