export type PlotStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "BOOKED"
  | "UNDER_DOCUMENTATION"
  | "SOLD"
  | "REGISTERED"
  | "RESALE_AVAILABLE"
  | "BLOCKED"
  | "CANCELLED";

export interface Project {
  id: string;
  name: string;
  code: string;
  city: string;
  agentVisible: boolean;
  customerListed: boolean;
}

export interface Plot {
  id: string;
  projectId: string;
  number: string;
  status: PlotStatus;
  area: number;
  price: number;
  facing: string;
  customerId?: string;
  agentId?: string;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  email: string;
  agentId: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  stage: string;
  agentId: string;
  projectId: string;
}

export interface Booking {
  id: string;
  projectId: string;
  plotId: string;
  customerId: string;
  agentId: string;
  amount: number;
  status: string;
}

export interface Doc {
  id: string;
  projectId: string;
  title: string;
  visibility: "INTERNAL" | "AGENT_VISIBLE" | "CUSTOMER_PROFILE_RELATED";
  customerId?: string;
}

export interface PlatformSeed {
  projects: Project[];
  plots: Plot[];
  customers: Person[];
  leads: Lead[];
  bookings: Booking[];
  documents: Doc[];
}

export const PLATFORM_SEED: PlatformSeed = {
  projects: [
    { id: "PRJ-01", name: "Bhairava Greens", code: "BG", city: "Hyderabad", agentVisible: true, customerListed: true },
    { id: "PRJ-02", name: "Bhairava Heights", code: "BH", city: "Hyderabad", agentVisible: true, customerListed: true },
  ],
  plots: [
    { id: "PLT-101", projectId: "PRJ-01", number: "A-101", status: "AVAILABLE", area: 200, price: 4200000, facing: "East" },
    { id: "PLT-102", projectId: "PRJ-01", number: "A-102", status: "RESERVED", area: 220, price: 4600000, facing: "North", customerId: "CUS-02", agentId: "AGT-02" },
    { id: "PLT-103", projectId: "PRJ-01", number: "A-103", status: "BOOKED", area: 240, price: 5100000, facing: "West", customerId: "CUS-01", agentId: "AGT-01" },
    { id: "PLT-104", projectId: "PRJ-01", number: "A-104", status: "SOLD", area: 210, price: 4800000, facing: "South", customerId: "CUS-03", agentId: "AGT-02" },
    { id: "PLT-201", projectId: "PRJ-02", number: "B-201", status: "RESALE_AVAILABLE", area: 300, price: 6200000, facing: "East", customerId: "CUS-01", agentId: "AGT-01" },
    { id: "PLT-202", projectId: "PRJ-02", number: "B-202", status: "BLOCKED", area: 180, price: 3900000, facing: "North" },
  ],
  customers: [
    { id: "CUS-01", name: "Ananya Rao", phone: "9000000001", email: "ananya@example.com", agentId: "AGT-01" },
    { id: "CUS-02", name: "Rahul Mehta", phone: "9000000002", email: "rahul@example.com", agentId: "AGT-02" },
    { id: "CUS-03", name: "Sneha Iyer", phone: "9000000003", email: "sneha@example.com", agentId: "AGT-02" },
  ],
  leads: [
    { id: "LED-01", name: "Kiran Patel", phone: "9000000011", stage: "Qualified", agentId: "AGT-01", projectId: "PRJ-01" },
    { id: "LED-02", name: "Meera Shah", phone: "9000000012", stage: "New", agentId: "AGT-02", projectId: "PRJ-02" },
  ],
  bookings: [
    { id: "BK-01", projectId: "PRJ-01", plotId: "PLT-103", customerId: "CUS-01", agentId: "AGT-01", amount: 5100000, status: "Confirmed" },
  ],
  documents: [
    { id: "DOC-INT", projectId: "PRJ-01", title: "Internal cost sheet", visibility: "INTERNAL" },
    { id: "DOC-AG", projectId: "PRJ-01", title: "Agent brochure", visibility: "AGENT_VISIBLE" },
    { id: "DOC-CU", projectId: "PRJ-01", title: "Booking acknowledgment", visibility: "CUSTOMER_PROFILE_RELATED", customerId: "CUS-01" },
  ],
};

export const AGENT_DEMO = { id: "AGT-01", email: "agent@bhairava.com", password: "agent@2026", name: "Kavya Agent" };
export const CUSTOMER_DEMO = { id: "CUS-01", email: "customer@bhairava.com", password: "customer@2026", name: "Ananya Rao" };
