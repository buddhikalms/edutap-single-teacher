import { apiFormRequest, apiRequest } from "@/api/client";
import type { DashboardResponse, HomeworkItem, LiveClassesResponse, ProfileResponse, QuizItem, StudentSession } from "@/types/api";

export type StudentRegistrationInput = {
  instituteSlug: string;
  branchCode?: string;
  admissionNo?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  password: string;
  parentName: string;
  parentEmail?: string;
  parentPhone: string;
  parentOccupation?: string;
};

export function loginStudent(apiUrl: string, identifier: string, password: string) {
  return apiRequest<{ ok: true; token: string; student: StudentSession["student"] }>("/api/student-mobile/auth/login", {
    method: "POST",
    apiUrl,
    body: { identifier, password, platform: "expo" }
  });
}

export function registerStudent(apiUrl: string, input: StudentRegistrationInput) {
  return apiRequest<{ ok: true; message: string; student: { admissionNo: string; name: string } }>("/api/student-mobile/auth/register", {
    method: "POST",
    apiUrl,
    body: input
  });
}

export const getDashboard = () => apiRequest<DashboardResponse>("/api/student-mobile/dashboard");
export const getCourses = () => apiRequest<{ ok: true; courses: unknown[] }>("/api/student-mobile/courses");
export const getHomework = (status?: string) => apiRequest<{ ok: true; homework: HomeworkItem[] }>(`/api/student-mobile/homework${status ? `?status=${status}` : ""}`);
export const getHomeworkDetail = (id: string) => apiRequest<{ ok: true; homework: HomeworkItem & { submission: unknown; attachments: unknown[] } }>(`/api/student-mobile/homework/${id}`);
export const submitHomework = (id: string, answerText: string, attachmentUrl?: string) => apiRequest<{ ok: true; message: string }>(`/api/student-mobile/homework/${id}`, { method: "POST", body: { answerText, attachmentUrl } });
export const uploadHomeworkAttachment = (id: string, file: { uri: string; name?: string | null; mimeType?: string | null }) => {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name ?? "homework-attachment",
    type: file.mimeType ?? "application/octet-stream"
  } as unknown as Blob);

  return apiFormRequest<{ ok: true; url: string; name: string; size: number }>(`/api/student-mobile/homework/${id}/attachment`, formData);
};
export const getLiveClasses = () => apiRequest<LiveClassesResponse>("/api/student-mobile/live-classes");
export const joinLiveClass = (id: string) => apiRequest<{ ok: true; meetingUrl: string }>(`/api/student-mobile/live-classes/${id}/join`, { method: "POST" });
export const getQuizzes = () => apiRequest<{ ok: true; quizzes: QuizItem[] }>("/api/student-mobile/quizzes");
export const getQuiz = (id: string) => apiRequest<{ ok: true; quiz: QuizItem & { instructions?: string; questions: Array<{ id: string; type: string; prompt: string; marks: number; options: Array<{ id: string; label: string; text: string }> }> } }>(`/api/student-mobile/quizzes/${id}`);
export const startQuiz = (id: string) => apiRequest<{ ok: true; attemptId: string; startedAt: string }>(`/api/student-mobile/quizzes/${id}/start`, { method: "POST" });
export const saveAnswer = (attemptId: string, questionId: string, answer: { selectedOptionId?: string; answerText?: string }) => apiRequest<{ ok: true }>(`/api/student-mobile/quiz-attempts/${attemptId}/answers`, { method: "POST", body: { questionId, ...answer } });
export const submitQuiz = (attemptId: string) => apiRequest<{ ok: true; score: number; passed: boolean }>(`/api/student-mobile/quiz-attempts/${attemptId}/submit`, { method: "POST" });
export const getQuizResult = (attemptId: string) => apiRequest<{ ok: true; attempt: unknown }>(`/api/student-mobile/quiz-attempts/${attemptId}`);
export const getAttendance = () => apiRequest<{ ok: true; percentage: number; history: unknown[]; classWise: unknown[] }>("/api/student-mobile/attendance");
export const getPayments = () => apiRequest<{ ok: true; pendingAmount: number; payments: unknown[] }>("/api/student-mobile/payments");
export const getNotifications = () => apiRequest<{ ok: true; notifications: unknown[] }>("/api/student-mobile/notifications");
export const getProfile = () => apiRequest<ProfileResponse>("/api/student-mobile/profile");
