// Note: dotenv is loaded by Next.js automatically from .env files
// In production Docker containers, environment variables are passed directly
import { defineConfig, env } from 'prisma/config';

const isVector = process.env.SCHEMA === 'vector';

export default defineConfig({
  schema: isVector ? 'prisma/vector/schema.prisma' : 'prisma/schema.prisma',
  migrations: {
    path: isVector ? 'prisma/vector/migrations' : 'prisma/migrations',
  },
  datasource: {
    url: isVector ? env('VECTOR_DATABASE_URL') : env('DATABASE_URL'),
  },
});
