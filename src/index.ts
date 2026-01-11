import express from "express";
import cors from "cors";
import { connectDB } from "./config/database";
import { ENV } from "./config/env";
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
import { recurringTransactionsJob } from "./cron/recurringTransactions";

const app = express();
app.use(cors());
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

app.get("/", (_req, res) => {
    res.send("SmartSpend Backend Running");
});

recurringTransactionsJob();

connectDB().then(() => {
    app.listen(ENV.PORT, () => {
        console.log(`Server running on port ${ENV.PORT}`);
    });
});
