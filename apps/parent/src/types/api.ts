export type ParentSession = {
  token: string;
  apiUrl: string;
  parent: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  students: Array<{
    id: string;
    admissionNo: string;
    name: string;
    branch?: { id: string; name: string } | null;
  }>;
};

export type PaymentItem = {
  id: string;
  month: string | null;
  className: string | null;
  dueDate: string;
  balance: number;
  status: string;
};

export type ParentNotification = {
  id: string;
  title: string;
  body: string;
  message: string;
  type: string;
  status: "UNREAD" | "READ";
  readAt: string | null;
  createdAt: string;
  actionUrl?: string | null;
  student: { id: string; admissionNo: string; name: string } | null;
  data: {
    studentName?: string;
    className?: string;
    branchName?: string;
    teacherName?: string | null;
    attendanceTime?: string;
    endTime?: string;
    attendanceStatus?: string;
    payment?: {
      pendingTotal?: number;
      overdueTotal?: number;
      nearestDueDate?: string | null;
      paymentStatus?: string;
      pendingItems?: PaymentItem[];
    };
  };
};
