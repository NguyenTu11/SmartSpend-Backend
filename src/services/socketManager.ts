import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";

class SocketManager {
    private io: SocketServer | null = null;
    private userSockets: Map<string, Set<string>> = new Map();

    initialize(httpServer: HttpServer) {
        this.io = new SocketServer(httpServer, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });

        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error("Authentication required"));

            try {
                const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string };
                socket.data.userId = decoded.userId;
                next();
            } catch {
                next(new Error("Invalid token"));
            }
        });

        this.io.on("connection", (socket) => this.handleConnection(socket));
    }

    private handleConnection(socket: Socket) {
        const userId = socket.data.userId;

        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socket.id);

        socket.join(`user:${userId}`);

        socket.on("disconnect", () => {
            this.userSockets.get(userId)?.delete(socket.id);
            if (this.userSockets.get(userId)?.size === 0) {
                this.userSockets.delete(userId);
            }
        });
    }

    emitToUser(userId: string, event: string, data: any) {
        this.io?.to(`user:${userId}`).emit(event, data);
    }

    isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
    }

    getIO() {
        return this.io;
    }
}

export const socketManager = new SocketManager();
