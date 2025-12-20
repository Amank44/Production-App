import { supabase } from './supabase';
import { User, Equipment, Transaction, Log } from '@/types';

class StorageService {
    // Users
    async getUsers(): Promise<User[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data as User[];
    }

    // Equipment
    async getEquipment(): Promise<Equipment[]> {
        const { data, error } = await supabase
            .from('equipment')
            .select('*');

        if (error) {
            console.error('Error fetching equipment:', error);
            return [];
        }

        // Map DB fields to TS interface if needed (snake_case to camelCase is handled if we set it up, 
        // but for now we assume direct mapping or manual mapping if keys differ)
        // Our SQL uses snake_case for some fields (assigned_to, last_activity), so we map them.
        return data.map((item: any) => ({
            ...item,
            serialNumber: item.serial_number,
            assignedTo: item.assigned_to,
            lastActivity: item.last_activity
        })) as Equipment[];
    }

    async saveEquipment(equipment: Equipment[]): Promise<void> {
        // This method was used for bulk save in local storage. 
        // For Supabase, we should probably use upsert or individual updates.
        // For now, we'll implement it as a bulk upsert.
        const dbItems = equipment.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            status: item.status,
            location: item.location,
            condition: item.condition,
            serial_number: item.serialNumber,
            assigned_to: item.assignedTo,
            last_activity: item.lastActivity
        }));

        const { error } = await supabase
            .from('equipment')
            .upsert(dbItems);

        if (error) console.error('Error saving equipment:', error);
    }

    async addEquipment(item: Equipment): Promise<void> {
        const dbItem = {
            id: item.id,
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            status: item.status,
            location: item.location,
            condition: item.condition,
            serial_number: item.serialNumber,
            assigned_to: item.assignedTo,
            last_activity: item.lastActivity
        };

        const { error } = await supabase
            .from('equipment')
            .insert(dbItem);

        if (error) console.error('Error adding equipment:', error);
    }

    async updateEquipment(id: string, updates: Partial<Equipment>): Promise<void> {
        // Map updates to snake_case
        const dbUpdates: any = { ...updates };
        if (updates.serialNumber !== undefined) {
            dbUpdates.serial_number = updates.serialNumber;
            delete dbUpdates.serialNumber;
        }
        if (updates.assignedTo !== undefined) {
            dbUpdates.assigned_to = updates.assignedTo;
            delete dbUpdates.assignedTo;
        }
        if (updates.lastActivity !== undefined) {
            dbUpdates.last_activity = updates.lastActivity;
            delete dbUpdates.lastActivity;
        }

        const { error } = await supabase
            .from('equipment')
            .update(dbUpdates)
            .eq('id', id);

        if (error) console.error('Error updating equipment:', error);
    }

    // Transactions
    async getTransactions(): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*');

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }

        return data.map((t: any) => ({
            ...t,
            userId: t.user_id,
            timestampOut: t.timestamp_out,
            preCheckoutConditions: t.pre_checkout_conditions,
            postReturnConditions: t.post_return_conditions,
            additionalUsers: t.additional_users,
            notes: t.notes
        })) as Transaction[];
    }

    async saveTransaction(transaction: Transaction): Promise<void> {
        const dbTransaction = {
            id: transaction.id,
            user_id: transaction.userId,
            items: transaction.items,
            timestamp_out: transaction.timestampOut,
            project: transaction.project,
            pre_checkout_conditions: transaction.preCheckoutConditions,
            status: transaction.status,
            additional_users: transaction.additionalUsers,
            notes: transaction.notes
        };

        const { error } = await supabase
            .from('transactions')
            .insert(dbTransaction);

        if (error) console.error('Error saving transaction:', error);
    }

    async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
        const dbUpdates: any = { ...updates };
        // Map keys
        if (updates.userId) { dbUpdates.user_id = updates.userId; delete dbUpdates.userId; }
        if (updates.timestampOut) { dbUpdates.timestamp_out = updates.timestampOut; delete dbUpdates.timestampOut; }
        if (updates.preCheckoutConditions) { dbUpdates.pre_checkout_conditions = updates.preCheckoutConditions; delete dbUpdates.preCheckoutConditions; }

        const { error } = await supabase
            .from('transactions')
            .update(dbUpdates)
            .eq('id', id);

        if (error) console.error('Error updating transaction:', error);
    }

    // Logs
    async getLogs(): Promise<Log[]> {
        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching logs:', error);
            return [];
        }

        return data.map((l: any) => ({
            ...l,
            userId: l.user_id,
            entityId: l.entity_id || l.entityId // Handle potential naming diffs
        })) as Log[];
    }

    async addLog(log: Log): Promise<void> {
        const dbLog = {
            id: log.id,
            action: log.action,
            entity_id: log.entityId,
            user_id: log.userId,
            timestamp: log.timestamp,
            details: log.details
        };

        const { error } = await supabase
            .from('logs')
            .insert(dbLog);

        if (error) console.error('Error adding log:', error);
    }

    // Reset
    async resetData(): Promise<void> {
        // Dangerous in production!
        console.warn('Reset data called - not implemented for Supabase production safety');
    }
}

export const storage = new StorageService();
