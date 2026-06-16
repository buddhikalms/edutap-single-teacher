import { PrismaClient, AttendanceStatus, PaymentMethod, PaymentStatus, SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  await prisma.notificationLog.deleteMany();
  await prisma.noticeRecipient.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.instituteSubscription.deleteMany();
  await prisma.instituteSettings.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.course.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.institute.deleteMany();

  const passwordHash = await bcrypt.hash("ClassCard@2026", 12);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Ariana Wells",
      email: "super@classcard.test",
      passwordHash,
      role: UserRole.SUPER_ADMIN
    }
  });

  const institute = await prisma.institute.create({
    data: {
      name: "ClassCard Demo Academy",
      slug: "classcard-demo",
      email: "hello@classcard.test",
      phone: "+1 555 010 2026",
      address: "1200 Meridian Avenue, Suite 18, New York"
    }
  });

  await prisma.instituteSettings.create({
    data: {
      instituteId: institute.id,
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

  await prisma.instituteSubscription.create({
    data: {
      instituteId: institute.id,
      plan: SubscriptionPlan.SMALL_INSTITUTE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
      monthlyPrice: "79.00",
      studentLimit: 500,
      teacherLimit: 25,
      branchLimit: 3,
      smsCredits: 2500
    }
  });

  await Promise.all([
    prisma.institute.create({
      data: {
        name: "Northstar Tutors",
        slug: "northstar-tutors",
        email: "hello@northstar.test",
        phone: "+1 555 031 1010",
        address: "44 Cedar Street, Boston",
        active: true,
        settings: {
          create: {
            receiptPrefix: "NST",
            currency: "USD",
            paymentDueDay: 7,
            themeColor: "#2563eb"
          }
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.TEACHER,
            status: SubscriptionStatus.TRIAL,
            currentPeriodEnd: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
            monthlyPrice: "29.00",
            studentLimit: 120,
            teacherLimit: 3,
            branchLimit: 1,
            smsCredits: 500
          }
        }
      }
    }),
    prisma.institute.create({
      data: {
        name: "Summit Learning Hub",
        slug: "summit-learning-hub",
        email: "ops@summit.test",
        phone: "+1 555 042 1111",
        address: "88 Lakeview Road, Chicago",
        active: false,
        settings: {
          create: {
            receiptPrefix: "SLH",
            currency: "USD",
            paymentDueDay: 5,
            themeColor: "#be123c"
          }
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.PREMIUM_INSTITUTE,
            status: SubscriptionStatus.SUSPENDED,
            currentPeriodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            monthlyPrice: "199.00",
            studentLimit: 2000,
            teacherLimit: 100,
            branchLimit: 10,
            smsCredits: 15000
          }
        }
      }
    })
  ]);

  const branch = await prisma.branch.create({
    data: {
      name: "Central Campus",
      code: "CC",
      location: "New York",
      address: "1200 Meridian Avenue",
      phone: "+1 555 010 2027",
      instituteId: institute.id
    }
  });

  const defaultGradeNames = [
    "Pre School",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11"
  ];

  const grades = await Promise.all(
    defaultGradeNames.map((name, index) =>
      prisma.grade.create({
        data: {
          instituteId: institute.id,
          name,
          order: index
        }
      })
    )
  );

  const grade10 = grades.find((grade) => grade.name === "Grade 10") ?? grades[10];
  const grade11 = grades.find((grade) => grade.name === "Grade 11") ?? grades[11];

  const admin = await prisma.user.create({
    data: {
      name: "Maya Bennett",
      email: "admin@classcard.test",
      passwordHash,
      role: UserRole.INSTITUTE_ADMIN,
      instituteId: institute.id,
      branchId: branch.id
    }
  });

  const teacherUsers = await Promise.all(
    [
      ["Elena Brooks", "elena@classcard.test"],
      ["Noah Hart", "noah@classcard.test"],
      ["Priya Raman", "priya@classcard.test"]
    ].map(([name, email]) =>
      prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: UserRole.TEACHER,
          instituteId: institute.id,
          branchId: branch.id
        }
      })
    )
  );

  const teachers = await Promise.all([
    prisma.teacher.create({
      data: {
        name: "Elena Brooks",
        email: "elena@classcard.test",
        phone: "+1 555 011 0101",
        specialty: "Mathematics",
        userId: teacherUsers[0].id,
        instituteId: institute.id,
        branchId: branch.id
      }
    }),
    prisma.teacher.create({
      data: {
        name: "Noah Hart",
        email: "noah@classcard.test",
        phone: "+1 555 011 0102",
        specialty: "Physics",
        userId: teacherUsers[1].id,
        instituteId: institute.id,
        branchId: branch.id
      }
    }),
    prisma.teacher.create({
      data: {
        name: "Priya Raman",
        email: "priya@classcard.test",
        phone: "+1 555 011 0103",
        specialty: "English Literature",
        userId: teacherUsers[2].id,
        instituteId: institute.id,
        branchId: branch.id
      }
    })
  ]);

  const courses = await Promise.all([
    prisma.course.create({
      data: {
        name: "Advanced Mathematics",
        code: "MATH-A",
        subject: "Mathematics",
        grade: "Grade 10",
        gradeId: grade10.id,
        description: "Premium exam-focused mathematics coaching.",
        fee: "185.00",
        instituteId: institute.id
      }
    }),
    prisma.course.create({
      data: {
        name: "Physics Mastery",
        code: "PHY-M",
        subject: "Physics",
        grade: "Grade 11",
        gradeId: grade11.id,
        description: "Conceptual physics with weekly assessments.",
        fee: "210.00",
        instituteId: institute.id
      }
    }),
    prisma.course.create({
      data: {
        name: "Academic English",
        code: "ENG-A",
        subject: "English",
        grade: "Grade 10",
        gradeId: grade10.id,
        description: "Writing, comprehension, and public speaking.",
        fee: "160.00",
        instituteId: institute.id
      }
    })
  ]);

  const classGroups = await Promise.all([
    prisma.classGroup.create({
      data: {
        name: "Grade 10 Alpha",
        code: "G10-A",
        schedule: "Mon, Wed 16:00-18:00",
        room: "Studio 2",
        capacity: 32,
        monthlyFee: "185.00",
        instituteId: institute.id,
        branchId: branch.id,
        gradeId: grade10.id,
        courseId: courses[0].id,
        teacherId: teachers[0].id
      }
    }),
    prisma.classGroup.create({
      data: {
        name: "Grade 11 Physics Elite",
        code: "G11-PHY",
        schedule: "Tue, Thu 17:00-19:00",
        room: "Lab 1",
        capacity: 28,
        monthlyFee: "210.00",
        instituteId: institute.id,
        branchId: branch.id,
        gradeId: grade11.id,
        courseId: courses[1].id,
        teacherId: teachers[1].id,
        classType: "HYBRID",
        defaultFreePeriodType: "FIRST_WEEK",
        defaultFreeDays: 7,
        defaultPaymentDueDay: 10
      }
    }),
    prisma.classGroup.create({
      data: {
        name: "English Scholars",
        code: "ENG-S",
        schedule: "Sat 09:00-12:00",
        room: "Studio 4",
        capacity: 24,
        monthlyFee: "160.00",
        instituteId: institute.id,
        branchId: branch.id,
        gradeId: grade10.id,
        courseId: courses[2].id,
        teacherId: teachers[2].id,
        classType: "ONLINE"
      }
    })
  ]);

  const parentOne = await prisma.parent.create({
    data: {
      name: "Avery Collins",
      email: "avery.parent@classcard.test",
      phone: "+1 555 012 0001",
      occupation: "Architect",
      instituteId: institute.id
    }
  });

  const parentTwo = await prisma.parent.create({
    data: {
      name: "Jordan Lee",
      email: "jordan.parent@classcard.test",
      phone: "+1 555 012 0002",
      occupation: "Consultant",
      instituteId: institute.id
    }
  });

  const [parentOneUser, parentTwoUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: parentOne.name,
        email: parentOne.email ?? "avery.parent@classcard.test",
        passwordHash,
        role: UserRole.PARENT,
        instituteId: institute.id,
        branchId: branch.id
      }
    }),
    prisma.user.create({
      data: {
        name: parentTwo.name,
        email: parentTwo.email ?? "jordan.parent@classcard.test",
        passwordHash,
        role: UserRole.PARENT,
        instituteId: institute.id,
        branchId: branch.id
      }
    })
  ]);

  await Promise.all([
    prisma.parent.update({ where: { id: parentOne.id }, data: { userId: parentOneUser.id } }),
    prisma.parent.update({ where: { id: parentTwo.id }, data: { userId: parentTwoUser.id } })
  ]);

  const students = await Promise.all(
    [
      ["CC-1001", "Sofia", "Collins", parentOne.id],
      ["CC-1002", "Liam", "Lee", parentTwo.id],
      ["CC-1003", "Amara", "Stone", parentOne.id],
      ["CC-1004", "Ethan", "Wright", parentTwo.id],
      ["CC-1005", "Nora", "Patel", parentOne.id],
      ["CC-1006", "Kai", "Morgan", parentTwo.id]
    ].map(async ([admissionNo, firstName, lastName, parentId], index) => {
      const studentUser = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.test`,
          passwordHash,
          role: UserRole.STUDENT,
          instituteId: institute.id,
          branchId: branch.id
        }
      });

      return prisma.student.create({
        data: {
          admissionNo,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.test`,
          phone: "+1 555 013 0000",
          nfcUid: `NFC-DEMO-${String(index + 1).padStart(4, "0")}`,
          qrCode: `QR-${admissionNo}`,
          attendanceToken: randomUUID(),
          userId: studentUser.id,
          instituteId: institute.id,
          branchId: branch.id,
          parents: {
            connect: [{ id: parentId }]
          }
        }
      });
    })
  );

  const enrollmentStartDate = new Date();
  enrollmentStartDate.setHours(0, 0, 0, 0);

  for (const [index, student] of students.entries()) {
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classGroupId: classGroups[index % classGroups.length].id,
        paymentStartDate: enrollmentStartDate,
        freePeriodType: classGroups[index % classGroups.length].defaultFreePeriodType,
        freeDays: classGroups[index % classGroups.length].defaultFreeDays,
        discount: "0.00"
      }
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session = await prisma.attendanceSession.create({
    data: {
      classGroupId: classGroups[0].id,
      sessionDate: today,
      startsAt: new Date(today.getTime() + 16 * 60 * 60 * 1000),
      endsAt: new Date(today.getTime() + 18 * 60 * 60 * 1000),
      notes: "Demo attendance session"
    }
  });

  await Promise.all(
    students.slice(0, 4).map((student, index) =>
      prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          status: index === 2 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
        }
      })
    )
  );

  const paidPayment = await prisma.payment.create({
    data: {
      invoiceNo: "INV-2026-0001",
      type: "MONTHLY_FEE",
      month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
      amount: "185.00",
      discount: "0.00",
      paidAmount: "185.00",
      balance: "0.00",
      dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      paidAt: new Date(),
      status: PaymentStatus.PAID,
      method: PaymentMethod.CARD,
      receivedBy: "Maya Bennett",
      instituteId: institute.id,
      studentId: students[0].id,
      classGroupId: classGroups[0].id
    }
  });

  await prisma.receipt.create({
    data: {
      receiptNo: "RCT-2026-0001",
      amount: "185.00",
      receivedBy: "Maya Bennett",
      paymentId: paidPayment.id,
      instituteId: institute.id
    }
  });

  await Promise.all(
    students.slice(1, 6).map((student, index) =>
      prisma.payment.create({
        data: {
          invoiceNo: `INV-2026-000${index + 2}`,
          type: "MONTHLY_FEE",
          month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
          amount: index % 2 === 0 ? "210.00" : "160.00",
          discount: "0.00",
          paidAmount: "0.00",
          balance: index % 2 === 0 ? "210.00" : "160.00",
          dueDate: new Date(today.getTime() + (index + 1) * 24 * 60 * 60 * 1000),
          status: index === 3 ? PaymentStatus.OVERDUE : PaymentStatus.PENDING,
          instituteId: institute.id,
          studentId: student.id,
          classGroupId: classGroups[(index + 1) % classGroups.length].id
        }
      })
    )
  );

  const welcomeNotice = await prisma.notice.create({
    data: {
      title: "Welcome to the ClassCard family portal",
      body: "Attendance, payment history, receipts, and class notices are now available in one secure parent-friendly portal.",
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
      noticeId: welcomeNotice.id,
      userId: student.userId,
      studentId: student.id,
      type: "NOTICE",
      channel: "IN_APP",
      status: "SENT",
      title: welcomeNotice.title,
      message: welcomeNotice.body,
      sentAt: new Date()
    }))
  });

  console.log("Seed complete");
  console.log(`Super admin: ${superAdmin.email}`);
  console.log(`Demo admin: ${admin.email}`);
  console.log("Demo parent: avery.parent@classcard.test");
  console.log("Demo student: sofia.collins@student.test");
  console.log("Demo password: ClassCard@2026");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
