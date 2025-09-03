// Global type declarations

// For WebSocket support
declare module 'ws' {
  import * as WebSocket from 'ws';
  export = WebSocket;
}

// For environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    // Add other environment variables here
  }
}
