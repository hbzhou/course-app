export type EntityType = "COURSE" | "AUTHOR" | "USER";
export type OperationType = "CREATED" | "UPDATED" | "DELETED";

export interface NotificationMessage {
  entityType: EntityType;
  operation: OperationType;
  entityId: string | null;
  entityName: string | null;
  initiatedBy: string | null;
  timestamp: number;
}

export interface Notification {
  id: string;
  message: string;
  entityType: EntityType;
  operation: OperationType;
  entityId: string | null;
  timestamp: number;
  read: boolean;
}

