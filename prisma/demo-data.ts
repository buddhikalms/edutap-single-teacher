import {
  AttendanceSource,
  AttendanceStatus,
  AttendanceSessionStatus,
  HomeworkStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  QuizQuestionType,
  QuizStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const demoPassword = "ClassCard@2026";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function upsertUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  instituteId?: string;
  branchId?: string;
}) {
  return prisma.user.upsert({
    where: { email: data.email },
    create: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      instituteId: data.instituteId,
      branchId: data.branchId
    },
    update: {
      name: data.name,
      passwordHash: data.passwordHash,
      role: data.role,
      instituteId: data.instituteId,
      branchId: data.branchId
    }
  });
}

async function upsertParent(data: {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  instituteId: string;
  branchId: string;
  passwordHash: string;
}) {
  const parentUser = await upsertUser({
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: UserRole.PARENT,
    instituteId: data.instituteId,
    branchId: data.branchId
  });

  const existing = await prisma.parent.findFirst({
    where: { instituteId: data.instituteId, phone: data.phone }
  });

  if (existing) {
    return prisma.parent.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        email: data.email,
        occupation: data.occupation,
        userId: parentUser.id
      }
    });
  }

  return prisma.parent.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      occupation: data.occupation,
      userId: parentUser.id,
      instituteId: data.instituteId
    }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const today = startOfDay(new Date());
  const currentMonth = monthKey(today);
  const previousMonth = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));

  const superAdmin = await upsertUser({
    name: "Ariana Wells",
    email: "super@classcard.test",
    passwordHash,
    role: UserRole.SUPER_ADMIN
  });

  const institute = await prisma.institute.upsert({
    where: { slug: "classcard-demo" },
    create: {
      name: "ClassCard Demo Academy",
      slug: "classcard-demo",
      email: "hello@classcard.test",
      phone: "+1 555 010 2026",
      address: "1200 Meridian Avenue, Suite 18, New York",
      active: true
    },
    update: {
      name: "ClassCard Demo Academy",
      email: "hello@classcard.test",
      phone: "+1 555 010 2026",
      address: "1200 Meridian Avenue, Suite 18, New York",
      active: true
    }
  });

  await prisma.instituteSettings.upsert({
    where: { instituteId: institute.id },
    create: {
      instituteId: institute.id,
      receiptPrefix: "CCD",
      receiptFooter: "Thank you for choosing ClassCard Demo Academy.",
      paymentDueDay: 10,
      attendanceLateAfterMins: 15,
      attendanceAutoAbsent: true,
      currency: "USD",
      themeColor: "#0f766e",
      logoPlaceholder: "Upload logo"
    },
    update: {
      receiptPrefix: "CCD",
      receiptFooter: "Thank you for choosing ClassCard Demo Academy.",
      paymentDueDay: 10,
      attendanceLateAfterMins: 15,
      attendanceAutoAbsent: true,
      currency: "USD",
      themeColor: "#0f766e",
      logoPlaceholder: "Upload logo"
    }
  });

  await prisma.instituteSubscription.upsert({
    where: { instituteId: institute.id },
    create: {
      instituteId: institute.id,
      plan: SubscriptionPlan.SMALL_INSTITUTE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(today, 24),
      monthlyPrice: "79.00",
      studentLimit: 500,
      teacherLimit: 25,
      branchLimit: 3,
      smsCredits: 2500
    },
    update: {
      plan: SubscriptionPlan.SMALL_INSTITUTE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(today, 24),
      monthlyPrice: "79.00",
      studentLimit: 500,
      teacherLimit: 25,
      branchLimit: 3,
      smsCredits: 2500
    }
  });

  await Promise.all([
    prisma.institute.upsert({
      where: { slug: "northstar-tutors" },
      create: {
        name: "Northstar Tutors",
        slug: "northstar-tutors",
        email: "hello@northstar.test",
        phone: "+1 555 031 1010",
        address: "44 Cedar Street, Boston",
        active: true,
        settings: { create: { receiptPrefix: "NST", currency: "USD", paymentDueDay: 7, themeColor: "#2563eb" } },
        subscription: {
          create: {
            plan: SubscriptionPlan.TEACHER,
            status: SubscriptionStatus.TRIAL,
            currentPeriodEnd: addDays(today, 9),
            monthlyPrice: "29.00",
            studentLimit: 120,
            teacherLimit: 3,
            branchLimit: 1,
            smsCredits: 500
          }
        }
      },
      update: { active: true }
    }),
    prisma.institute.upsert({
      where: { slug: "summit-learning-hub" },
      create: {
        name: "Summit Learning Hub",
        slug: "summit-learning-hub",
        email: "ops@summit.test",
        phone: "+1 555 042 1111",
        address: "88 Lakeview Road, Chicago",
        active: false,
        settings: { create: { receiptPrefix: "SLH", currency: "USD", paymentDueDay: 5, themeColor: "#be123c" } },
        subscription: {
          create: {
            plan: SubscriptionPlan.PREMIUM_INSTITUTE,
            status: SubscriptionStatus.SUSPENDED,
            currentPeriodEnd: addDays(today, -5),
            monthlyPrice: "199.00",
            studentLimit: 2000,
            teacherLimit: 100,
            branchLimit: 10,
            smsCredits: 15000
          }
        }
      },
      update: { active: false }
    })
  ]);

  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { instituteId_code: { instituteId: institute.id, code: "CC" } },
      create: {
        name: "Central Campus",
        code: "CC",
        address: "1200 Meridian Avenue",
        phone: "+1 555 010 2027",
        instituteId: institute.id
      },
      update: {
        name: "Central Campus",
        address: "1200 Meridian Avenue",
        phone: "+1 555 010 2027"
      }
    }),
    prisma.branch.upsert({
      where: { instituteId_code: { instituteId: institute.id, code: "NV" } },
      create: {
        name: "Northview Branch",
        code: "NV",
        address: "21 Northview Plaza",
        phone: "+1 555 010 2028",
        instituteId: institute.id
      },
      update: {
        name: "Northview Branch",
        address: "21 Northview Plaza",
        phone: "+1 555 010 2028"
      }
    })
  ]);
  const [centralBranch, northviewBranch] = branches;

  const admin = await upsertUser({
    name: "Maya Bennett",
    email: "admin@classcard.test",
    passwordHash,
    role: UserRole.INSTITUTE_ADMIN,
    instituteId: institute.id,
    branchId: centralBranch.id
  });

  const teacherSeeds = [
    ["Elena Brooks", "elena@classcard.test", "+1 555 011 0101", "Mathematics", centralBranch.id],
    ["Noah Hart", "noah@classcard.test", "+1 555 011 0102", "Physics", centralBranch.id],
    ["Priya Raman", "priya@classcard.test", "+1 555 011 0103", "English Literature", northviewBranch.id],
    ["Marcus Chen", "marcus@classcard.test", "+1 555 011 0104", "Chemistry", northviewBranch.id],
    ["Ivy Carter", "ivy@classcard.test", "+1 555 011 0105", "Biology", centralBranch.id]
  ] as const;

  const teachers = await Promise.all(
    teacherSeeds.map(async ([name, email, phone, specialty, branchId]) => {
      const user = await upsertUser({
        name,
        email,
        passwordHash,
        role: UserRole.TEACHER,
        instituteId: institute.id,
        branchId
      });

      return prisma.teacher.upsert({
        where: { instituteId_email: { instituteId: institute.id, email } },
        create: { name, email, phone, specialty, userId: user.id, instituteId: institute.id, branchId },
        update: { name, phone, specialty, userId: user.id, branchId }
      });
    })
  );

  const courseSeeds = [
    ["Advanced Mathematics", "MATH-A", "Mathematics", "Grade 10", "Premium exam-focused mathematics coaching.", "185.00"],
    ["Physics Mastery", "PHY-M", "Physics", "Grade 11", "Conceptual physics with weekly assessments.", "210.00"],
    ["Academic English", "ENG-A", "English", "Scholars", "Writing, comprehension, and public speaking.", "160.00"],
    ["Chemistry Lab Intensive", "CHEM-L", "Chemistry", "Grade 11", "Structured practicals and theory revision.", "220.00"],
    ["Biology Fast Track", "BIO-F", "Biology", "Grade 12", "High-yield biology revision with model papers.", "195.00"]
  ] as const;

  const courses = await Promise.all(
    courseSeeds.map(([name, code, subject, grade, description, fee]) =>
      prisma.course.upsert({
        where: { instituteId_code: { instituteId: institute.id, code } },
        create: { name, code, subject, grade, description, fee, instituteId: institute.id },
        update: { name, subject, grade, description, fee }
      })
    )
  );

  const classSeeds = [
    ["Grade 10 Alpha", "G10-A", "Mon, Wed 16:00-18:00", "Studio 2", 32, centralBranch.id, courses[0].id, teachers[0].id],
    ["Grade 11 Physics Elite", "G11-PHY", "Tue, Thu 17:00-19:00", "Lab 1", 28, centralBranch.id, courses[1].id, teachers[1].id],
    ["English Scholars", "ENG-S", "Sat 09:00-12:00", "Studio 4", 24, northviewBranch.id, courses[2].id, teachers[2].id],
    ["Chemistry Weekend Lab", "CHEM-W", "Sun 08:30-11:30", "Lab 3", 26, northviewBranch.id, courses[3].id, teachers[3].id],
    ["Biology Rapid Revision", "BIO-R", "Fri 15:30-18:30", "Studio 1", 30, centralBranch.id, courses[4].id, teachers[4].id]
  ] as const;

  const classGroups = await Promise.all(
    classSeeds.map(([name, code, schedule, room, capacity, branchId, courseId, teacherId]) =>
      prisma.classGroup.upsert({
        where: { instituteId_code: { instituteId: institute.id, code } },
        create: { name, code, schedule, room, capacity, instituteId: institute.id, branchId, courseId, teacherId },
        update: { name, schedule, room, capacity, branchId, courseId, teacherId }
      })
    )
  );

  const parents = await Promise.all([
    upsertParent({
      name: "Avery Collins",
      email: "avery.parent@classcard.test",
      phone: "+1 555 012 0001",
      occupation: "Architect",
      instituteId: institute.id,
      branchId: centralBranch.id,
      passwordHash
    }),
    upsertParent({
      name: "Jordan Lee",
      email: "jordan.parent@classcard.test",
      phone: "+1 555 012 0002",
      occupation: "Consultant",
      instituteId: institute.id,
      branchId: centralBranch.id,
      passwordHash
    }),
    upsertParent({
      name: "Nadia Patel",
      email: "nadia.parent@classcard.test",
      phone: "+1 555 012 0003",
      occupation: "Product Manager",
      instituteId: institute.id,
      branchId: northviewBranch.id,
      passwordHash
    }),
    upsertParent({
      name: "Daniel Wright",
      email: "daniel.parent@classcard.test",
      phone: "+1 555 012 0004",
      occupation: "Civil Engineer",
      instituteId: institute.id,
      branchId: northviewBranch.id,
      passwordHash
    })
  ]);

  const studentSeeds = [
    ["CC-1001", "Sofia", "Collins", parents[0].id, centralBranch.id, "045323E3380289"],
    ["CC-1002", "Liam", "Lee", parents[1].id, centralBranch.id, "NFC-DEMO-0002"],
    ["CC-1003", "Amara", "Stone", parents[0].id, northviewBranch.id, "NFC-DEMO-0003"],
    ["CC-1004", "Ethan", "Wright", parents[3].id, northviewBranch.id, "NFC-DEMO-0004"],
    ["CC-1005", "Nora", "Patel", parents[2].id, centralBranch.id, "NFC-DEMO-0005"],
    ["CC-1006", "Kai", "Morgan", parents[1].id, northviewBranch.id, "NFC-DEMO-0006"],
    ["CC-1007", "Mila", "Rivera", parents[2].id, centralBranch.id, "NFC-DEMO-0007"],
    ["CC-1008", "Owen", "Baker", parents[3].id, centralBranch.id, "NFC-DEMO-0008"],
    ["CC-1009", "Zara", "Ibrahim", parents[0].id, northviewBranch.id, "NFC-DEMO-0009"],
    ["CC-1010", "Leo", "Fernandez", parents[1].id, centralBranch.id, "NFC-DEMO-0010"],
    ["CC-1011", "Anika", "Shah", parents[2].id, northviewBranch.id, "NFC-DEMO-0011"],
    ["CC-1012", "Caleb", "Moore", parents[3].id, centralBranch.id, "NFC-DEMO-0012"]
  ] as const;

  const students = await Promise.all(
    studentSeeds.map(async ([admissionNo, firstName, lastName, parentId, branchId, nfcUid]) => {
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.test`;
      const studentUser = await upsertUser({
        name: `${firstName} ${lastName}`,
        email,
        passwordHash,
        role: UserRole.STUDENT,
        instituteId: institute.id,
        branchId
      });

      return prisma.student.upsert({
        where: { instituteId_admissionNo: { instituteId: institute.id, admissionNo } },
        create: {
          admissionNo,
          firstName,
          lastName,
          email,
          phone: "+1 555 013 0000",
          nfcUid,
          qrCode: `QR-${admissionNo}`,
          attendanceToken: randomUUID(),
          userId: studentUser.id,
          instituteId: institute.id,
          branchId,
          parents: { connect: [{ id: parentId }] }
        },
        update: {
          firstName,
          lastName,
          email,
          phone: "+1 555 013 0000",
          nfcUid,
          qrCode: `QR-${admissionNo}`,
          userId: studentUser.id,
          branchId,
          parents: { connect: [{ id: parentId }] }
        }
      });
    })
  );

  for (const [index, student] of students.entries()) {
    const primaryClass = classGroups[index % classGroups.length];
    await prisma.enrollment.upsert({
      where: { studentId_classGroupId: { studentId: student.id, classGroupId: primaryClass.id } },
      create: { studentId: student.id, classGroupId: primaryClass.id },
      update: { active: true }
    });

    if (index % 3 === 0) {
      const secondaryClass = classGroups[(index + 2) % classGroups.length];
      await prisma.enrollment.upsert({
        where: { studentId_classGroupId: { studentId: student.id, classGroupId: secondaryClass.id } },
        create: { studentId: student.id, classGroupId: secondaryClass.id },
        update: { active: true }
      });
    }
  }

  for (const [classIndex, classGroup] of classGroups.entries()) {
    const enrolled = await prisma.enrollment.findMany({
      where: { classGroupId: classGroup.id, active: true },
      select: { studentId: true },
      take: 18
    });

    for (let dayOffset = -10; dayOffset <= 0; dayOffset += 2) {
      const sessionDate = startOfDay(addDays(today, dayOffset + classIndex));
      const startsAt = new Date(sessionDate.getTime() + (15 + (classIndex % 3)) * 60 * 60 * 1000);
      const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
      const session = await prisma.attendanceSession.upsert({
        where: { classGroupId_sessionDate: { classGroupId: classGroup.id, sessionDate } },
        create: {
          classGroupId: classGroup.id,
          sessionDate,
          startsAt,
          endsAt,
          status: dayOffset < 0 ? AttendanceSessionStatus.ENDED : AttendanceSessionStatus.ACTIVE,
          notes: "Demo attendance session"
        },
        update: {
          startsAt,
          endsAt,
          status: dayOffset < 0 ? AttendanceSessionStatus.ENDED : AttendanceSessionStatus.ACTIVE,
          notes: "Demo attendance session"
        }
      });

      for (const [studentIndex, enrollment] of enrolled.entries()) {
        const cycle = (studentIndex + classIndex + Math.abs(dayOffset)) % 10;
        const status = cycle === 0 ? AttendanceStatus.ABSENT : cycle <= 2 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
        await prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: enrollment.studentId } },
          create: {
            sessionId: session.id,
            studentId: enrollment.studentId,
            status,
            source: studentIndex % 4 === 0 ? AttendanceSource.QR : AttendanceSource.MANUAL,
            markedAt: new Date(startsAt.getTime() + (studentIndex + 2) * 7 * 60 * 1000)
          },
          update: {
            status,
            source: studentIndex % 4 === 0 ? AttendanceSource.QR : AttendanceSource.MANUAL
          }
        });
      }
    }
  }

  let invoiceCounter = 1;
  for (const [studentIndex, student] of students.entries()) {
    const classGroup = classGroups[studentIndex % classGroups.length];
    const courseFee = Number(courses[studentIndex % courses.length].fee);
    const invoices = [
      {
        month: previousMonth,
        amount: courseFee,
        paidAmount: courseFee,
        balance: 0,
        status: PaymentStatus.PAID,
        method: studentIndex % 2 === 0 ? PaymentMethod.CARD : PaymentMethod.CASH,
        dueDate: addDays(today, -32),
        paidAt: addDays(today, -24)
      },
      {
        month: currentMonth,
        amount: courseFee,
        paidAmount: studentIndex % 4 === 0 ? Math.round(courseFee / 2) : studentIndex % 5 === 0 ? 0 : courseFee,
        balance: studentIndex % 4 === 0 ? Math.round(courseFee / 2) : studentIndex % 5 === 0 ? courseFee : 0,
        status: studentIndex % 4 === 0 ? PaymentStatus.PARTIAL : studentIndex % 5 === 0 ? PaymentStatus.OVERDUE : PaymentStatus.PAID,
        method: studentIndex % 3 === 0 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
        dueDate: addDays(today, studentIndex % 5 === 0 ? -4 : 8),
        paidAt: studentIndex % 5 === 0 ? null : addDays(today, -studentIndex)
      }
    ];

    for (const invoice of invoices) {
      const invoiceNo = `DEMO-INV-${String(invoiceCounter).padStart(4, "0")}`;
      invoiceCounter += 1;
      const payment = await prisma.payment.upsert({
        where: { instituteId_invoiceNo: { instituteId: institute.id, invoiceNo } },
        create: {
          invoiceNo,
          type: "MONTHLY_FEE",
          month: invoice.month,
          amount: invoice.amount.toFixed(2),
          discount: "0.00",
          paidAmount: invoice.paidAmount.toFixed(2),
          balance: invoice.balance.toFixed(2),
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
          status: invoice.status,
          method: invoice.method,
          receivedBy: invoice.paidAmount > 0 ? "Maya Bennett" : null,
          instituteId: institute.id,
          studentId: student.id,
          classGroupId: classGroup.id
        },
        update: {
          month: invoice.month,
          amount: invoice.amount.toFixed(2),
          paidAmount: invoice.paidAmount.toFixed(2),
          balance: invoice.balance.toFixed(2),
          dueDate: invoice.dueDate,
          paidAt: invoice.paidAt,
          status: invoice.status,
          method: invoice.method,
          receivedBy: invoice.paidAmount > 0 ? "Maya Bennett" : null,
          studentId: student.id,
          classGroupId: classGroup.id
        }
      });

      if (invoice.paidAmount > 0) {
        const receiptNo = invoiceNo.replace("DEMO-INV", "DEMO-RCT");
        await prisma.receipt.upsert({
          where: { instituteId_receiptNo: { instituteId: institute.id, receiptNo } },
          create: {
            receiptNo,
            amount: invoice.paidAmount.toFixed(2),
            receivedBy: "Maya Bennett",
            paymentId: payment.id,
            instituteId: institute.id
          },
          update: {
            amount: invoice.paidAmount.toFixed(2),
            receivedBy: "Maya Bennett",
            paymentId: payment.id
          }
        });
      }
    }
  }

  await Promise.all(
    classGroups.map((classGroup) =>
      prisma.courseMaterial.upsert({
        where: { id: `demo-material-${classGroup.code.toLowerCase()}` },
        create: {
          id: `demo-material-${classGroup.code.toLowerCase()}`,
          instituteId: institute.id,
          classGroupId: classGroup.id,
          courseId: classGroup.courseId,
          createdById: admin.id,
          title: `${classGroup.name} revision pack`,
          description: "Demo course material for the student app.",
          type: "LINK",
          url: `https://classcard.test/materials/${classGroup.code.toLowerCase()}`
        },
        update: {
          title: `${classGroup.name} revision pack`,
          description: "Demo course material for the student app.",
          url: `https://classcard.test/materials/${classGroup.code.toLowerCase()}`
        }
      })
    )
  );

  const homeworkSeeds = [
    {
      title: "Algebra practice worksheet",
      description: "Complete all algebra simplification problems and upload your working.",
      classGroup: classGroups[0],
      course: courses[0],
      deadline: addDays(today, 3),
      marks: 20
    },
    {
      title: "Physics motion case study",
      description: "Write a short explanation of velocity-time graph interpretation.",
      classGroup: classGroups[1],
      course: courses[1],
      deadline: addDays(today, 5),
      marks: 15
    },
    {
      title: "Essay paragraph draft",
      description: "Submit one polished paragraph with topic sentence and evidence.",
      classGroup: classGroups[2],
      course: courses[2],
      deadline: addDays(today, -1),
      marks: 10
    }
  ];

  for (const seed of homeworkSeeds) {
    const existing = await prisma.homework.findFirst({ where: { instituteId: institute.id, title: seed.title } });
    const homework =
      existing ??
      (await prisma.homework.create({
        data: {
          title: seed.title,
          description: seed.description,
          deadline: seed.deadline,
          marks: seed.marks,
          status: HomeworkStatus.PUBLISHED,
          instituteId: institute.id,
          classGroupId: seed.classGroup.id,
          courseId: seed.course.id,
          createdById: admin.id,
          externalLinks: [`https://classcard.test/homework/${seed.classGroup.code.toLowerCase()}`],
          attachments: {
            create: [{ name: "Worksheet placeholder", url: `worksheet-${seed.classGroup.code.toLowerCase()}.pdf` }]
          }
        }
      }));

    const enrolled = await prisma.enrollment.findMany({ where: { classGroupId: seed.classGroup.id, active: true }, select: { studentId: true }, take: 8 });
    for (const [index, enrollment] of enrolled.entries()) {
      const submittedAt = index % 3 === 0 ? addDays(today, -1) : null;
      await prisma.homeworkSubmission.upsert({
        where: { homeworkId_studentId: { homeworkId: homework.id, studentId: enrollment.studentId } },
        create: {
          homeworkId: homework.id,
          studentId: enrollment.studentId,
          instituteId: institute.id,
          answerText: submittedAt ? "Demo homework answer with working steps." : null,
          status: submittedAt ? (submittedAt > homework.deadline ? "LATE" : "SUBMITTED") : today > homework.deadline ? "MISSING" : "PENDING",
          submittedAt
        },
        update: {}
      });
    }
  }

  const quiz = await prisma.quiz.findFirst({ where: { instituteId: institute.id, title: "Grade 10 Algebra Checkpoint" } }) ??
    await prisma.quiz.create({
      data: {
        title: "Grade 10 Algebra Checkpoint",
        description: "Short auto-marked quiz for algebra fundamentals.",
        instructions: "Answer all questions before the timer ends.",
        startsAt: addDays(today, -1),
        endsAt: addDays(today, 7),
        timeLimitMins: 20,
        totalMarks: "5.00",
        passMark: "3.00",
        attemptLimit: 2,
        status: QuizStatus.PUBLISHED,
        instituteId: institute.id,
        classGroupId: classGroups[0].id,
        courseId: courses[0].id,
        createdById: admin.id
      }
    });

  if ((await prisma.quizQuestion.count({ where: { quizId: quiz.id } })) === 0) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        type: QuizQuestionType.MULTIPLE_CHOICE,
        prompt: "What is the value of x if 2x + 4 = 12?",
        marks: "2.00",
        order: 0,
        options: {
          create: [
            { label: "A", text: "2", order: 0 },
            { label: "B", text: "4", isCorrect: true, order: 1 },
            { label: "C", text: "8", order: 2 }
          ]
        }
      }
    });
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        type: QuizQuestionType.TRUE_FALSE,
        prompt: "A linear equation can have exactly one solution.",
        marks: "1.00",
        order: 1,
        correctAnswer: "true"
      }
    });
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        type: QuizQuestionType.SHORT_ANSWER,
        prompt: "Explain one step used to isolate a variable.",
        marks: "2.00",
        order: 2
      }
    });
  }

  await Promise.all([
    prisma.notification.upsert({
      where: { id: "demo-student-homework-alert" },
      create: {
        id: "demo-student-homework-alert",
        instituteId: institute.id,
        studentId: students[0].id,
        title: "New homework assigned",
        message: "Algebra practice worksheet is due soon.",
        type: "NOTICE",
        actionUrl: "/homework"
      },
      update: { studentId: students[0].id, message: "Algebra practice worksheet is due soon." }
    }),
    prisma.notification.upsert({
      where: { id: "demo-student-quiz-alert" },
      create: {
        id: "demo-student-quiz-alert",
        instituteId: institute.id,
        studentId: students[0].id,
        title: "Quiz is live",
        message: "Grade 10 Algebra Checkpoint is ready to attempt.",
        type: "CLASS_NOTICE",
        actionUrl: "/quizzes"
      },
      update: { studentId: students[0].id, message: "Grade 10 Algebra Checkpoint is ready to attempt." }
    })
  ]);

  const notice = await prisma.notice.findFirst({
    where: {
      instituteId: institute.id,
      title: "Demo term schedule is ready"
    }
  });

  if (!notice) {
    const createdNotice = await prisma.notice.create({
      data: {
        title: "Demo term schedule is ready",
        body: "Class timetables, fee status, and attendance records are ready for review in the parent portal.",
        audience: "INSTITUTE",
        type: "NOTICE",
        instituteId: institute.id,
        createdById: admin.id,
        recipients: {
          create: students.map((student) => ({ studentId: student.id }))
        }
      }
    });

    await prisma.notificationLog.createMany({
      data: students.map((student) => ({
        instituteId: institute.id,
        noticeId: createdNotice.id,
        userId: student.userId,
        studentId: student.id,
        type: "NOTICE",
        channel: "IN_APP",
        status: "SENT",
        title: createdNotice.title,
        message: createdNotice.body,
        sentAt: new Date()
      }))
    });
  }

  console.log("Demo data added");
  console.log(`Super admin: ${superAdmin.email}`);
  console.log("Institute admin: admin@classcard.test");
  console.log("Teacher: elena@classcard.test");
  console.log("Parent: avery.parent@classcard.test");
  console.log("Student: sofia.collins@student.test");
  console.log(`Password for demo users: ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
