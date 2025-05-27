
export interface VendorRegistration {
  id?: string;
  company_name: string;
  company_type?: string;
  incorporation_date?: string;
  registration_number?: string;
  pan_number?: string;
  gst_number?: string;
  tan_number?: string;
  primary_email: string;
  secondary_email?: string;
  primary_phone: string;
  secondary_phone?: string;
  website?: string;
  registered_address: Address;
  business_address?: Address;
  billing_address?: Address;
  signatory_name: string;
  signatory_designation?: string;
  signatory_email?: string;
  signatory_phone?: string;
  signatory_pan?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  business_description?: string;
  years_in_business?: number;
  annual_turnover?: number;
  status?: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  user_id?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface VendorDocument {
  id?: string;
  vendor_id: string;
  document_type: 'incorporation' | 'tax_document' | 'cancelled_cheque' | 'other';
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  is_verified?: boolean;
  verification_notes?: string;
}

export interface VendorCommunication {
  id?: string;
  vendor_id: string;
  sender_id: string;
  receiver_id?: string;
  sender_type: 'admin' | 'vendor';
  subject: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
  parent_id?: string;
  attachments?: string[];
}
