import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useDispatch, useSelector } from "react-redux";
import { notificationActions } from "@/store/notification/notification.slice";
import { RootState } from "@/store/store";
import { NotificationMessage } from "@/types/notification";

// Native WebSocket URL — resolves to ws://host/ws in the browser
const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
const TOPIC = "/topic/notifications";

export function useWebSocket() {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.currentUser.token);
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
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(TOPIC, (frame) => {
          try {
            const msg: NotificationMessage = JSON.parse(frame.body);
            dispatch(notificationActions.addNotification(msg));
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
  }, [token, dispatch]);
}
