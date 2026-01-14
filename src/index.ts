import express from "express";
import { createServer } from "http";
import cors from "cors";
import { connectDB } from "./config/database";
import { ENV } from "./config/env";
import { socketManager } from "./services/socketManager";
import authRoutes from "./routes/auth";
import walletRoutes from "./routes/walletRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import budgetRoutes from "./routes/budgetRoutes";
import budgetTransferRoutes from "./routes/budgetTransferRoutes";
import chatRoutes from "./routes/chatRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import userRoutes from "./routes/userRoutes";
import ocrRoutes from "./routes/ocrRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import { recurringTransactionsJob } from "./cron/recurringTransactions";

const app = express();
const httpServer = createServer(app);

socketManager.initialize(httpServer);

const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ENV.FRONTEND_URL
].filter(Boolean) as string[];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/budget-transfers", budgetTransferRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (_req, res) => {
    res.send("SmartSpend Backend Running");
});

recurringTransactionsJob();

connectDB().then(() => {
    httpServer.listen(ENV.PORT, () => {
        console.log(`Server running on port ${ENV.PORT}`);
    });
});
