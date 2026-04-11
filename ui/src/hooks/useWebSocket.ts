import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useAuthContext } from "@/context/auth-context";
import { useNotificationContext } from "@/context/notification-context";
import { NotificationMessage, Notification } from "@/types/notification";

// Native WebSocket URL — resolves to ws://host/ws in the browser
const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
const TOPIC = "/topic/notifications";

// Transform backend message into frontend notification
function transformToNotification(msg: NotificationMessage): Notification {
  const entityLabel = msg.entityType.charAt(0) + msg.entityType.slice(1).toLowerCase();
  const operationLabel = msg.operation.toLowerCase();
  
  // Generate message based on available data
  let message: string;
  if (msg.entityName) {
    // Best case: we have the entity name
    message = `${entityLabel} "${msg.entityName}" ${operationLabel}`;
  } else if (msg.entityId) {
    // Fallback: we have the ID but no name
    message = `${entityLabel} #${msg.entityId} ${operationLabel}`;
  } else {
    // Worst case: no name or ID
    message = `${entityLabel} ${operationLabel}`;
  }
  
  return {
    id: `${msg.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    message,
    entityType: msg.entityType,
    operation: msg.operation,
    timestamp: msg.timestamp,
    read: false,
  };
}

export function useWebSocket() {
  const { isAuthenticated, token } = useAuthContext();
  const { addNotification } = useNotificationContext();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Only connect when authenticated
    if (!isAuthenticated) {
      clientRef.current?.deactivate();
      clientRef.current = null;
      return;
    }

    const connectHeaders = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("WebSocket connected");
        client.subscribe(TOPIC, (frame) => {
          try {
            const msg: NotificationMessage = JSON.parse(frame.body);
            console.log("Received notification:", msg);
            const notification = transformToNotification(msg);
            addNotification(notification);
          } catch (e) {
            console.error("Failed to parse WebSocket notification", e);
          }
        });
      },
      onStompError: (frame) => {
        console.error("STOMP error", frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [isAuthenticated, token, addNotification]);
}
