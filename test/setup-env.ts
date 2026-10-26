// Loaded before the app module is imported (ConfigModule validates env on import).
process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret';
