import { User, Equipment, Transaction, Log } from '@/types';

const STORAGE_KEYS = {
    USERS: 'app_users',
    EQUIPMENT: 'app_equipment',
    TRANSACTIONS: 'app_transactions',
    LOGS: 'app_logs',
};

// Mock Data
const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Alice Staff', role: 'STAFF', email: 'alice@example.com', active: true },
    { id: 'u2', name: 'Bob Manager', role: 'MANAGER', email: 'bob@example.com', active: true },
    { id: 'u3', name: 'Charlie Viewer', role: 'VIEWER', email: 'charlie@example.com', active: true },
];

const MOCK_EQUIPMENT: Equipment[] = [
    { id: 'eq1', name: 'Sony A7S III', category: 'Camera', barcode: 'CAM-001', status: 'AVAILABLE', location: 'Shelf A', condition: 'OK' },
    { id: 'eq2', name: 'Canon 24-70mm', category: 'Lens', barcode: 'LENS-001', status: 'AVAILABLE', location: 'Shelf B', condition: 'OK' },
    { id: 'eq3', name: 'Sennheiser MKH 416', category: 'Audio', barcode: 'AUD-001', status: 'CHECKED_OUT', location: 'Field', condition: 'OK', assignedTo: 'u1' },
];

class StorageService {
    private isClient = typeof window !== 'undefined';

    private getItem<T>(key: string, initial: T): T {
        if (!this.isClient) return initial;
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : initial;
    }

    private setItem<T>(key: string, value: T): void {
        if (!this.isClient) return;
        localStorage.setItem(key, JSON.stringify(value));
    }

    // Users
    getUsers(): User[] {
        return this.getItem(STORAGE_KEYS.USERS, MOCK_USERS);
    }

    // Equipment
    getEquipment(): Equipment[] {
        return this.getItem(STORAGE_KEYS.EQUIPMENT, MOCK_EQUIPMENT);
    }

    saveEquipment(equipment: Equipment[]): void {
        this.setItem(STORAGE_KEYS.EQUIPMENT, equipment);
    }

    addEquipment(item: Equipment): void {
        const list = this.getEquipment();
        list.push(item);
        this.saveEquipment(list);
    }

    updateEquipment(id: string, updates: Partial<Equipment>): void {
        const list = this.getEquipment();
        const index = list.findIndex(e => e.id === id);
        if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            this.saveEquipment(list);
        }
    }

    // Transactions
    getTransactions(): Transaction[] {
        return this.getItem(STORAGE_KEYS.TRANSACTIONS, []);
    }

    saveTransaction(transaction: Transaction): void {
        const list = this.getTransactions();
        list.push(transaction);
        this.setItem(STORAGE_KEYS.TRANSACTIONS, list);
    }

    updateTransaction(id: string, updates: Partial<Transaction>): void {
        const list = this.getTransactions();
        const index = list.findIndex(t => t.id === id);
        if (index !== -1) {
            list[index] = { ...list[index], ...updates };
            this.setItem(STORAGE_KEYS.TRANSACTIONS, list);
        }
    }

    // Logs
    getLogs(): Log[] {
        return this.getItem(STORAGE_KEYS.LOGS, []);
    }

    addLog(log: Log): void {
        const list = this.getLogs();
        list.unshift(log); // Newest first
        this.setItem(STORAGE_KEYS.LOGS, list);
    }

    // Reset
    resetData(): void {
        if (!this.isClient) return;
        localStorage.clear();
        window.location.reload();
    }
}

export const storage = new StorageService();
