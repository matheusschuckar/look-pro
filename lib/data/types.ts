// lib/data/types.ts

export type Product = {
    id: number;
    name: string;
    store_name: string;
    photo_url: string[] | string | null;
    price_tag: number;
  
    // quando vier da VIEW
    eta_text_runtime?: string | null;
    store_id?: number | null;
    store_slug?: string | null;
  
    // legado (tabela antiga)
    eta_text?: string | null;
  
    // demais (opcionais)
    category?: string | null;
    gender?: "male" | "female" | null;
    sizes?: string | string[] | null;
    view_count?: number;
    categories?: string[] | null;
  };
  
  export type Profile = {
    id: string;
    name: string | null;
    whatsapp: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    city: string | null;
    state?: string | null;
    cep: string | null;
    status: "waitlist" | "approved";
  };
  
  export type Store = {
    id: string;
    name: string;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    lat: number | null;
    lng: number | null;
    contact_phone: string | null;
  };
  
