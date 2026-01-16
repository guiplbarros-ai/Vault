import { relations } from 'drizzle-orm'
import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user'])
export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'pending',
  'approved',
  'production',
  'completed',
  'cancelled',
])
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed'])
export const productUnitEnum = pgEnum('product_unit', ['m2', 'm', 'un', 'par', 'kit'])
export const categoryTypeEnum = pgEnum('category_type', [
  'hospitalar',
  'residencial',
  'palco',
  'fornecedor',
  'servico',
])

// Company
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  cnpj: varchar('cnpj', { length: 18 }),
  ie: varchar('ie', { length: 20 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  phone2: varchar('phone2', { length: 20 }),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Synced with Supabase Auth
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  phone2: varchar('phone2', { length: 20 }),
  email: varchar('email', { length: 255 }),
  cnpj: varchar('cnpj', { length: 18 }),
  ie: varchar('ie', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zip_code', { length: 10 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Categories
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: categoryTypeEnum('type').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Products
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  unit: productUnitEnum('unit').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  supplier: varchar('supplier', { length: 100 }),
  sku: varchar('sku', { length: 50 }),
  active: boolean('active').default(true).notNull(),
  metadata: jsonb('metadata'), // For extra fields like franzido factor, colors, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Quotes
export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull(),
  customerId: uuid('customer_id')
    .references(() => customers.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  quoteNumber: varchar('quote_number', { length: 20 }).notNull(),
  status: quoteStatusEnum('status').default('draft').notNull(),
  installationAddress: text('installation_address'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  discountType: discountTypeEnum('discount_type'),
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  validUntil: timestamp('valid_until'),
  deliveryDays: integer('delivery_days').default(15),
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  pdfUrl: text('pdf_url'),
  sentAt: timestamp('sent_at'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Quote Rooms (Ambientes)
export const quoteRooms = pgTable('quote_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Quote Items
export const quoteItems = pgTable('quote_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id')
    .references(() => quotes.id, { onDelete: 'cascade' })
    .notNull(),
  roomId: uuid('room_id').references(() => quoteRooms.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unit: productUnitEnum('unit').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  // Specific fields for curtain calculations
  width: decimal('width', { precision: 6, scale: 2 }),
  height: decimal('height', { precision: 6, scale: 2 }),
  ceilingHeight: decimal('ceiling_height', { precision: 6, scale: 2 }),
  includesRail: boolean('includes_rail').default(false),
  includesInstallation: boolean('includes_installation').default(false),
  curves: integer('curves').default(0),
  calculationDetails: jsonb('calculation_details'), // Store detailed calculation breakdown
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Settings (for company-specific calculation constants)
export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull()
    .unique(),
  // Hospital constants
  hospitalFranzidoFactor: decimal('hospital_franzido_factor', { precision: 4, scale: 2 }).default(
    '1.65'
  ),
  hospitalVinylHeight: decimal('hospital_vinyl_height', { precision: 4, scale: 2 }).default('2.00'),
  hospitalMeshSmallHeight: decimal('hospital_mesh_small_height', { precision: 4, scale: 2 }).default(
    '0.60'
  ),
  hospitalMeshLargeHeight: decimal('hospital_mesh_large_height', { precision: 4, scale: 2 }).default(
    '0.90'
  ),
  hospitalCeilingMeshThreshold: decimal('hospital_ceiling_mesh_threshold', {
    precision: 4,
    scale: 2,
  }).default('2.60'),
  hospitalCeilingLoweringThreshold: decimal('hospital_ceiling_lowering_threshold', {
    precision: 4,
    scale: 2,
  }).default('3.10'),
  hospitalHookSpacing: decimal('hospital_hook_spacing', { precision: 4, scale: 2 }).default('0.15'),
  hospitalCurvePrice: decimal('hospital_curve_price', { precision: 10, scale: 2 }).default('30.00'),
  // General settings
  defaultDiscountCash: decimal('default_discount_cash', { precision: 4, scale: 2 }).default('3.00'),
  defaultValidityDays: integer('default_validity_days').default(15),
  defaultDeliveryDays: integer('default_delivery_days').default(15),
  returnFee: decimal('return_fee', { precision: 10, scale: 2 }).default('100.00'),
  // Supplier markups
  markupKazza: decimal('markup_kazza', { precision: 4, scale: 2 }).default('30.00'),
  markupLiber: decimal('markup_liber', { precision: 4, scale: 2 }).default('30.00'),
  // Extra settings stored as JSON
  extraSettings: jsonb('extra_settings'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Material Prices (for dynamic pricing management)
export const materialPriceCategory = pgEnum('material_price_category', [
  'hospitalar_material',
  'hospitalar_trilho',
  'hospitalar_servico',
  'residencial_material',
  'residencial_servico',
  'frete',
])

export const materialPrices = pgTable('material_prices', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .references(() => companies.id)
    .notNull(),
  key: varchar('key', { length: 100 }).notNull(), // e.g., 'hosp_vinil_m2'
  name: varchar('name', { length: 255 }).notNull(), // e.g., 'Vinil VNS 45'
  category: materialPriceCategory('category').notNull(),
  unit: productUnitEnum('unit').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  description: text('description'),
  supplier: varchar('supplier', { length: 100 }),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  categories: many(categories),
  products: many(products),
  quotes: many(quotes),
  materialPrices: many(materialPrices),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  quotes: many(quotes),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  company: one(companies, {
    fields: [categories.companyId],
    references: [companies.id],
  }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}))

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [quotes.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [quotes.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [quotes.userId],
    references: [users.id],
  }),
  rooms: many(quoteRooms),
  items: many(quoteItems),
}))

export const quoteRoomsRelations = relations(quoteRooms, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [quoteRooms.quoteId],
    references: [quotes.id],
  }),
  items: many(quoteItems),
}))

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
  room: one(quoteRooms, {
    fields: [quoteItems.roomId],
    references: [quoteRooms.id],
  }),
  product: one(products, {
    fields: [quoteItems.productId],
    references: [products.id],
  }),
}))

export const materialPricesRelations = relations(materialPrices, ({ one }) => ({
  company: one(companies, {
    fields: [materialPrices.companyId],
    references: [companies.id],
  }),
}))

// Types
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type Quote = typeof quotes.$inferSelect
export type NewQuote = typeof quotes.$inferInsert

export type QuoteRoom = typeof quoteRooms.$inferSelect
export type NewQuoteRoom = typeof quoteRooms.$inferInsert

export type QuoteItem = typeof quoteItems.$inferSelect
export type NewQuoteItem = typeof quoteItems.$inferInsert

export type Settings = typeof settings.$inferSelect
export type NewSettings = typeof settings.$inferInsert

export type MaterialPrice = typeof materialPrices.$inferSelect
export type NewMaterialPrice = typeof materialPrices.$inferInsert
