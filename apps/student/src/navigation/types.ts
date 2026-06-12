export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Courses: undefined;
  LiveClasses: undefined;
  Homework: undefined;
  HomeworkDetail: { homeworkId: string };
  Quizzes: undefined;
  QuizTake: { quizId: string };
  QuizResult: { attemptId: string };
  Attendance: undefined;
  Payments: undefined;
  Notifications: undefined;
  Profile: undefined;
};
