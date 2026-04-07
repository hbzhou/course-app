import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useAuthContext } from "@/context/AuthContext";
import { useNotificationContext } from "@/context/NotificationContext";
import { NotificationMessage, Notification } from "@/types/notification";

// Native WebSocket URL — resolves to ws://host/ws in the browser
const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
const TOPIC = "/topic/notifications";

// Transform backend message into frontend notification
function transformToNotification(msg: NotificationMessage): Notification {
  const entityLabel = msg.entityType.charAt(0) + msg.entityType.slice(1).toLowerCase();
  const operationLabel = msg.operation.charAt(0) + msg.operation.slice(1).toLowerCase();
  const name = msg.entityName || `${entityLabel} #${msg.entityId}`;
  
  return {
    id: `${msg.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    message: `${entityLabel} "${name}" ${operationLabel}`,
    entityType: msg.entityType,
    operation: msg.operation,
    timestamp: msg.timestamp,
    read: false,
  };
}

export function useWebSocket() {
  const { token } = useAuthContext();
  const { addNotification } = useNotificationContext();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Only connect when authenticated
    if (!token) {
      clientRef.current?.deactivate();
      clientRef.current = null;
      return;
    }

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
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
  }, [token, addNotification]);
}
