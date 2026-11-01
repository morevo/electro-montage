import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Prisma работает без встроенного Rust-движка: запросы идут через JS-драйвер
 * mariadb. На shared-хостинге встроенный query engine падал с
 * «PANIC: timer has gone away» и ронял весь процесс API, поэтому слой движка
 * убран полностью.
 */
function createAdapter(): PrismaMariaDb {
  const raw = process.env.DATABASE_URL ?? '';
  const url = new URL(raw);

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 5,
    // По умолчанию 10с — на общем MySQL-сервере хостинга (не наш, шарится с
    // другими клиентами) этого иногда не хватает под кратковременную
    // конкуренцию за ресурсы, и запрос падает с "pool timeout" ещё до того,
    // как соединение реально стало бы доступно.
    acquireTimeout: 20000,
    // База живёт на том же хосте — TLS не нужен.
    ssl: false,
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
