
// ===============================
// IMPORTS
// ===============================

import {
    auth,
    db,
    provider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    ref,
    set,
    get,
    push
} from "./firebase.js";

import {
    saveUserTransactions,
    loadUserTransactions
} from "./database.js";

// ===============================
// GLOBAL VARIABLES
// ===============================
const monthlyBudget = 50000;

let transactions = [];

const saved = localStorage.getItem("transactions");

if (saved) {
    transactions = JSON.parse(saved);
}

const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const typeInput = document.getElementById("type");

const incomeElement = document.getElementById("income");
const expenseElement = document.getElementById("expense");
const balanceElement = document.getElementById("balance");

const tableBody = document.getElementById("tableBody");

let expenseChart;
let incomeExpenseChart;

// ===============================
// FIREBASE AUTHENTICATION
// ===============================

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");
const userPhoto = document.getElementById("userPhoto");

loginBtn.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        if (error.code !== "auth/popup-closed-by-user") {
            console.error(error);
            alert(error.message);
        }
    }
});

logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {

    if (user) {

        loginBtn.style.display = "none";
        userInfo.style.display = "flex";
        userName.textContent = user.displayName;
        userPhoto.src = user.photoURL;
        userPhoto.style.display = "block";

        console.log("Logged in:", user.uid);

        // Load transactions from Firebase
        transactions = await loadUserTransactions();

        renderTransactions();
        updateRecentActivity();
        updateAnalytics();
        updateBudget();

    } else {

        loginBtn.style.display = "inline-block";
        userInfo.style.display = "none";

        // Clear previous user information
        userName.textContent = "";
        userPhoto.removeAttribute("src");

        transactions = JSON.parse(localStorage.getItem("transactions")) || [];

        renderTransactions();
        updateRecentActivity();
        updateAnalytics();
        updateBudget();

    }

});

// ===============================
// TRANSACTION MANAGEMENT
// ===============================

async function saveTransactions() {

    // Save locally (backup)
    localStorage.setItem(
        "transactions",
        JSON.stringify(transactions)
    );

    // Save to Firebase if logged in
    if (auth.currentUser) {
        await saveUserTransactions(transactions);
    }

}

function formatCurrency(value) {

    return "₹" + Number(value).toLocaleString("en-IN");

}

function updateSummary() {

    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {

        if (transaction.type === "Income") {

            income += Number(transaction.amount);

        } else {

            expense += Number(transaction.amount);

        }

    });

    incomeElement.textContent = formatCurrency(income);
    expenseElement.textContent = formatCurrency(expense);
    balanceElement.textContent = formatCurrency(income - expense);

}

function renderTransactions() {

    tableBody.innerHTML = "";

    transactions.forEach((transaction, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `

        <td>${transaction.title}</td>

        <td>${transaction.category}</td>

        <td class="${
            transaction.type === "Income"
            ? "green"
            : "red"
        }">

        ${
            transaction.type === "Income"
            ? "+"
            : "-"
        }

        ${formatCurrency(transaction.amount)}

        </td>

        <td>${transaction.date}</td>

        <td>

            <button onclick="editTransaction(${index})">

            Edit

            </button>

            <button onclick="deleteTransaction(${index})">

            Delete

            </button>

        </td>

        `;

        tableBody.appendChild(row);

    });

    updateSummary();

}

async function addTransaction() {

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const type = typeInput.value;

    if (title === "" || amount <= 0) {

        alert("Please fill all fields.");
        return;

    }

    const today = new Date();
    const date = today.toLocaleDateString("en-IN");

    transactions.push({
        title,
        amount,
        category,
        type,
        date
    });

    await saveTransactions();

    renderTransactions();
    updateRecentActivity();
    updateAnalytics();

    titleInput.value = "";
    amountInput.value = "";

}

async function editTransaction(index) {

    const transaction = transactions[index];

    titleInput.value = transaction.title;
    amountInput.value = transaction.amount;
    categoryInput.value = transaction.category;
    typeInput.value = transaction.type;

    transactions.splice(index, 1);

    await saveTransactions();

    renderTransactions();
    updateRecentActivity();
    updateAnalytics();
    updateBudget();

}

async function deleteTransaction(index) {

    if (confirm("Delete this transaction?")) {

        transactions.splice(index, 1);

        await saveTransactions();

        renderTransactions();
        updateRecentActivity();
        updateAnalytics();
        updateBudget();

    }

}

// ---------- NOTIFICATION ----------

function showNotification(message) {

    const notify = document.createElement("div");

    notify.className = "notify";
    notify.innerText = message;

    document.body.appendChild(notify);

    setTimeout(() => {
        notify.classList.add("show");
    }, 100);

    setTimeout(() => {
        notify.classList.remove("show");
    }, 2500);

    setTimeout(() => {
        notify.remove();
    }, 3000);

}

// ---------- OVERRIDE ADD TRANSACTION ----------

const originalAddTransaction = addTransaction;

addTransaction = async function () {

    await originalAddTransaction();

    updateBudget();

    showNotification("Transaction Added Successfully 🎉");

};

// ---------- RECENT ACTIVITY ----------

function updateRecentActivity() {

    const container = document.getElementById("recentActivity");

    if (!container) return;

    container.innerHTML = "";

    const latest = [...transactions].reverse().slice(0, 5);

    latest.forEach(t => {

        const div = document.createElement("div");

        div.className = "activity";

        div.innerHTML = `
            <div>${t.title}</div>
            <div class="${t.type === "Income" ? "green" : "red"}">
                ${t.type === "Income" ? "+" : "-"} ₹${t.amount}
            </div>
        `;

        container.appendChild(div);

    });

}

// ---------- INITIAL LOAD ----------



// ---------- GLOBAL EXPORTS (used by inline onclick handlers) ----------

window.addTransaction = addTransaction;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;

// ===============================
// SEARCH
// ===============================

const searchBox = document.querySelector(".transaction-header input");

searchBox.addEventListener("keyup", function () {

    const keyword = searchBox.value.toLowerCase();

    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(row => {

        if (row.innerText.toLowerCase().includes(keyword)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

});

// ===============================
// BUDGET
// ===============================

const progressBar = document.querySelector(".progress-bar");
const budgetText = document.querySelector(".budget-card p");


function updateBudget() {

    let expense = 0;

    transactions.forEach(item => {

        if (item.type === "Expense") {
            expense += Number(item.amount);
        }

    });

    let remaining = monthlyBudget - expense;
    let percent = (remaining / monthlyBudget) * 100;

    if (percent < 0) {
        percent = 0;
    }

    progressBar.style.width = percent + "%";

    budgetText.innerHTML =
        "Remaining Budget : <b>" +
        formatCurrency(remaining) +
        "</b>";

    if (percent < 25) {
        progressBar.style.background = "#ef4444";
    } else if (percent < 50) {
        progressBar.style.background = "#f59e0b";
    } else {
        progressBar.style.background = "linear-gradient(90deg,#22c55e,#2563eb)";
    }

}

// ===============================
// ANALYTICS
// ===============================

function updateAnalytics() {

    const income = transactions
        .filter(t => t.type === "Income")
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === "Expense")
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    document.getElementById("analyticsIncome").innerText =
        "₹" + income.toLocaleString();

    document.getElementById("analyticsExpense").innerText =
        "₹" + expense.toLocaleString();

    document.getElementById("analyticsBalance").innerText =
        "₹" + balance.toLocaleString();

    document.getElementById("analyticsTransactions").innerText =
        transactions.length;

    drawExpenseChart();
    drawIncomeExpenseChart();

}

// ---------- AI FINANCIAL REPORT (ALERT SUMMARY) ----------

function generateAIReport() {

    let income = 0;
    let expense = 0;
    let food = 0;

    transactions.forEach(item => {

        if (item.type === "Income") {

            income += Number(item.amount);

        } else {

            expense += Number(item.amount);

            if (item.category === "Food") {
                food += Number(item.amount);
            }

        }

    });

    let report = "";

    report += "📊 Monthly Summary\n\n";
    report += "Income : " + formatCurrency(income) + "\n";
    report += "Expense : " + formatCurrency(expense) + "\n";
    report += "Balance : " + formatCurrency(income - expense) + "\n\n";

    if (food > 3000) {
        report += "🍔 Food spending is high.\n";
    }

    if (expense > income) {
        report += "⚠ You spent more than your income.\n";
    }

    if ((income - expense) > 5000) {
        report += "🎉 Excellent savings this month.\n";
    }

    report += "\n💡 Try saving 15% of your monthly income.";

    alert(report);

}

const aiButton = document.querySelector(".ai-card button");

if (aiButton) {
    aiButton.onclick = generateAIReport;
}

// ===============================
// CHARTS
// ===============================

function drawExpenseChart() {

    const totals = {};

    transactions
        .filter(t => t.type === "Expense")
        .forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + t.amount;
        });

    const labels = Object.keys(totals);
    const values = Object.values(totals);

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(
        document.getElementById("expenseChart"),
        {
            type: "pie",
            data: {
                labels: labels,
                datasets: [{
                    data: values
                }]
            }
        }
    );

}

function drawIncomeExpenseChart() {

    const income = transactions
        .filter(t => t.type === "Income")
        .reduce((a, b) => a + b.amount, 0);

    const expense = transactions
        .filter(t => t.type === "Expense")
        .reduce((a, b) => a + b.amount, 0);

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(
        document.getElementById("incomeExpenseChart"),
        {
            type: "bar",
            data: {
                labels: ["Income", "Expense"],
                datasets: [{
                    data: [income, expense]
                }]
            }
        }
    );

}

// ===============================
// AI CHATBOT
// ===============================

const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

async function askAI() {

    const question = chatInput.value.trim();

    if (question === "") return;

    messages.innerHTML += `
        <div class="user">
            ${question}
        </div>
    `;

    chatInput.value = "";

    const loading = document.createElement("div");

    loading.className = "bot";

    loading.innerHTML = `

<div class="typing-box">

    <div class="typing-header">

        🤖 SmartSpend AI

    </div>

    <div class="typing-text">

        Thinking

    </div>

    <div class="typing-dots">

        <span></span>

        <span></span>

        <span></span>

    </div>

</div>

`;

    messages.appendChild(loading);

    const summary = transactions.map(t =>
        `${t.title} | ${t.category} | ${t.type} | ₹${t.amount} | ${t.date}`
    ).join("\n");

    try {

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {

                method: "POST",

                headers: {
                    "Authorization": "Bearer " + OPENROUTER_API_KEY,
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    model: "openai/gpt-4o-mini",

                    messages: [

                        {

                            role: "system",

                            content:
`You are SmartSpend AI.

Here are the user's transactions:

${summary}

Answer ONLY using these transactions whenever possible.

If the user asks for savings advice, give practical financial advice.`

                        },

                        {
                            role: "user",
                            content: question
                        }

                    ]

                })

            }
        );

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {

            loading.innerHTML = data.choices[0].message.content;

        } else {

            loading.innerHTML =
                "❌ " + (data.error?.message || "Unable to get AI response.");

        }

    } catch (error) {

        loading.innerHTML = "❌ Unable to contact AI.";

        console.log(error);

    }

}

sendBtn.onclick = askAI;

chatInput.addEventListener("keypress", (e) => {

    if (e.key === "Enter") {
        askAI();
    }

});

const suggestionButtons = document.querySelectorAll(".suggestion");

suggestionButtons.forEach(button => {

    button.addEventListener("click", () => {
        chatInput.value = button.innerText;
        askAI();
    });

});

// ===============================
// PDF EXPORT
// ===============================

function getReportUser() {

    if (auth.currentUser) {
        return auth.currentUser.displayName;
    }

    return "Guest User";

}

function getReportDate() {
    return new Date().toLocaleString();
}

function createCoverPage(pdf) {

    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, 210, 297, "F");

    pdf.setTextColor(255, 255, 255);

    pdf.setFontSize(30);
    pdf.text("SmartSpend AI", 105, 60, { align: "center" });

    pdf.setFontSize(22);
    pdf.text("AI Financial Report", 105, 80, { align: "center" });

    pdf.setFontSize(16);
    pdf.text("Prepared For", 105, 120, { align: "center" });

    pdf.setFontSize(20);
    pdf.text(getReportUser(), 105, 135, { align: "center" });

    pdf.setFontSize(12);
    pdf.text(getReportDate(), 105, 160, { align: "center" });

    pdf.setFontSize(14);
    pdf.text("Generated by SmartSpend AI", 105, 250, { align: "center" });

    pdf.addPage();

}

function createExecutiveSummary(pdf) {

    const income = transactions
        .filter(t => t.type === "Income")
        .reduce((a, b) => a + Number(b.amount), 0);

    const expense = transactions
        .filter(t => t.type === "Expense")
        .reduce((a, b) => a + Number(b.amount), 0);

    const balance = income - expense;

    const savingsRate = income > 0
        ? ((balance / income) * 100).toFixed(1)
        : 0;

    pdf.setTextColor(0, 0, 0);

    pdf.setFontSize(24);
    pdf.text("Executive Summary", 20, 25);

    pdf.setDrawColor(220);
    pdf.line(20, 30, 190, 30);

    const cards = [
        ["Total Income", "Rs. " + income.toLocaleString()],
        ["Total Expense", "Rs. " + expense.toLocaleString()],
        ["Balance", "Rs. " + balance.toLocaleString()],
        ["Transactions", transactions.length.toString()],
        ["Savings Rate", savingsRate + " %"]
    ];

    let x = 20;
    let y = 45;

    cards.forEach((card, index) => {

        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(x, y, 75, 28, 3, 3, "F");

        pdf.setFontSize(11);
        pdf.setTextColor(100);
        pdf.text(card[0], x + 5, y + 10);

        pdf.setFontSize(16);
        pdf.setTextColor(37, 99, 235);
        pdf.text(card[1], x + 5, y + 22);

        if (index % 2 === 1) {
            x = 20;
            y += 38;
        } else {
            x = 110;
        }

    });

    pdf.addPage();

}

async function generateFinancialReport() {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("p", "mm", "a4");

    // Cover
    createCoverPage(pdf);

    // Executive Summary
    createExecutiveSummary(pdf);

    // Transactions Page
    pdf.setFontSize(22);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Transactions", 20, 20);

    const rows = transactions.map((t, index) => [
        index + 1,
        t.date,
        t.title,
        t.category,
        t.type,
        "₹" + Number(t.amount).toLocaleString("en-IN")
    ]);

    pdf.autoTable({
        startY: 30,
        head: [[
            "#",
            "Date",
            "Title",
            "Category",
            "Type",
            "Amount"
        ]],
        body: rows,

        theme: "grid",

        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            halign: "center"
        },

        styles: {
            fontSize: 10,
            cellPadding: 3
        },

        alternateRowStyles: {
            fillColor: [245, 247, 250]
        }
    });

    pdf.save("SmartSpend_AI_Report.pdf");

}

document.getElementById("pdfBtn").addEventListener("click", generateFinancialReport);

// ===============================
// CSV EXPORT
// ===============================

function exportCSV() {

    if (transactions.length === 0) {
        alert("No transactions available to export.");
        return;
    }

    let csv = "Date,Title,Category,Type,Amount\n";

    transactions.forEach(t => {
        csv += `"${t.date}","${t.title}","${t.category}","${t.type}",${t.amount}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `SmartSpend_Report_${new Date().toLocaleDateString().replace(/\//g, "-")}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}

document.getElementById("excelBtn").addEventListener("click", exportCSV);

// ===============================
// DARK MODE
// ===============================

const themeBtn = document.getElementById("themeBtn");

let dark = true;

themeBtn.addEventListener("click", () => {

    dark = !dark;

    if (dark) {
        document.body.style.background = "#09090f";
        document.body.style.color = "white";
    } else {
        document.body.style.background = "#f3f4f6";
        document.body.style.color = "#111827";
    }

});

// ===============================
// EVENT LISTENERS (QUICK ACTIONS)
// ===============================

document.getElementById("incomeQuick").onclick = () => {

    typeInput.value = "Income";

    document.querySelector(".transaction-form").scrollIntoView({
        behavior: "smooth"
    });

    titleInput.focus();

};

document.getElementById("expenseQuick").onclick = () => {

    typeInput.value = "Expense";

    document.querySelector(".transaction-form").scrollIntoView({
        behavior: "smooth"
    });

    titleInput.focus();

};

document.getElementById("pdfQuick").onclick = () => {
    document.getElementById("pdfBtn").click();
};

document.getElementById("analyticsQuick").onclick = () => {
    document.querySelector(".analytics").scrollIntoView({
        behavior: "smooth"
    });
};

document.getElementById("aiQuick").onclick = () => {
    generateAIReport();
};

document.getElementById("themeQuick").onclick = () => {
    document.getElementById("themeBtn").click();
};

// ===============================
// ADD TRANSACTION BUTTON
// ===============================

document.getElementById("addBtn").addEventListener("click", () => {
    addTransaction();
});
renderTransactions();
updateRecentActivity();
updateAnalytics();
updateBudget();
document.getElementById("year").textContent = new Date().getFullYear();