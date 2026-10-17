const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, "db.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Initial Seed Transactions for Aman Meena (NSUT Delhi)
const SEED_TRANSACTIONS = [
    { id: "tx_101", date: "2026-10-16", description: "NSUT Canteen Masala Dosa", category: "Mess & Food", amount: 80, status: "Verified" },
    { id: "tx_102", date: "2026-10-15", description: "Delhi Metro Smart Card Top-Up", category: "Metro & Travel", amount: 500, status: "Verified" },
    { id: "tx_103", date: "2026-10-14", description: "Discrete Math Notes Xerox", category: "Books & Printing", amount: 140, status: "Verified" },
    { id: "tx_104", date: "2026-10-12", description: "Airtel 5G Student Pack", category: "Mobile & OTT", amount: 299, status: "Verified" },
    { id: "tx_105", date: "2026-10-10", description: "Zomato Late Night Maggi & Roll", category: "Mess & Food", amount: 210, status: "Verified" },
    { id: "tx_106", date: "2026-10-05", description: "Dwarka Mor E-Rickshaw Share", category: "Metro & Travel", amount: 60, status: "Verified" }
];

// Helper: Read & Initialize Persistent JSON Database
async function readDB() {
    try {
        const raw = await fs.readFile(DB_FILE, "utf-8");
        return JSON.parse(raw);
    } catch (_) {
        await writeDB(SEED_TRANSACTIONS);
        return [...SEED_TRANSACTIONS];
    }
}

async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/* ==========================================================================
   REST API ENDPOINTS (/api/v1/*)
   ========================================================================== */

// 1. GET /api/v1/metrics - Student Profile & Calculated Financial Health
app.get("/api/v1/metrics", async (req, res) => {
    const txs = await readDB();
    const totalSpent = txs.reduce((sum, t) => sum + Number(t.amount), 0);
    const monthlyAllowance = 8000;
    const targetCap = 4000;
    const healthScore = Math.max(35, Math.min(99, 100 - Math.max(0, Math.round(((totalSpent - 2000) / targetCap) * 40))));

    res.json({
        status: 200,
        student: {
            name: "Aman Meena",
            university: "NSUT Delhi",
            branch: "B.Tech Math & Computing (MAC)",
            studentId: "2024MAC902"
        },
        metrics: {
            totalBalance: 12450 - totalSpent + 1289,
            monthlyAllowance,
            totalSpent,
            remainingAllowance: Math.max(0, monthlyAllowance - totalSpent),
            healthScore
        }
    });
});

// 2. GET /api/v1/expenses - List & Filter Transactions
app.get("/api/v1/expenses", async (req, res) => {
    const { category, search } = req.query;
    let txs = await readDB();

    if (category && category !== "ALL") {
        txs = txs.filter(t => t.category === category);
    }
    if (search) {
        const q = search.toLowerCase();
        txs = txs.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }

    res.json({ status: 200, count: txs.length, data: txs });
});

// 3. POST /api/v1/expenses - Create New Expense
app.post("/api/v1/expenses", async (req, res) => {
    const { description, amount, category, status } = req.body;
    if (!description || amount === undefined || isNaN(Number(amount))) {
        return res.status(400).json({ status: 400, error: "Valid description and numeric amount are required." });
    }

    const txs = await readDB();
    const newTx = {
        id: "tx_" + Date.now().toString().slice(-5),
        date: new Date().toISOString().split("T")[0],
        description: String(description).trim(),
        category: category || "Mess & Food",
        amount: parseFloat(amount),
        status: status || "Verified"
    };

    txs.unshift(newTx);
    await writeDB(txs);

    res.status(201).json({ status: 201, data: newTx });
});

// 4. DELETE /api/v1/expenses/:id - Delete Expense by ID
app.delete("/api/v1/expenses/:id", async (req, res) => {
    const { id } = req.params;
    const txs = await readDB();
    const filtered = txs.filter(t => t.id !== id);

    await writeDB(filtered);
    res.json({ status: 200, deletedId: id, remaining: filtered.length });
});

// 5. POST /api/v1/ocr - Simulated Tesseract Receipt OCR Pipeline
app.post("/api/v1/ocr", async (req, res) => {
    const { description, amount, category } = req.body;
    const txs = await readDB();

    const newTx = {
        id: "tx_" + Date.now().toString().slice(-5),
        date: new Date().toISOString().split("T")[0],
        description: description || "OCR Scanned Campus Receipt",
        category: category || "Mess & Food",
        amount: parseFloat(amount) || 100,
        status: "OCR Scanned"
    };

    txs.unshift(newTx);
    await writeDB(txs);

    res.status(201).json({
        status: 201,
        ocrEngine: "Tesseract_Node_v2.5",
        confidence: 0.98,
        data: newTx
    });
});

// 6. POST /api/v1/ai/chat - Server-Side Student AI Financial Advisor
app.post("/api/v1/ai/chat", async (req, res) => {
    const { query = "", targetExpenseCap = 4000, monthlyAllowance = 8000 } = req.body;
    const q = query.toLowerCase();
    const txs = await readDB();

    const totalSpent = txs.reduce((s, t) => s + Number(t.amount), 0);
    const foodSpent = txs.filter(t => t.category === "Mess & Food").reduce((s, t) => s + Number(t.amount), 0);
    const remainingCap = targetExpenseCap - totalSpent;

    const numMatch = q.match(/\d+/);
    const askedAmount = numMatch ? Number(numMatch[0]) : 350;

    let reply = "";
    if (q.includes("canteen") || q.includes("zomato") || q.includes("food")) {
        reply = `You have spent <strong>₹${foodSpent.toFixed(0)}</strong> on Mess & Food (${totalSpent ? Math.round((foodSpent / totalSpent) * 100) : 0}% of total spend).`;
    } else if (q.includes("afford") || q.includes("outing") || q.includes("party") || q.includes("buy")) {
        if (remainingCap >= askedAmount) {
            reply = `✅ <strong>Yes!</strong> Spending ₹${askedAmount} leaves you with <strong>₹${(remainingCap - askedAmount).toFixed(0)}</strong> inside your ₹${targetExpenseCap} monthly target cap.`;
        } else {
            reply = `⚠️ <strong>Caution!</strong> ₹${askedAmount} exceeds your ₹${targetExpenseCap} monthly cap by <strong>₹${Math.abs(remainingCap - askedAmount).toFixed(0)}</strong>.`;
        }
    } else {
        reply = `📊 <strong>Live Server Report:</strong> Total spent is <strong>₹${totalSpent}</strong> across ${txs.length} transactions. Remaining target buffer: <strong>₹${Math.max(0, remainingCap)}</strong>.`;
    }

    res.json({ status: 200, reply });
});

// 7. Database Utility Routes (Reseed & Clear)
app.post("/api/v1/db/reseed", async (req, res) => {
    await writeDB(SEED_TRANSACTIONS);
    res.json({ status: 200, message: "Database reseeded to initial NSUT dataset", data: SEED_TRANSACTIONS });
});

app.post("/api/v1/db/clear", async (req, res) => {
    await writeDB([]);
    res.json({ status: 200, message: "Database purged", data: [] });
});

app.listen(PORT, () => {
    console.log(`\n🚀 FinanceAI Student OS Backend running at http://localhost:${PORT}`);
    console.log(`📡 REST API Base: http://localhost:${PORT}/api/v1\n`);
});