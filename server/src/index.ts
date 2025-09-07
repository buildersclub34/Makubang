import 'module-alias/register';
import 'dotenv/config';
import http from 'http';
import app from './server';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/error.middleware';
import logger from './utils/logger';

// Get port from environment and store in Express.
const port = normalizePort(process.env.PORT || '3001');
app.set('port', port);

// Create HTTP server.
const server = http.createServer(app);

// Connect to database
connectDB()
  .then(() => {
    // Start server after successful database connection
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
  })
  .catch((error) => {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  });

// Normalize a port into a number, string, or false.
function normalizePort(val: string) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// Event listener for HTTP server "error" event.
function onError(error: NodeJS.ErrnoException) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// Event listener for HTTP server "listening" event.
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr?.port;
  logger.info(`Server listening on ${bind} in ${process.env.NODE_ENV || 'development'} mode`);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });});
