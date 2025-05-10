
export interface User {
  id: string;
  email: string;
  created_at: string;
  fullName?: string;
  phone?: string;
  planType: 'free' | 'pro';
  planStartDate?: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  client_id?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface TransactionWithClient extends Transaction {
  client?: Client;
}

export interface WeeklyTransactionsLimit {
  count: number;
  limit: number;
  canCreate: boolean;
}

export interface ExtendedUser extends User {
  companyName?: string;
  commercialPhone?: string;
  address?: string;
}

// Interface para corresponder ao formato dos dados retornados pelo Supabase
export interface SupabaseProfile {
  id: string;
  created_at: string | null;
  email: string | null;
  fullname: string | null;
  phone: string | null;
  plantype: string | null;
  planstartdate: string | null;
  companyname: string | null;
  commercialphone: string | null;
  address: string | null;
  planexpirydate: string | null;
  theme: string | null;
}
