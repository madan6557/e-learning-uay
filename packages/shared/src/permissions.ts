import type { ApplicationRole } from "./sso.js";

/**
 * Formal capability/permission identifiers for E-Learning UAY.
 * Enforces separation between administrative management, pedagogical authoring,
 * grading authority, and student participation.
 */
export type Permission =
  // System & Global Governance
  | "MANAGE_SYSTEM_SETTINGS"
  | "VIEW_RECTOR_ANALYTICS"
  | "AUDIT_LOG_VIEW"

  // Catalog
  | "MANAGE_ALL_CATALOG"
  | "MANAGE_DEPT_CATALOG"

  // Classes Management
  | "MANAGE_ALL_CLASSES"
  | "MANAGE_DEPT_CLASSES"
  | "JOIN_CLASS_WITH_KEY"

  // Class Content Assistance & Authoring (Sections, Resources, Question Banks, Quizzes/Assignments drafting)
  | "MANAGE_CLASS_CONTENT"

  // Grading & Assessment Scoring (Strictly exclusive to assigned Instructors)
  | "GRADE_STUDENT_WORK"
  | "PUBLISH_GRADES"
  | "MANAGE_GRADEBOOK_WEIGHTS"
  | "LOCK_GRADEBOOK"
  | "EXPORT_DEPT_GRADES"
  | "EXPORT_ALL_GRADES"

  // Student Actions
  | "TAKE_ASSESSMENT"
  | "SUBMIT_ASSIGNMENT"
  | "CHECK_IN_ATTENDANCE"
  | "VIEW_OWN_GRADES"

  // Announcements / Circulars
  | "PUBLISH_GLOBAL_ANNOUNCEMENTS"
  | "PUBLISH_DEPT_ANNOUNCEMENTS"
  | "READ_ANNOUNCEMENTS"

  // General
  | "VIEW_PROFILE"
  | "ACCESS_HELP";

/**
 * Master mapping of roles to granted permissions.
 */
export const ROLE_PERMISSIONS: Record<ApplicationRole, readonly Permission[]> = {
  SUPER_ADMIN: [
    "MANAGE_SYSTEM_SETTINGS",
    "VIEW_RECTOR_ANALYTICS",
    "AUDIT_LOG_VIEW",
    "MANAGE_ALL_CATALOG",
    "MANAGE_DEPT_CATALOG",
    "MANAGE_ALL_CLASSES",
    "EXPORT_ALL_GRADES",
    "EXPORT_DEPT_GRADES",
    "PUBLISH_GLOBAL_ANNOUNCEMENTS",
    "PUBLISH_DEPT_ANNOUNCEMENTS",
    "READ_ANNOUNCEMENTS",
    "VIEW_PROFILE",
    "ACCESS_HELP",
  ],

  RECTOR: [
    "VIEW_RECTOR_ANALYTICS",
    "READ_ANNOUNCEMENTS",
    "VIEW_PROFILE",
    "ACCESS_HELP",
  ],

  DEPARTMENT_ADMIN: [
    "MANAGE_DEPT_CATALOG",
    "MANAGE_DEPT_CLASSES",
    // Department Admin can assist filling class content (sections, resources, quizzes/assignments structure)
    "MANAGE_CLASS_CONTENT",
    // NOTE: Department Admin is strictly FORBIDDEN from grading actions (GRADE_STUDENT_WORK, PUBLISH_GRADES, etc.)
    "EXPORT_DEPT_GRADES",
    "PUBLISH_DEPT_ANNOUNCEMENTS",
    "READ_ANNOUNCEMENTS",
    "VIEW_PROFILE",
    "ACCESS_HELP",
  ],

  INSTRUCTOR: [
    "MANAGE_CLASS_CONTENT",
    // Instructors hold exclusive authority for grading and scoring
    "GRADE_STUDENT_WORK",
    "PUBLISH_GRADES",
    "MANAGE_GRADEBOOK_WEIGHTS",
    "LOCK_GRADEBOOK",
    "READ_ANNOUNCEMENTS",
    "VIEW_PROFILE",
    "ACCESS_HELP",
  ],

  STUDENT: [
    "JOIN_CLASS_WITH_KEY",
    "TAKE_ASSESSMENT",
    "SUBMIT_ASSIGNMENT",
    "CHECK_IN_ATTENDANCE",
    "VIEW_OWN_GRADES",
    "READ_ANNOUNCEMENTS",
    "VIEW_PROFILE",
    "ACCESS_HELP",
  ],
};

/**
 * Checks whether a role possesses a specific permission.
 */
export function hasPermission(role: ApplicationRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

/**
 * Verifies whether a user can manage actions within a specific department code.
 */
export function canManageDepartmentScope(
  userRole: ApplicationRole,
  userScopes: readonly string[] = [],
  targetDepartmentCode?: string,
): boolean {
  if (userRole === "SUPER_ADMIN") return true;
  if (!targetDepartmentCode) return false;
  if (userRole === "DEPARTMENT_ADMIN") {
    return userScopes.includes(targetDepartmentCode);
  }
  return false;
}

/**
 * Verifies whether a user is authorized to manage class content (topics, materials, quizzes, assignments).
 * True for:
 * 1. Assigned Instructor of the class.
 * 2. Department Admin whose scope matches the class department.
 * (Super Admin manages catalog & policy, not classroom content).
 */
export function canManageClassContent(
  user: { role: string; id?: string; departmentScopes?: readonly string[] },
  classDetails: { courseDepartmentCode: string; instructorUserIds?: readonly string[] },
): boolean {
  if (user.role === "INSTRUCTOR") {
    return Boolean(
      classDetails.instructorUserIds &&
        user.id &&
        classDetails.instructorUserIds.includes(user.id),
    );
  }
  if (user.role === "DEPARTMENT_ADMIN") {
    return Boolean(
      user.departmentScopes &&
        user.departmentScopes.includes(classDetails.courseDepartmentCode),
    );
  }
  return false;
}

/**
 * Verifies whether a user has grading authority over student attempts/submissions.
 * Strictly exclusive to assigned Instructors (Department Admins and Super Admins are forbidden).
 */
export function canGradeClassWork(
  user: { role: string; id?: string },
  isClassInstructor = false,
): boolean {
  return user.role === "INSTRUCTOR" && isClassInstructor;
}

/**
 * Determines whether a user role can access a web navigation section.
 */
export function canAccessNavigationSection(
  role: ApplicationRole,
  section: string,
): boolean {
  switch (section) {
    case "rector":
      return ["RECTOR", "SUPER_ADMIN"].includes(role);
    case "catalog":
      return ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(role);
    case "dashboard":
    case "classes":
    case "agenda":
    case "grades":
    case "notifications":
      return role !== "RECTOR";
    case "announcements":
    case "profile":
    case "help":
      return true; // Accessible by all roles
    default:
      return true;
  }
}
