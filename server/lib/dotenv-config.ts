import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file at the root of the project
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default dotenv;
