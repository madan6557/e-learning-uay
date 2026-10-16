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
import { normalizeDepartmentCode } from "./departments.js";

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
  "RECTOR",
  "DEPARTMENT_ADMIN",
  "INSTRUCTOR",
  "ASSISTANT",
  "STUDENT",
] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];

/** Most privileged first: SSO may grant several roles for one application. */
const ROLE_PRECEDENCE: readonly ApplicationRole[] = APPLICATION_ROLES;

export function normalizeRole(raw: string): ApplicationRole | null {
  if (typeof raw !== "string") return null;
  const normalizedStr = raw
    .trim()
    .toUpperCase()
    .replace(/^\/+/, "") // strip leading / from Keycloak group paths like /Super Admin
    .replace(/[-_\s]+/g, "_"); // normalize hyphens, underscores, spaces to single underscore

  const clean = normalizedStr
    .replace(/^ROLE_/, "") // strip Spring / Keycloak ROLE_ prefix
    .replace(/^(ELEARNING_UAY_|ELEARNING_|LMS_|APP_)/, ""); // strip client/app prefix

  if (clean === "RECTOR" || clean === "REKTOR") return "RECTOR";

  if (
    clean === "SUPER_ADMIN" ||
    clean === "SUPERADMIN" ||
    clean === "ADMIN" ||
    clean === "ADMINISTRATOR" ||
    clean === "ADMIN_PUSAT" ||
    clean === "ADMIN_IT" ||
    clean === "REALM_ADMIN" ||
    clean === "ADMIN_ELEARNING" ||
    clean === "ELEARNING_ADMIN" ||
    clean === "ADMIN_LMS" ||
    clean === "LMS_ADMIN" ||
    clean === "APP_ADMIN" ||
    clean === "SYSADMIN" ||
    clean === "SYSTEM_ADMIN" ||
    clean === "SUPER_USER" ||
    clean === "SUPERUSER" ||
    clean === "MANAGE_USERS" ||
    clean === "MANAGE_REALM"
  ) {
    return "SUPER_ADMIN";
  }

  if (
    clean === "DEPARTMENT_ADMIN" ||
    clean === "DEPARTMENTADMIN" ||
    clean === "ADMIN_PRODI" ||
    clean === "ADMINPRODI" ||
    clean === "STAFF"
  ) {
    return "DEPARTMENT_ADMIN";
  }

  if (
    clean === "DOSEN" ||
    clean === "LECTURER" ||
    clean === "INSTRUCTOR" ||
    clean === "PENGAJAR"
  ) {
    return "INSTRUCTOR";
  }

  if (
    clean === "ASSISTANT" ||
    clean === "ASISTEN" ||
    clean === "ASDOS" ||
    clean === "ASISTEN_DOSEN" ||
    clean === "ASISTEN_LAB" ||
    clean === "LAB_ASSISTANT"
  ) {
    return "ASSISTANT";
  }

  if (clean === "MAHASISWA" || clean === "STUDENT") {
    return "STUDENT";
  }

  return null;
}

export function highestRole(roles: readonly string[]): ApplicationRole | null {
  const normalized = roles
    .map(normalizeRole)
    .filter((r): r is ApplicationRole => r !== null);
  return ROLE_PRECEDENCE.find((role) => normalized.includes(role)) ?? null;
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
  if (role === "RECTOR") return "STAFF";
  if (role === "STUDENT") return "STUDENT";
  if (role === "ASSISTANT") return "STUDENT";
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
    sub: z.string().min(1),
    name: z.string().min(1).optional(),
    email: z.string().optional(),
    preferred_username: z.string().min(1).optional(),
    user_type: userType.optional(),
    identifier_type: identifierType.optional(),
    identifier_value: z.string().min(1).optional(),
    official_identifier: z.string().min(1).optional(),
    roles: z.array(z.string()).optional(),
    role: z.string().optional(),
    student_staff_number: z.string().min(1).optional(),
    department_scopes: z.array(z.string()).default([]),
  })
  .transform((claims, ctx) => {
    // The legacy scalar is only a fallback for issuers that do not send the
    // application-specific roles claim. An explicit (even empty) roles list
    // must never be overridden by a conflicting legacy role.
    const role =
      claims.roles !== undefined
        ? highestRole(claims.roles)
        : claims.role
          ? normalizeRole(claims.role)
          : null;
    if (!role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No E-Learning role granted for this account",
        path: ["roles"],
      });
      return z.NEVER;
    }

    // 1. Parse official_identifier if available (e.g. "NIP 2111016210015", "NIDN 0412058001", "NIM 20260001", or "2111016210015")
    let officialType: IdentifierType | undefined;
    let officialValue: string | undefined;
    if (claims.official_identifier) {
      const trimmed = claims.official_identifier.trim();
      const match = trimmed.match(/^(NIM|NIP|NIDN)\s+(.+)$/i);
      if (match) {
        officialType = match[1].toUpperCase() as IdentifierType;
        officialValue = match[2].trim();
      } else {
        officialValue = trimmed;
      }
    }

    // 2. Determine raw identifier candidate
    let rawIdentifier =
      officialValue ??
      claims.identifier_value ??
      claims.student_staff_number ??
      claims.preferred_username ??
      claims.sub;

    // 3. If identifier is formatted like username (e.g. 2111016210015@staff.uay.ac.id), extract identifier part & domain
    let inferredTypeFromDomain: IdentifierType | undefined;
    let inferredUserTypeFromDomain: UserType | undefined;
    if (rawIdentifier && typeof rawIdentifier === "string" && rawIdentifier.includes("@")) {
      const parts = rawIdentifier.split("@");
      const domain = parts[1]?.toLowerCase();
      if (domain === "mhs.uay.ac.id") {
        inferredTypeFromDomain = "NIM";
        inferredUserTypeFromDomain = "STUDENT";
      } else if (domain === "dosen.uay.ac.id") {
        inferredTypeFromDomain = "NIDN";
        inferredUserTypeFromDomain = "LECTURER";
      } else if (domain === "staff.uay.ac.id") {
        inferredTypeFromDomain = "NIP";
        inferredUserTypeFromDomain = "STAFF";
      }
      rawIdentifier = parts[0].trim();
    }

    const resolvedUserType =
      claims.user_type ?? inferredUserTypeFromDomain ?? defaultUserType(role);

    const resolvedIdentifierType =
      claims.identifier_type ??
      officialType ??
      inferredTypeFromDomain ??
      defaultIdentifierType(resolvedUserType);

    const identifierValue = rawIdentifier;

    const name =
      claims.name && claims.name.trim().length > 0
        ? claims.name.trim()
        : (claims.preferred_username ?? "Pengguna UAY");

    let email =
      claims.email && claims.email.includes("@")
        ? claims.email.trim().toLowerCase()
        : `${String(claims.preferred_username ?? claims.sub).replace(/[^a-zA-Z0-9._-]/g, "")}@uay.ac.id`;

    return {
      ssoUserId: claims.sub,
      name,
      email,
      username: claims.preferred_username ?? null,
      userType: resolvedUserType,
      identifierType: resolvedIdentifierType,
      identifierValue,
      role,
      departmentScopes: [
        ...new Set(
          claims.department_scopes.map(normalizeDepartmentCode).filter(Boolean),
        ),
      ],
    };
  });

export type Identity = z.infer<typeof identityClaims>;

/**
 * Normalizes user data received from SSO API during administrative user sync.
 * Extracts official identifier (NIM/NIDN/NIP), maps localized user types,
 * and handles fallbacks gracefully.
 */
export function extractSsoUserData(ssoUser: any) {
  const email = (ssoUser.email || "").trim();
  const username = (
    ssoUser.username ||
    ssoUser.preferred_username ||
    ssoUser.account?.username ||
    ""
  ).trim();

  const primaryId =
    ssoUser.primary_identifier?.identifier_value ||
    ssoUser.identifier_value ||
    ssoUser.official_identifier ||
    ssoUser.student_staff_number ||
    (Array.isArray(ssoUser.user_identifiers)
      ? ssoUser.user_identifiers[0]?.identifier_value
      : null) ||
    (Array.isArray(ssoUser.identifiers)
      ? ssoUser.identifiers[0]?.identifier_value
      : null) ||
    username ||
    email.split("@")[0] ||
    String(ssoUser.user_id || ssoUser.id || "");

  const cleanIdentifierValue = String(primaryId).trim();

  const rawUserType = String(
    ssoUser.user_type || ssoUser.userType || "",
  ).toUpperCase();
  let userType: UserType = "STUDENT";
  if (
    rawUserType === "LECTURER" ||
    rawUserType === "DOSEN" ||
    rawUserType === "PENGAJAR"
  ) {
    userType = "LECTURER";
  } else if (
    rawUserType === "STAFF" ||
    rawUserType === "TENDIK" ||
    rawUserType === "KARYAWAN"
  ) {
    userType = "STAFF";
  } else if (
    rawUserType === "ADMIN" ||
    rawUserType === "SUPER_ADMIN" ||
    rawUserType === "ADMINISTRATOR"
  ) {
    userType = "ADMIN";
  }

  const rawIdType = String(
    ssoUser.primary_identifier?.identifier_type ||
      ssoUser.identifier_type ||
      (Array.isArray(ssoUser.user_identifiers)
        ? ssoUser.user_identifiers[0]?.identifier_type
        : null) ||
      "",
  ).toUpperCase();
  let identifierType: IdentifierType = defaultIdentifierType(userType);
  if (["NIM", "NIDN", "NIP", "OTHER"].includes(rawIdType)) {
    identifierType = rawIdType as any;
  }

  const ssoSub =
    ssoUser.account?.keycloak_user_id?.trim() ||
    ssoUser.keycloak_user_id?.trim() ||
    ssoUser.sub?.trim() ||
    null;

  const ssoUserId =
    ssoSub ||
    (ssoUser.user_id ? String(ssoUser.user_id).trim() : null) ||
    (ssoUser.id ? String(ssoUser.id).trim() : null);

  const name =
    ssoUser.name?.trim() ||
    ssoUser.full_name?.trim() ||
    [ssoUser.first_name, ssoUser.last_name].filter(Boolean).join(" ").trim() ||
    username ||
    cleanIdentifierValue;

  return {
    username,
    email,
    identifierValue: cleanIdentifierValue,
    identifierType,
    userType,
    ssoSub,
    ssoUserId,
    name,
  };
}
