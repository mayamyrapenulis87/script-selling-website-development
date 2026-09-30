import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const manuscripts = pgTable("manuscripts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  format: text("format").notNull(),
  genre: text("genre").notNull(),
  synopsis: text("synopsis").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  author: text("author").notNull(),
  price: integer("price").notNull(),
  pages: integer("pages").notNull(),
  episodes: integer("episodes").notNull().default(1),
  duration: integer("duration").notNull().default(90),
  progress: text("progress").notNull().default("Lengkap"),
  holdHours: integer("hold_hours").notNull().default(48),
  status: text("status").notNull().default("available"),
  image: text("image").notNull().default("/images/senja.jpg"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  fileName: text("file_name"),
  fileMime: text("file_mime"),
  fileData: text("file_data"),
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  manuscriptId: text("manuscript_id").notNull().references(() => manuscripts.id),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  amount: integer("amount").notNull(),
  accessToken: text("access_token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const writerSettings = pgTable("writer_settings", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().default(""),
  bio: text("bio").notNull().default(""),
  blogUrl: text("blog_url").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const writerSessions = pgTable("writer_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const siteState = pgTable("site_state", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
