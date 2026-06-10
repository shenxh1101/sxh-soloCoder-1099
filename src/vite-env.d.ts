/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    getAppVersion: () => Promise<string>
  }
}
