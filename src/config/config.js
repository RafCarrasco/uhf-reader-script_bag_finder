import 'dotenv/config';

export const cfg = {
  apiPort: Number(process.env.PORT_API || process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '17017577',
    database: process.env.DB_NAME || 'bagfinder2'
  }
};
