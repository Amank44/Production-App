export type Role = 'ADMIN' | 'MANAGER' | 'CREW';

export type EquipmentStatus =
    | 'AVAILABLE'
    | 'CHECKED_OUT'
    | 'PENDING_VERIFICATION'
    | 'LOST'
    | 'DAMAGED'
    | 'MAINTENANCE';

export type Condition =
    | 'OK'
    | 'SCRATCHES'
    | 'NOT_FUNCTIONING'
    | 'NEEDS_BATTERY'
    | 'LOOSE_MOUNT'
    | 'DAMAGED';

export interface User {
    id: string;
    name: string;
    role: Role;
    email: string;
    active: boolean;
}

export interface Equipment {
    id: string;
    name: string;
    category: string;
    barcode: string;
    status: EquipmentStatus;
    location: string;
    condition: Condition;
    metadata?: {
        brand?: string;
        model?: string;
        serialNumber?: string;
        [key: string]: unknown;
    };
    assignedTo?: string; // User ID
    lastActivity?: string; // ISO Date
}

export interface Transaction {
    id: string;
    userId: string;
    items: string[]; // Equipment IDs
    timestampOut: string;
    project?: string;
    preCheckoutConditions: Record<string, Condition>; // ItemID -> Condition
    status: 'OPEN' | 'CLOSED';
}

export interface ReturnRecord {
    id: string;
    transactionId: string;
    itemId: string;
    timestampReturned: string;
    staffCondition: Condition;
    managerVerified: boolean;
    notes?: string;
}

export interface Log {
    id: string;
    action: 'CHECKOUT' | 'RETURN' | 'VERIFY' | 'EDIT' | 'CREATE';
    entityId: string; // Item or Transaction ID
    userId: string;
    timestamp: string;
    details?: string;
    oldValue?: unknown;
    newValue?: unknown;
}
