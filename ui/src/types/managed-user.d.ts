export interface Role {
  id: number;
  name: string;
}

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  roles: Role[];
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roles: Role[];
}

export interface UpdateUserRequest {
  id: number;
  username: string;
  email: string;
  password?: string;
  roles: Role[];
}
