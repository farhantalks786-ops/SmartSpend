import {
    auth,
    db,
    ref,
    set,
    get
} from "./firebase.js";

// Save all transactions of the current user
export async function saveUserTransactions(transactions) {

    const user = auth.currentUser;

    if (!user) return;

    await set(
        ref(db, `users/${user.uid}/transactions`),
        transactions
    );

}

// Load transactions of the current user
export async function loadUserTransactions() {

    const user = auth.currentUser;

    if (!user) return [];

    const snapshot = await get(
        ref(db, `users/${user.uid}/transactions`)
    );

    if (snapshot.exists()) {
        return snapshot.val();
    }

    return [];
}
