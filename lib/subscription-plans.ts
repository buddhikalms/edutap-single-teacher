import { SubscriptionPlan } from "@prisma/client";

export type PlanDefinition = {
  id: SubscriptionPlan;
  name: string;
  summary: string;
  price: number;
  studentLimit: number;
  teacherLimit: number;
  branchLimit: number;
  smsCredits: number;
  featured?: boolean;
};

export const planDefinitions: PlanDefinition[] = [
  {
    id: SubscriptionPlan.TEACHER,
    name: "Teacher Plan",
    summary: "For individual teachers running a focused student roster.",
    price: 29,
    studentLimit: 120,
    teacherLimit: 3,
    branchLimit: 1,
    smsCredits: 500
  },
  {
    id: SubscriptionPlan.SMALL_INSTITUTE,
    name: "Small Institute Plan",
    summary: "For growing institutes with multiple teachers and one to three branches.",
    price: 79,
    studentLimit: 500,
    teacherLimit: 25,
    branchLimit: 3,
    smsCredits: 2500,
    featured: true
  },
  {
    id: SubscriptionPlan.PREMIUM_INSTITUTE,
    name: "Premium Institute Plan",
    summary: "For scaled operations needing deep capacity, messaging, and branch control.",
    price: 199,
    studentLimit: 2000,
    teacherLimit: 100,
    branchLimit: 10,
    smsCredits: 15000
  }
];

export function getPlanDefinition(plan: SubscriptionPlan) {
  return planDefinitions.find((item) => item.id === plan) ?? planDefinitions[1];
}
