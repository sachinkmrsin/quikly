export interface ApiResopnse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResopnse<T> {
  data: T[];
  total: number;
  perPage: number;
  currentPage: number;
  maxPages: number;
}
