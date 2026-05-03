import { pgTable, serial, text, timestamp, integer, numeric, pgEnum, boolean, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";
import { storesTable } from "./stores";

// ─── Employees ───────────────────────────────────────────────────────────────
export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive", "on_leave"]);

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  position: text("position").notNull(),
  salary: numeric("salary", { precision: 10, scale: 2 }).notNull(),
  status: employeeStatusEnum("status").notNull().default("active"),
  hireDate: date("hire_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "half_day"]);

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  date: date("date").notNull(),
  status: attendanceStatusEnum("status").notNull().default("present"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaveTypeEnum = pgEnum("leave_type", ["annual", "sick", "unpaid", "other"]);
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);

export const leavesTable = pgTable("leaves", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  employeeId: integer("employee_id").references(() => employeesTable.id).notNull(),
  type: leaveTypeEnum("type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "received", "cancelled"]);

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id).notNull(),
  status: purchaseStatusEnum("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  receivedAt: timestamp("received_at"),
});

export const purchaseItemsTable = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrdersTable.id).notNull(),
  productId: integer("product_id").references(() => productsTable.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
});

// ─── Inventory Movements ──────────────────────────────────────────────────────
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["in", "out", "adjustment"]);

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  productId: integer("product_id").references(() => productsTable.id).notNull(),
  type: inventoryMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  reference: text("reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Accounting ───────────────────────────────────────────────────────────────
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const transactionCategoryEnum = pgEnum("transaction_category", [
  "sales", "purchase", "salary", "rent", "utilities", "marketing", "other"
]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  category: transactionCategoryEnum("category").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: date("date").notNull(),
  reference: text("reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── CRM ──────────────────────────────────────────────────────────────────────
export const customerNotesTable = pgTable("customer_notes", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => storesTable.id).notNull(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Inter-store Stock Transfers ──────────────────────────────────────────────
export const stockTransferStatusEnum = pgEnum("stock_transfer_status", [
  "requested", "approved", "rejected", "prepared", "in_transit", "received", "cancelled",
]);

export const stockTransfersTable = pgTable("stock_transfers", {
  id: serial("id").primaryKey(),
  sourceStoreId: integer("source_store_id").references(() => storesTable.id).notNull(),
  destinationStoreId: integer("destination_store_id").references(() => storesTable.id).notNull(),
  initiatorUserId: integer("initiator_user_id").references(() => usersTable.id).notNull(),
  initiatorSide: text("initiator_side").notNull(), // 'source' (direct send) or 'destination' (request)
  status: stockTransferStatusEnum("status").notNull().default("requested"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  preparedAt: timestamp("prepared_at"),
  shippedAt: timestamp("shipped_at"),
  receivedAt: timestamp("received_at"),
  cancelledAt: timestamp("cancelled_at"),
});

export const stockTransferItemsTable = pgTable("stock_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").references(() => stockTransfersTable.id, { onDelete: "cascade" }).notNull(),
  sourceProductId: integer("source_product_id").references(() => productsTable.id).notNull(),
  destinationProductId: integer("destination_product_id").references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  matchKey: text("match_key").notNull(), // reference or barcode used to match across stores
});

export const stockTransferEventsTable = pgTable("stock_transfer_events", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").references(() => stockTransfersTable.id, { onDelete: "cascade" }).notNull(),
  status: stockTransferStatusEnum("status").notNull(),
  actorUserId: integer("actor_user_id").references(() => usersTable.id).notNull(),
  actorStoreId: integer("actor_store_id").references(() => storesTable.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Employee = typeof employeesTable.$inferSelect;
export type Supplier = typeof suppliersTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
export type StockTransfer = typeof stockTransfersTable.$inferSelect;
export type StockTransferItem = typeof stockTransferItemsTable.$inferSelect;
export type StockTransferEvent = typeof stockTransferEventsTable.$inferSelect;
