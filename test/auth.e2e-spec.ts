import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth & validation (e2e, no database)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prismaMock = {
      onModuleInit: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['GET', '/api/expenses'],
    ['GET', '/api/income'],
    ['GET', '/api/categories'],
    ['GET', '/api/dashboard/summary'],
    ['GET', '/api/users/me'],
    ['POST', '/api/auth/logout'],
  ] as const)('%s %s without a token returns 401', async (method, url) => {
    const agent = request(app.getHttpServer());
    await (method === 'GET' ? agent.get(url) : agent.post(url)).expect(401);
  });

  it('rejects a garbage bearer token', async () => {
    await request(app.getHttpServer())
      .get('/api/expenses')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('signup validates the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(JSON.stringify(res.body.message)).toMatch(/email/);
    expect(JSON.stringify(res.body.message)).toMatch(/password/);
  });

  it('signup rejects unknown properties', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: 'a@b.com', password: 'password123', admin: true })
      .expect(400);
  });

  it('login validates the body', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(400);
  });
});
