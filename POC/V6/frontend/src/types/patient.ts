export interface Patient {
  patient_id: string;
  patient_name: string;
  patient_token: string;
  age?: number;
  gender?: string;
  ethnicity?: string;
  mrn?: string;
  phone?: string;
  email?: string;
}

