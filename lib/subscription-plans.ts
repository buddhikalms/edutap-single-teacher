import { SubscriptionPlanKey } from "@prisma/client";

export type PlanDefinition = {
  id: SubscriptionPlanKey;
  name: string;
  summary: string;
  price: number;
  yearlyPrice: number | null;
  studentLimit: number;
  teacherLimit: number;
  branchLimit: number;
  classLimit: number;
  courseLimit: number;
  storageLimitMb: number;
  smsCredits: number;
  liveClassAccess: boolean;
  parentNotificationAccess: boolean;
  customBrandingAccess: boolean;
  featured?: boolean;
};

export const planDefinitions: PlanDefinition[] = [
  {
    id: SubscriptionPlanKey.SINGLE_TEACHER,
    name: "Single Teacher EduTap",
    summary: "For one teacher running a focused learning business.",
    price: 29,
    yearlyPrice: 290,
    studentLimit: 300,
    teacherLimit: 1,
    branchLimit: 1,
    classLimit: 10,
    courseLimit: 5,
    storageLimitMb: 10240,
    smsCredits: 500,
    liveClassAccess: true,
    parentNotificationAccess: false,
    customBrandingAccess: false
  },
  {
    id: SubscriptionPlanKey.INSTITUTE_STARTER,
    name: "Institute Starter EduTap",
    summary: "For small institutes with parent notifications and rich resources.",
    price: 79,
    yearlyPrice: 790,
    studentLimit: 1000,
    teacherLimit: 5,
    branchLimit: 1,
    classLimit: 30,
    courseLimit: 20,
    storageLimitMb: 51200,
    smsCredits: 2500,
    liveClassAccess: false,
    parentNotificationAccess: true,
    customBrandingAccess: false,
    featured: true
  },
  {
    id: SubscriptionPlanKey.INSTITUTE_PRO,
    name: "Institute Pro EduTap",
    summary: "For scaled institutes with live classes, recordings, and advanced reports.",
    price: 199,
    yearlyPrice: 1990,
    studentLimit: 5000,
    teacherLimit: 20,
    branchLimit: 5,
    classLimit: 999999,
    courseLimit: 100,
    storageLimitMb: 256000,
    smsCredits: 15000,
    liveClassAccess: true,
    parentNotificationAccess: true,
    customBrandingAccess: true
  },
  {
    id: SubscriptionPlanKey.ENTERPRISE,
    name: "EduTap Enterprise",
    summary: "For education networks needing white-labeling, custom domains, and API access.",
    price: 0,
    yearlyPrice: null,
    studentLimit: 999999,
    teacherLimit: 999999,
    branchLimit: 999999,
    classLimit: 999999,
    courseLimit: 999999,
    storageLimitMb: 1024000,
    smsCredits: 100000,
    liveClassAccess: true,
    parentNotificationAccess: true,
    customBrandingAccess: true
  }
];

export function getPlanDefinition(plan: SubscriptionPlanKey) {
  const normalized = legacyPlanMap[plan] ?? plan;
  return planDefinitions.find((item) => item.id === normalized) ?? planDefinitions[1];
}

export const legacyPlanMap: Partial<Record<SubscriptionPlanKey, SubscriptionPlanKey>> = {
  [SubscriptionPlanKey.TEACHER]: SubscriptionPlanKey.SINGLE_TEACHER,
  [SubscriptionPlanKey.SMALL_INSTITUTE]: SubscriptionPlanKey.INSTITUTE_STARTER,
  [SubscriptionPlanKey.PREMIUM_INSTITUTE]: SubscriptionPlanKey.INSTITUTE_PRO
};
