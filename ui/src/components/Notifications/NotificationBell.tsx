import React from "react";
import { Bell } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { selectNotifications, selectUnreadCount } from "@/store/store";
import { notificationActions } from "@/store/notification/notification.slice";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/Popover";
import { ScrollArea } from "@/common/ScrollArea";
import { Badge } from "@/common/Badge";
import { Button } from "@/common/Button";
import { Separator } from "@/common/Separator";
import { cn } from "@/lib/utils";

const operationColor: Record<string, string> = {
  CREATED: "text-green-600",
  UPDATED: "text-blue-600",
  DELETED: "text-red-600",
};

const NotificationBell: React.FC = () => {
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const dispatch = useDispatch();

  const handleOpenChange = (open: boolean) => {
    if (open) dispatch(notificationActions.markAllRead());
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => dispatch(notificationActions.clearNotifications())}
            >
              Clear all
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="h-72">
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ul>
              {notifications.map((n, i) => (
                <React.Fragment key={n.id}>
                  <li className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <p className={cn("text-sm font-medium", operationColor[n.operation] ?? "text-foreground")}>
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </p>
                  </li>
                  {i < notifications.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;

