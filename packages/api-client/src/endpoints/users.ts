import type { User } from '@cirvia/types';

import type { CirviaClient } from '../client';
import type { UpdateProfileInput } from '../types';

export function makeUsersEndpoints(client: CirviaClient) {
  return {
    get(userId: string): Promise<User> {
      return client.request(`/users/${userId}`);
    },

    updateProfile(data: UpdateProfileInput): Promise<User> {
      return client.request('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    uploadAvatar(formData: FormData): Promise<User> {
      return client.request('/users/me/avatar', {
        method: 'POST',
        headers: {},
        body: formData,
      });
    },

    deleteAccount(): Promise<void> {
      return client.request('/users/me', { method: 'DELETE' });
    },
  };
}
