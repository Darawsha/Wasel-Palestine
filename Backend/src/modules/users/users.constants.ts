import { User } from './entities/user.entity';

export type SafeUserResponse = {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  role: User['role'];
  phone?: string | null;
  address?: string | null;
  profileImage?: string | null;
  profileImageUpdatedAt?: Date | null;
  provider?: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toSafeUserResponse(user: User): SafeUserResponse {
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    address: user.address ?? null,
    profileImage: user.profileImage ?? null,
    profileImageUpdatedAt: user.profileImageUpdatedAt ?? null,
    provider: user.provider ?? null,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
