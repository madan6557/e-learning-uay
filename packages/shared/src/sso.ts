/**
 * Contract between UAY SSO and E-Learning.
 *
 * Every name here is taken from the SSO database so the two systems share one
 * vocabulary: a column in SSO, a claim on the wire, and a column in E-Learning
 * all read the same. Technical Design v4.0 section 2.2 governs verification;
 * this module governs naming and projection.
 *
 * | SSO source                                   | Claim                | E-Learning column        |
 * | -------------------------------------------- | -------------------- | ------------------------ |
 * | users.user_id                                | sub                  | users.sso_user_id        |
 * | users.name                                   | name                 | users.name               |
 * | users.email                                  | email                | users.email              |
 * | users.user_type                              | user_type            | users.user_type          |
 * | users.status                                 | account_status       | users.status             |
 * | accounts.username                            | preferred_username   | users.username           |
 * | user_identifiers.identifier_type (primary)   | identifier_type      | users.identifier_type    |
 * | user_identifiers.identifier_value (primary)  | identifier_value     | users.identifier_value   |
 * | application_access -> roles.name             | roles[]              | users.role               |
 * | (E-Learning specific authorization scope)    | department_scopes    | users.department_scopes  |
 */
import { z } from "zod";

/** SSO `users.user_type`. */
export const USER_TYPES = ["STUDENT", "LECTURER", "STAFF", "ADMIN"] as const;
export type UserType = (typeof USER_TYPES)[number];

/** SSO `users.status` / `accounts.status`. */
export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** SSO `user_identifiers.identifier_type`. */
export const IDENTIFIER_TYPES = ["NIM", "NIP", "NIDN", "OTHER"] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

/** Role names registered for this application in SSO `roles`. */
export const APPLICATION_ROLES = [
  "SUPER_ADMIN",
  "DEPARTMENT_ADMIN",
  "INSTRUCTOR",
  "STUDENT",
] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

/** Most privileged first: SSO may grant several roles for one application. */
const ROLE_PRECEDENCE: readonly ApplicationRole[] = APPLICATION_ROLES;

export function highestRole(roles: readonly string[]): ApplicationRole | null {
  return ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

/**
 * Identifier kind implied by the directory type, used when SSO omits
 * `identifier_type` for a user that has only one identifier on file.
 */
export function defaultIdentifierType(userType: UserType): IdentifierType {
  if (userType === "STUDENT") return "NIM";
  if (userType === "LECTURER") return "NIDN";
  return "NIP";
}

/** Directory type implied by an application role, for the same reason. */
export function defaultUserType(role: ApplicationRole): UserType {
  if (role === "STUDENT") return "STUDENT";
  if (role === "INSTRUCTOR") return "LECTURER";
  if (role === "DEPARTMENT_ADMIN") return "STAFF";
  return "ADMIN";
}

const userType = z.enum(USER_TYPES);
const identifierType = z.enum(IDENTIFIER_TYPES);
const applicationRole = z.enum(APPLICATION_ROLES);

/**
 * Identity claims E-Learning reads from the SSO ID and access tokens.
 *
 * The legacy single-value aliases (`role`, `student_staff_number`) are accepted
 * so a deployment can migrate the issuer and this service independently; the
 * SSO-shaped names win whenever both are present.
 */
export const identityClaims = z
  .object({
    sub: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email(),
    preferred_username: z.string().min(1).optional(),
    user_type: userType.optional(),
    identifier_type: identifierType.optional(),
    identifier_value: z.string().min(1).optional(),
    roles: z.array(z.string()).optional(),
    role: applicationRole.optional(),
    student_staff_number: z.string().min(1).optional(),
    department_scopes: z.array(z.string()).default([]),
  })
  .transform((claims, ctx) => {
    const role = claims.role ?? highestRole(claims.roles ?? []);
    if (!role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No E-Learning role granted for this account",
        path: ["roles"],
      });
      return z.NEVER;
    }
    const identifierValue =
      claims.identifier_value ?? claims.student_staff_number;
    if (!identifierValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No academic identifier on this account",
        path: ["identifier_value"],
      });
      return z.NEVER;
    }
    const resolvedUserType = claims.user_type ?? defaultUserType(role);
    return {
      ssoUserId: claims.sub,
      name: claims.name,
      email: claims.email,
      username: claims.preferred_username ?? null,
      userType: resolvedUserType,
      identifierType:
        claims.identifier_type ?? defaultIdentifierType(resolvedUserType),
      identifierValue,
      role,
      departmentScopes: claims.department_scopes,
    };
  });

export type Identity = z.infer<typeof identityClaims>;
