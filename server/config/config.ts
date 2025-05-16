import dotenv from 'dotenv';

dotenv.config();

interface Config {
    PORT: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    SESSION_SECRET: string;
    FRONTEND_URL: string;
    NODE_ENV: 'development' | 'production';
}

const config: Config = {
    PORT: process.env.PORT || '5000',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production') || 'development'
};

export default config;