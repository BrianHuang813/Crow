export type CellState = 'empty' | 'alive' | 'dying' | 'fossil';
export type ProjectStatus = 'alive' | 'dying' | 'dead';

export interface GridCell {
  x: number;
  y: number;
  state: CellState;
  project_id: string | null;
  color: string | null;
}

export interface GridSnapshot {
  updated_at: string;
  width: number;
  height: number;
  cells: GridCell[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  repo: string | null;
  tech_tags: string[];
  owner_id: string;
  status: ProjectStatus;
  expires_at: string;
  momentum: number;
  territory_size: number;
  color: string;
  created_at: string;
  died_at: string | null;
}

export interface InteractionResult {
  momentum_added: number;
  time_added_seconds: number;
  credits_earned: number;
  new_momentum: number;
  new_expires_at: string;
}

export interface Me {
  id: string;
  handle: string;
  email: string | null;
  avatar_url: string | null;
  credits: number;
  resurrection_count: number;
}
