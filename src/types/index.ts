
// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  isActive: boolean;
}

export enum UserRole {
  ADMIN = "admin",
  REQUESTER = "requester",
  PROCUREMENT_OFFICER = "procurement_officer",
  INVENTORY_MANAGER = "inventory_manager",
  FINANCE_OFFICER = "finance_officer",
  VENDOR = "vendor",
  EVALUATION_COMMITTEE = "evaluation_committee"
}

// Product & Catalog Types
export interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  unit: string;
  specifications: Record<string, string>;
  tags: string[];
  currentPrice?: number;
  vendorIds: string[];
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

// Procurement Request Types
export interface ProcurementRequest {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  status: RequestStatus;
  priority: RequestPriority;
  dateCreated: string;
  dateNeeded: string;
  items: RequestItem[];
  approvalChain: ApprovalStep[];
  attachments?: Attachment[];
  comments?: Comment[];
  totalEstimatedValue: number;
}

export interface RequestItem {
  id: string;
  productId: string;
  quantity: number;
  estimatedPrice: number;
}

export enum RequestStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  IN_REVIEW = "in_review",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  CANCELED = "canceled",
}

export enum RequestPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface ApprovalStep {
  id: string;
  userId: string;
  status: ApprovalStatus;
  dateApproved?: string;
  comments?: string;
}

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  message: string;
  timestamp: string;
  attachmentIds?: string[];
}

// Vendor Types
export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  registrationNo: string;
  taxId: string;
  status: VendorStatus;
  complianceDocuments: ComplianceDocument[];
  categories: string[];
  rating?: number;
}

export enum VendorStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  BLACKLISTED = "blacklisted",
}

export interface ComplianceDocument {
  id: string;
  name: string;
  url: string;
  expiryDate?: string;
  status: "valid" | "pending" | "expired";
}

// RFP Types
export interface RFP {
  id: string;
  title: string;
  description: string;
  requestId: string;
  status: RFPStatus;
  dateCreated: string;
  submissionDeadline: string;
  vendorIds: string[];
  evaluationCriteria: EvaluationCriteria[];
  attachments?: Attachment[];
  bids: Bid[];
}

export enum RFPStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  EVALUATION = "evaluation",
  AWARDED = "awarded",
  CANCELED = "canceled",
  EXPIRED = "expired",
}

export interface Bid {
  id: string;
  rfpId: string;
  vendorId: string;
  price: number;
  technicalScore?: number;
  commercialScore?: number;
  totalScore?: number;
  status: BidStatus;
  submissionDate: string;
  documents: Attachment[];
}

export enum BidStatus {
  SUBMITTED = "submitted",
  UNDER_EVALUATION = "under_evaluation",
  SHORTLISTED = "shortlisted",
  AWARDED = "awarded",
  REJECTED = "rejected",
}

export interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  type: "technical" | "commercial";
  scoringMethod: "linear" | "step" | "custom";
}

// PO Types
export interface PurchaseOrder {
  id: string;
  rfpId: string;
  vendorId: string;
  status: POStatus;
  dateCreated: string;
  deliveryDate: string;
  items: POItem[];
  totalValue: number;
  paymentTerms: string;
  attachments?: Attachment[];
  acknowledgement?: POAcknowledgement;
}

export enum POStatus {
  DRAFT = "draft",
  SENT = "sent",
  ACKNOWLEDGED = "acknowledged",
  IN_PROGRESS = "in_progress",
  DELIVERED = "delivered",
  COMPLETED = "completed",
  CANCELED = "canceled",
}

export interface POItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  description: string;
}

export interface POAcknowledgement {
  status: "accepted" | "rejected";
  date: string;
  comments?: string;
  expectedDeliveryDate?: string;
}

// Inventory Types
export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  minimumLevel: number;
  reorderLevel: number;
  lastUpdated: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  manager: string;
}

export interface InventoryTransaction {
  id: string;
  type: "stock_in" | "stock_out" | "transfer" | "adjustment";
  productId: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  quantity: number;
  reference: string;
  date: string;
  userId: string;
  comments?: string;
}

export interface GoodsReceiptNote {
  id: string;
  poId: string;
  receivedBy: string;
  receivedDate: string;
  items: GRNItem[];
  status: "pending" | "completed" | "disputed";
  comments?: string;
}

export interface GRNItem {
  id: string;
  poItemId: string;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  reasonForRejection?: string;
}

// Invoice & Payment Types
export interface Invoice {
  id: string;
  vendorId: string;
  poId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  attachments?: Attachment[];
  paymentId?: string;
}

export enum InvoiceStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
  CANCELED = "canceled",
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string;
  status: "processing" | "completed" | "failed";
  authorizedBy?: string;
}

export enum PaymentMethod {
  BANK_TRANSFER = "bank_transfer",
  CHECK = "check",
  CREDIT_CARD = "credit_card",
  CASH = "cash",
  ONLINE = "online",
}

// Notification & Audit Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  relatedEntityId?: string;
  relatedEntityType?: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityId?: string;
  entityType?: string;
  timestamp: string;
  ipAddress?: string;
  details?: string;
}
