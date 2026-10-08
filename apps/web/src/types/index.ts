import type { ApplicationRole } from "../../../../packages/shared/src/sso";

export type Role = ApplicationRole;

export interface CurrentUser {
  id: string;
  name: string;
  role: ApplicationRole;
  identifierType?: string | null;
  identifierValue?: string | null;
  departmentScopes?: string[];
  departmentCode?: string | null;
  email?: string | null;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  departmentCode?: string | null;
  status?: string;
  _count?: {
    classes?: number;
    questionBanks?: number;
  };
}

export interface CourseClass {
  id: string;
  slug?: string;
  name: string;
  academicYear: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  gradeScaleVersion?: string | null;
  gradeScalePolicy?: any;
  course: Course;
  instructors: Array<{ user: { id: string; name: string } }>;
  sections?: any[];
  canManage?: boolean;
  isInactiveParticipant?: boolean;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  body: string;
  category: "GENERAL" | "ACADEMIC" | "SYSTEM" | "EMERGENCY";
  scope: "GLOBAL" | "DEPARTMENT";
  departmentCode?: string | null;
  isPinned: boolean;
  publishedAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
}
