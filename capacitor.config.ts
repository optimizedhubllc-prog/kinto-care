import type { CapacitorConfig } from '@capacitor/cli'; 
 
const config: CapacitorConfig = { 
  appId: 'com.kintocare.app', 
  appName: 'Kinto Care', 
  webDir: 'out', 
  server: { 
    url: 'https://kinto-care.vercel.app', 
    cleartext: false, 
  }, 
  ios: { 
    allowsLinkPreview: false, 
    contentInset: 'automatic', 
  }, 
}; 
 
export default config; 
