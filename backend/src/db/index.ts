import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { DB } from '../types/index.js';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});

export async function runMigrations(): Promise<void> {
  await db.schema
    .createTable('links')
    .ifNotExists()
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('code', 'varchar(20)', col => col.notNull().unique())
    .addColumn('original_url', 'text', col => col.notNull())
    .addColumn('alias', 'varchar(50)')
    .addColumn('expires_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('is_active', 'boolean', col => col.notNull().defaultTo(true))
    .addColumn('click_count', 'integer', col => col.notNull().defaultTo(0))
    .execute();

  await db.schema
    .createTable('clicks')
    .ifNotExists()
    .addColumn('id', 'serial', col => col.primaryKey())
    .addColumn('link_id', 'integer', col => col.notNull().references('links.id').onDelete('cascade'))
    .addColumn('clicked_at', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('ip_hash', 'varchar(64)')
    .addColumn('country', 'varchar(100)')
    .addColumn('city', 'varchar(100)')
    .addColumn('os', 'varchar(50)')
    .addColumn('device', 'varchar(50)')
    .addColumn('browser', 'varchar(50)')
    .addColumn('referrer', 'text')
    .execute();

  // idempotent — adds os to pre-existing tables without the column
  await sql`ALTER TABLE clicks ADD COLUMN IF NOT EXISTS os VARCHAR(50)`.execute(db);
}
