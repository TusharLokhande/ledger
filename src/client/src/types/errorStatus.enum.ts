export const ErrorStatus = {
  NoError: -1,
  Duplicate: 1,
  NotFound: 2,
  InvalidCred: 3,
  UnAuthorized: 5,
  InternalServerError: 6,
  ValidationError: 7,
  TokenExpired: 8,
  Forbidden: 9,
} as const;

export type ErrorStatus = (typeof ErrorStatus)[keyof typeof ErrorStatus];
