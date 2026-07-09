export type Tab = 'dashboard' | 'clientes' | 'nuevo-contrato' | 'vencimientos' | 'reportes' | 'articulos';

export type Organization = 'Tilsen' | 'FNC';

export interface Marca {
  id: string;
  nombre: string;
}

export interface Calibre {
  id: string;
  nombre: string;
}

export interface Item {
  id: string;
  codigo: string;
  nombre: string;
  marca_id?: string | null;
  calibre_id?: string | null;
  tipo?: string | null;
  marca?: Marca;
  calibre?: Calibre;
}

export interface UserIdentity {
  organization: Organization;
  name: string;
}

export interface Client {
  id: string;
  initials: string;
  name: string;
  contactName: string;
  contactRole: string;
  endDate: string;
  monthlyAmount: number;
  status: 'Activo' | 'Por Vencer' | 'Finalizado' | 'Pendiente Firma';
}

export interface Contract {
  id: string;
  initials: string;
  companyName: string;
  clientName: string;
  type: string;
  endDate: string;
  amount: string;
  status: 'Crítico' | 'Próximo';
}
