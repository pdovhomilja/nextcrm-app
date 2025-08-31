# Phase 5A: Real-time Features Implementation

## Phase Overview

**Objective**: Implement WebSocket connections, real-time dashboard updates, live notifications, and user presence indicators.

**Duration**: 5-7 days

**Prerequisites**: Phase 4A-4B completed (optimization and caching)

**Success Criteria**:

- WebSocket server implemented with company isolation
- Real-time dashboard metric updates
- Live task status changes reflected instantly
- User presence and activity indicators

## Key Implementation Areas

### 1. WebSocket Server Setup

```typescript
// lib/realtime/websocket-server.ts
import { Server as SocketIOServer } from "socket.io";
import { auth } from "@/auth";

export class DashboardWebSocketServer {
  private io: SocketIOServer;

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: { origin: process.env.NEXTAUTH_URL },
      path: "/api/socket",
    });

    this.setupAuthentication();
    this.setupRoomManagement();
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const session = await auth();
        if (!session?.user?.cid) {
          return next(new Error("Authentication required"));
        }

        socket.data.userId = session.user.id;
        socket.data.companyId = session.user.cid;
        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });
  }

  private setupRoomManagement() {
    this.io.on("connection", (socket) => {
      const { companyId, userId } = socket.data;

      // Join company-specific rooms
      socket.join(`company:${companyId}`);
      socket.join(`user:${userId}`);

      // Handle dashboard subscription
      socket.on("subscribe-dashboard", () => {
        socket.join(`dashboard:${companyId}`);
        this.broadcastUserPresence(companyId, userId, true);
      });

      socket.on("disconnect", () => {
        this.broadcastUserPresence(companyId, userId, false);
      });
    });
  }

  // Broadcast methods
  broadcastTaskUpdate(companyId: string, taskData: any) {
    this.io.to(`company:${companyId}`).emit("task:updated", taskData);
    this.io.to(`dashboard:${companyId}`).emit("dashboard:refresh", {
      type: "task_update",
      data: taskData,
    });
  }

  broadcastMetricsUpdate(companyId: string, metrics: any) {
    this.io.to(`dashboard:${companyId}`).emit("metrics:updated", metrics);
  }
}
```

### 2. Real-time Dashboard Components

```typescript
// components/dashboard/realtime-dashboard.tsx
"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

export function RealtimeDashboard() {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<any>(null)

  useEffect(() => {
    if (!session?.user?.cid) return

    const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL!, {
      path: '/api/socket',
      withCredentials: true,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
      socketInstance.emit('subscribe-dashboard')
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('metrics:updated', (metrics) => {
      setLiveMetrics(metrics)
    })

    socketInstance.on('dashboard:refresh', (update) => {
      // Trigger specific component refreshes
      handleDashboardUpdate(update)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [session])

  const handleDashboardUpdate = (update: any) => {
    switch (update.type) {
      case 'task_update':
        // Refresh task metrics and table
        refreshTaskComponents()
        break
      case 'board_update':
        // Refresh board metrics
        refreshBoardComponents()
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection indicator */}
      <div className="flex items-center justify-between">
        <h1>Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Dashboard components with real-time updates */}
      <RealtimeTaskMetrics socket={socket} />
      <RealtimeTaskTable socket={socket} />
    </div>
  )
}
```

### 3. Live Task Updates

```typescript
// Enhanced task table with real-time updates
export function RealtimeTaskTable({ socket }: { socket: Socket | null }) {
  const [tasks, setTasks] = useState<TaskTableRow[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    socket.on("task:updated", (taskData) => {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskData.id
            ? { ...task, ...taskData, isUpdated: true }
            : task,
        ),
      );

      // Show visual indicator for updated row
      setPendingUpdates((prev) => new Set(prev.add(taskData.id)));

      // Clear indicator after animation
      setTimeout(() => {
        setPendingUpdates((prev) => {
          const newSet = new Set(prev);
          newSet.delete(taskData.id);
          return newSet;
        });
      }, 2000);
    });

    return () => {
      socket.off("task:updated");
    };
  }, [socket]);

  // Rest of component with animated updates
}
```

### 4. User Presence System

```typescript
// components/dashboard/user-presence.tsx
export function UserPresence() {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([])

  useEffect(() => {
    if (!socket) return

    socket.on('presence:users', (users) => {
      setActiveUsers(users)
    })

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      socket.emit('presence:heartbeat')
    }, 30000)

    return () => {
      clearInterval(heartbeat)
      socket.off('presence:users')
    }
  }, [socket])

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Active:</span>
      <div className="flex -space-x-2">
        {activeUsers.slice(0, 5).map(user => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-xs">
              {user.name?.[0] || user.email[0]}
            </AvatarFallback>
          </Avatar>
        ))}
        {activeUsers.length > 5 && (
          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
            <span className="text-xs">+{activeUsers.length - 5}</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 5. Real-time Notifications

```typescript
// lib/realtime/notifications.ts
export class RealtimeNotifications {
  constructor(private socket: Socket) {}

  sendTaskAssignment(userId: string, taskData: any) {
    this.socket.to(`user:${userId}`).emit("notification", {
      type: "task_assigned",
      title: "New Task Assigned",
      message: `You've been assigned: ${taskData.title}`,
      data: taskData,
      timestamp: new Date(),
    });
  }

  sendTaskDueReminder(companyId: string, tasks: any[]) {
    this.socket.to(`company:${companyId}`).emit("notification", {
      type: "tasks_due_soon",
      title: "Tasks Due Soon",
      message: `${tasks.length} tasks are due within 24 hours`,
      data: tasks,
      timestamp: new Date(),
    });
  }

  sendTaskCompleted(companyId: string, taskData: any) {
    this.socket.to(`company:${companyId}`).emit("notification", {
      type: "task_completed",
      title: "Task Completed",
      message: `${taskData.title} has been completed`,
      data: taskData,
      timestamp: new Date(),
    });
  }
}
```

## Implementation Checklist

### WebSocket Infrastructure

- [ ] Socket.IO server configured
- [ ] Authentication middleware implemented
- [ ] Company-based room isolation
- [ ] Connection management optimized

### Real-time Updates

- [ ] Task status changes broadcast instantly
- [ ] Dashboard metrics update live
- [ ] Table rows animate on updates
- [ ] Charts refresh with new data

### User Experience

- [ ] Connection status indicators
- [ ] User presence visualization
- [ ] Real-time notifications
- [ ] Optimistic UI updates

### Performance & Reliability

- [ ] Connection retry logic
- [ ] Message queuing for offline users
- [ ] Rate limiting on broadcasts
- [ ] Error handling and fallbacks

This phase transforms the dashboard into a live, collaborative experience with real-time updates and user awareness.
