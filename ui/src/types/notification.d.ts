export type EntityType = "COURSE" | "AUTHOR" | "USER" | "TAG";
export type OperationType = "CREATED" | "UPDATED" | "DELETED";

// Message received from backend WebSocket
export interface NotificationMessage {
  entityType: EntityType;
  operation: OperationType;
  entityId: string | null;
  entityName: string | null;
  initiatedBy: string | null;
  timestamp: number;
}

// Notification stored in frontend state
export interface Notification {
  id: string;
  message: string;
  entityType: EntityType;
  operation: OperationType;
  timestamp: number;
  read: boolean;
}

