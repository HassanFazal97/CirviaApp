export const getToken = (): string => localStorage.getItem('access_token') ?? '';

export const setAuth = (token: string, role: string): void => {
  localStorage.setItem('access_token', token);
  localStorage.setItem('user_role', role);
};

export const clearAuth = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_role');
};

export const isAdmin = (): boolean => localStorage.getItem('user_role') === 'admin';
