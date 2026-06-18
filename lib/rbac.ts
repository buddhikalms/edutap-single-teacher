export const roleAccess = {
  dashboard: ["SUPER_ADMIN", "INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  students: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  teachers: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "STAFF"],
  grades: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  classes: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  enrollment: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "STAFF"],
  attendance: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  cards: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  payments: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "STAFF"],
  homework: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  quizzes: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  liveClasses: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  reports: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  settings: ["INSTITUTE_ADMIN", "BRANCH_ADMIN"],
  billing: ["INSTITUTE_ADMIN"],
  notifications: ["INSTITUTE_ADMIN", "BRANCH_ADMIN", "TEACHER", "STAFF"],
  admin: ["SUPER_ADMIN"]
} as const;

export function canAccess(role: string | undefined, area: keyof typeof roleAccess) {
  if (!role) {
    return false;
  }

  return (roleAccess[area] as readonly string[]).includes(role);
}
