/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import type React from "react";
import {
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  FileArchive,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers3,
  Lock,
  Mail,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UploadCloud,
  UsersRound,
  Video
} from "lucide-react";
import {
  assignQuizToCourse,
  createModule,
  createResource,
  deleteModule,
  deleteResource,
  detachQuizFromCourse,
  enrollSelectedStudents,
  importClassStudents,
  removeCourseEnrollment,
  resetCourseProgress,
  sendCourseNotification,
  setCourseEnrollmentStatus,
  updateCourseSettings,
  updateModule,
  updateResource,
  unlockCourse
} from "@/app/(dashboard)/dashboard/courses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";

const tabs = ["overview", "modules", "resources", "homework", "quizzes", "enrollments", "analytics", "settings"] as const;
type Tab = (typeof tabs)[number];

const resourceTypes = [
  ["VIDEO", "Video", Video],
  ["RECORDING", "Recording", PlayCircle],
  ["PDF", "PDF", FileText],
  ["TUTE", "Tute", BookOpenCheck],
  ["PAST_PAPER", "Past Paper", FileText],
  ["MODEL_PAPER", "Model Paper", FileText],
  ["WORD", "Word", FileText],
  ["EXCEL", "Excel", FileSpreadsheet],
  ["ZIP", "ZIP", FileArchive],
  ["EXTERNAL_LINK", "External Link", UploadCloud],
  ["YOUTUBE", "YouTube", PlayCircle],
  ["SECURE_VIDEO", "Secure Video", ShieldCheck]
] as const;

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function dateTimeValue(date: Date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

export default async function CourseDetail({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ tab?: string; q?: string; page?: string; grade?: string; subject?: string }> }) {
  const { courseId } = await params;
  const query = await searchParams;
  const activeTab = tabs.includes(query.tab as Tab) ? (query.tab as Tab) : "overview";
  const page = Math.max(1, Number(query.page || 1));
  const take = 10;
  const q = (query.q || "").trim();
  const { instituteId } = await getTenantContext();

  const [course, students, quizzes, classes, grades, subjects, settings, enrollmentCount] = await Promise.all([
    prisma.course.findFirst({
      where: { id: courseId, instituteId },
      include: {
        subjectRecord: true,
        gradeLevel: true,
        modules: { include: { resources: { orderBy: { sortOrder: "asc" } }, quizzes: true }, orderBy: { sortOrder: "asc" } },
        resources: { orderBy: { sortOrder: "asc" } },
        homework: { orderBy: { createdAt: "desc" }, take: 8 },
        quizzes: { include: { courseModule: true }, orderBy: { startsAt: "desc" } },
        enrollments: {
          where: q
            ? {
                OR: [
                  { student: { admissionNo: { contains: q } } },
                  { student: { firstName: { contains: q } } },
                  { student: { lastName: { contains: q } } }
                ]
              }
            : undefined,
          include: {
            student: {
              include: {
                enrollments: { where: { active: true }, include: { classGroup: { include: { gradeLevel: true, subject: true } } }, take: 1 },
                payments: { where: { courseId }, orderBy: { createdAt: "desc" }, take: 1 }
              }
            }
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * take,
          take
        },
        payments: true
      }
    }),
    prisma.student.findMany({
      where: {
        instituteId,
        status: "ACTIVE",
        ...(query.grade ? { gradeId: query.grade } : {}),
        ...(query.subject ? { enrollments: { some: { active: true, classGroup: { subjectId: query.subject } } } } : {})
      },
      include: { enrollments: { where: { active: true }, include: { classGroup: { include: { gradeLevel: true, subject: true } } }, take: 1 } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    prisma.quiz.findMany({ where: { instituteId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.classGroup.findMany({
      where: { instituteId, status: "ACTIVE" },
      include: { subject: true, gradeLevel: true, _count: { select: { enrollments: true } } },
      orderBy: { name: "asc" }
    }),
    prisma.grade.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
    prisma.subject.findMany({ where: { instituteId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.instituteSettings.findUnique({ where: { instituteId }, select: { currency: true } }),
    prisma.courseEnrollment.count({ where: { courseId, instituteId } })
  ]);

  if (!course) notFound();

  const resourceCount = course.resources.length;
  const publishedResourceCount = course.resources.filter((resource) => resource.visibility !== "DRAFT").length;
  const avgProgress = enrollmentCount ? Math.round(course.enrollments.reduce((sum, item) => sum + Number(item.progress), 0) / course.enrollments.length) : 0;
  const totalPages = Math.max(1, Math.ceil(enrollmentCount / take));
  const currency = settings?.currency ?? "LKR";

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{course.subjectRecord?.name ?? course.subject}</Badge>
              <Badge variant={course.status === "PUBLISHED" ? "success" : "outline"}>{course.status.toLowerCase()}</Badge>
              <Badge variant="outline">{course.gradeLevel?.name ?? "All grades"}</Badge>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">{course.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{course.description ?? "No course description added."}</p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-sm text-muted-foreground">Course price</p>
            <p className="text-2xl font-semibold">{course.accessType === "FREE" ? "Free" : formatCurrency(Number(course.fee), currency)}</p>
          </div>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-xl border bg-white/80 p-2">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={`/dashboard/courses/${course.id}?tab=${tab}`}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-primary text-white shadow-glow" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <Overview course={course} resourceCount={resourceCount} publishedResourceCount={publishedResourceCount} avgProgress={avgProgress} enrollmentCount={enrollmentCount} />
      ) : null}

      {activeTab === "modules" ? <ModulesTab course={course} /> : null}

      {activeTab === "resources" ? <ResourcesTab course={course} /> : null}

      {activeTab === "homework" ? <HomeworkTab course={course} /> : null}

      {activeTab === "quizzes" ? <QuizzesTab course={course} quizzes={quizzes} /> : null}

      {activeTab === "enrollments" ? (
        <EnrollmentsTab course={course} students={students} classes={classes} grades={grades} subjects={subjects} q={q} page={page} totalPages={totalPages} selectedGrade={query.grade ?? ""} selectedSubject={query.subject ?? ""} />
      ) : null}

      {activeTab === "analytics" ? <AnalyticsTab course={course} enrollmentCount={enrollmentCount} avgProgress={avgProgress} /> : null}

      {activeTab === "settings" ? <SettingsTab course={course} subjects={subjects} grades={grades} /> : null}
    </div>
  );
}

function Overview({ course, resourceCount, publishedResourceCount, enrollmentCount, avgProgress }: { course: any; resourceCount: number; publishedResourceCount: number; enrollmentCount: number; avgProgress: number }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={Layers3} label="Modules" value={String(course.modules.length)} />
        <Metric icon={FileText} label="Resources" value={`${publishedResourceCount}/${resourceCount}`} />
        <Metric icon={UsersRound} label="Enrollments" value={String(enrollmentCount)} />
        <Metric icon={BarChart3} label="Avg progress" value={`${avgProgress}%`} />
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Learning path</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {course.modules.map((module: any, index: number) => (
              <div key={module.id} className="rounded-xl border bg-white/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Module {index + 1}</p>
                    <h3 className="mt-1 font-semibold">{module.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{module.description ?? "No description."}</p>
                  </div>
                  <Badge variant={module.isFreePreview ? "success" : "outline"}>{module.isFreePreview ? "preview" : "enrolled"}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{module.resources.length} resources, {module.quizzes.length} quizzes</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Content health</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Progress label="Published resources" value={resourceCount ? Math.round((publishedResourceCount / resourceCount) * 100) : 0} />
            <Progress label="Average student progress" value={avgProgress} />
            <Progress label="Module coverage" value={course.modules.length ? 100 : 0} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ModulesTab({ course }: { course: any }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        {course.modules.map((module: any) => (
          <Card key={module.id} className="glass-panel">
            <CardContent className="p-5">
              <form action={updateModule.bind(null, course.id, module.id)} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <Field label="Sort" htmlFor={`sort-${module.id}`}><Input id={`sort-${module.id}`} name="sortOrder" type="number" defaultValue={module.sortOrder} /></Field>
                      <Field label="Module title" htmlFor={`title-${module.id}`}><Input id={`title-${module.id}`} name="title" defaultValue={module.title} required /></Field>
                    </div>
                    <Field label="Description" htmlFor={`description-${module.id}`}><Textarea id={`description-${module.id}`} name="description" defaultValue={module.description ?? ""} /></Field>
                  </div>
                  <div className="w-full space-y-2 sm:w-44">
                    <Toggle name="isFreePreview" label="Free preview" checked={module.isFreePreview} />
                    <Toggle name="isLocked" label="Locked" checked={module.isLocked} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="outline">Save module</Button>
                </div>
              </form>
              <form action={deleteModule.bind(null, course.id, module.id)} className="mt-2 flex justify-end">
                <Button type="submit" variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="glass-panel h-fit">
        <CardHeader><CardTitle>Add module</CardTitle></CardHeader>
        <CardContent>
          <form action={createModule.bind(null, course.id)} className="space-y-3">
            <Field label="Module title" htmlFor="title"><Input id="title" name="title" required /></Field>
            <Field label="Description" htmlFor="description"><Textarea id="description" name="description" /></Field>
            <Field label="Sort order" htmlFor="sortOrder"><Input id="sortOrder" name="sortOrder" type="number" defaultValue={course.modules.length + 1} /></Field>
            <Toggle name="isFreePreview" label="Free preview module" />
            <Toggle name="isLocked" label="Lock module" />
            <Button className="w-full"><Plus className="h-4 w-4" /> Add module</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function ResourcesTab({ course }: { course: any }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
      <div className="space-y-3">
        {course.modules.map((module: any) => (
          <Card key={module.id} className="glass-panel">
            <CardHeader><CardTitle>{module.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {module.resources.length ? module.resources.map((resource: any) => <ResourceRow key={resource.id} course={course} resource={resource} />) : <p className="text-sm text-muted-foreground">No resources in this module yet.</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="glass-panel h-fit">
        <CardHeader><CardTitle>Resource upload wizard</CardTitle></CardHeader>
        <CardContent>
          <form action={createResource.bind(null, course.id)} className="space-y-5">
            <WizardStep number={1} title="Select resource type">
              <div className="grid grid-cols-2 gap-2">
                {resourceTypes.map(([value, label, Icon]) => (
                  <label key={value} className="relative flex min-h-20 cursor-pointer flex-col justify-between rounded-lg border bg-white/80 p-3 text-sm hover:border-primary/50">
                    <input className="peer sr-only" type="radio" name="resourceType" value={value} defaultChecked={value === "PDF"} />
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{label}</span>
                    <span className="pointer-events-none absolute inset-0 rounded-lg ring-primary peer-checked:ring-2" />
                  </label>
                ))}
              </div>
            </WizardStep>
            <WizardStep number={2} title="Upload or paste link">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-white/80 p-5 text-center">
                <UploadCloud className="h-8 w-8 text-primary" />
                <span className="mt-2 text-sm font-semibold">Drop a file here or browse</span>
                <span className="text-xs text-muted-foreground">PDF, Word, Excel, ZIP, images, or video</span>
                <Input name="resourceFile" type="file" className="mt-3" />
              </label>
              <Input name="externalUrl" className="mt-3" placeholder="https://youtube.com/... or external link" />
            </WizardStep>
            <WizardStep number={3} title="Enter title and description">
              <Input name="title" placeholder="Resource title" required />
              <Textarea name="description" className="mt-3" placeholder="Short description" />
            </WizardStep>
            <WizardStep number={4} title="Select module">
              <Select name="moduleId" required>
                <option value="">Choose module</option>
                {course.modules.map((module: any) => <option key={module.id} value={module.id}>{module.title}</option>)}
              </Select>
            </WizardStep>
            <WizardStep number={5} title="Choose visibility">
              <Select name="visibility" defaultValue="ENROLLED">
                <option value="FREE_PREVIEW">Free Preview</option>
                <option value="ENROLLED">Enrolled Students</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled Publish</option>
              </Select>
              <Input name="publishAt" type="datetime-local" className="mt-3" />
            </WizardStep>
            <WizardStep number={6} title="Save">
              <Button className="w-full" disabled={!course.modules.length}>Save resource</Button>
              {!course.modules.length ? <p className="mt-2 text-xs text-muted-foreground">Create a module before adding resources.</p> : null}
            </WizardStep>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function EnrollmentsTab({
  course,
  students,
  classes,
  grades,
  subjects,
  q,
  page,
  totalPages,
  selectedGrade,
  selectedSubject
}: {
  course: any;
  students: any[];
  classes: any[];
  grades: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  q: string;
  page: number;
  totalPages: number;
  selectedGrade: string;
  selectedSubject: string;
}) {
  return (
    <div className="space-y-5">
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="glass-panel min-w-0">
          <CardHeader><CardTitle>Course enrollments</CardTitle></CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" action={`/dashboard/courses/${course.id}`}>
              <input type="hidden" name="tab" value="enrollments" />
              <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input name="q" defaultValue={q} className="pl-9" placeholder="Search student ID or name" /></div>
              <Button type="submit" variant="outline">Search</Button>
            </form>
            <div className="overflow-x-auto rounded-xl border bg-white/85">
              <table className="min-w-[1180px] text-sm">
                <thead className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Student ID", "Student Name", "Grade", "Class", "Enrollment Date", "Progress", "Payment Status", "Access Status", "Last Activity", "Actions"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {course.enrollments.map((enrollment: any) => {
                    const payment = enrollment.student.payments[0];
                    const classGroup = enrollment.student.enrollments[0]?.classGroup;
                    return (
                      <tr key={enrollment.id} className="align-top">
                        <td className="px-4 py-3 font-semibold">{enrollment.student.admissionNo}</td>
                        <td className="px-4 py-3">{enrollment.student.firstName} {enrollment.student.lastName}</td>
                        <td className="px-4 py-3">{classGroup?.gradeLevel?.name ?? "N/A"}</td>
                        <td className="px-4 py-3">{classGroup?.name ?? "N/A"}</td>
                        <td className="px-4 py-3">{enrollment.createdAt.toLocaleDateString()}</td>
                        <td className="px-4 py-3"><Progress value={Number(enrollment.progress)} compact /></td>
                        <td className="px-4 py-3">{payment?.status ? <Badge variant={payment.status === "PAID" ? "success" : "warning"}>{payment.status.toLowerCase()}</Badge> : <Badge variant="outline">No payment</Badge>}</td>
                        <td className="px-4 py-3"><Badge variant={enrollment.status === "ACTIVE" ? "success" : "outline"}>{enrollment.status.toLowerCase()}</Badge></td>
                        <td className="px-4 py-3">{enrollment.lastActivityAt?.toLocaleDateString() ?? "No activity"}</td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-72 flex-wrap gap-1">
                            <Button asChild variant="ghost" size="sm"><Link href={`/students/${enrollment.student.id}`}>View</Link></Button>
                            <ActionButton action={setCourseEnrollmentStatus.bind(null, course.id, enrollment.id, "PENDING")} icon={Lock} label="Lock" />
                            <ActionButton action={setCourseEnrollmentStatus.bind(null, course.id, enrollment.id, "ACTIVE")} icon={Unlock} label="Unlock" />
                            <ActionButton action={sendCourseNotification.bind(null, course.id, enrollment.id)} icon={Mail} label="Notify" />
                            <ActionButton action={resetCourseProgress.bind(null, course.id, enrollment.id)} icon={CalendarClock} label="Reset" />
                            <ActionButton action={removeCourseEnrollment.bind(null, course.id, enrollment.id)} icon={Trash2} label="Remove" destructive />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" disabled={page <= 1}><Link href={`/dashboard/courses/${course.id}?tab=enrollments&q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}>Previous</Link></Button>
                <Button asChild variant="outline" size="sm" disabled={page >= totalPages}><Link href={`/dashboard/courses/${course.id}?tab=enrollments&q=${encodeURIComponent(q)}&page=${Math.min(totalPages, page + 1)}`}>Next</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="glass-panel">
            <CardHeader><CardTitle>Enroll individual student</CardTitle></CardHeader>
            <CardContent><form action={unlockCourse.bind(null, course.id)} className="space-y-3"><StudentSelect students={students} /><Input name="paidAmount" type="number" min="0" step=".01" placeholder="Confirmed payment amount" /><Button className="w-full">Enroll student</Button></form></CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader><CardTitle>Bulk selected students</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form action={`/dashboard/courses/${course.id}`} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="tab" value="enrollments" />
                <Select name="grade" defaultValue={selectedGrade}>
                  <option value="">All grades</option>
                  {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                </Select>
                <Select name="subject" defaultValue={selectedSubject}>
                  <option value="">All subjects</option>
                  {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                </Select>
                <Button type="submit" variant="outline" className="sm:col-span-2">Filter students</Button>
              </form>
              <form action={enrollSelectedStudents.bind(null, course.id)} className="space-y-3"><div className="max-h-64 space-y-2 overflow-auto pr-1">{students.map((student) => <label key={student.id} className="flex items-center gap-3 rounded-lg border bg-white/75 p-3 text-sm"><input type="checkbox" name="studentIds" value={student.id} /><span>{student.admissionNo} - {student.firstName} {student.lastName}</span></label>)}</div><Button className="w-full">Enroll selected</Button></form>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader><CardTitle>Import from class</CardTitle></CardHeader>
            <CardContent><form action={importClassStudents.bind(null, course.id)} className="space-y-3"><Select name="classGroupId">{classes.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.subject.name} ({item._count.enrollments})</option>)}</Select><Button className="w-full">Import all students</Button></form></CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function HomeworkTab({ course }: { course: any }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Course homework</CardTitle>
          <Button asChild><Link href="/homework/new"><Plus className="h-4 w-4" /> New homework</Link></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {course.homework.length ? course.homework.map((item: any) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white/80 p-4">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.status.toLowerCase()} - due {item.deadline.toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link href={`/homework/${item.id}`}>View</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href={`/homework/${item.id}/edit`}>Edit</Link></Button>
            </div>
          </div>
        )) : <p className="text-sm text-muted-foreground">No homework is attached to this course yet.</p>}
      </CardContent>
    </Card>
  );
}

function QuizzesTab({ course, quizzes }: { course: any; quizzes: Array<{ id: string; title: string }> }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Course quizzes</CardTitle>
            <Button asChild><Link href="/quizzes/new"><Plus className="h-4 w-4" /> New quiz</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {course.quizzes.length ? course.quizzes.map((quiz: any) => (
            <div key={quiz.id} className="rounded-xl border bg-white/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{quiz.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{quiz.status.toLowerCase()} - {quiz.courseModule?.title ?? "Course level"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/quizzes/${quiz.id}/edit`}>Edit</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link href={`/quizzes/${quiz.id}/questions`}>Questions</Link></Button>
                  <form action={detachQuizFromCourse.bind(null, course.id, quiz.id)}>
                    <Button type="submit" variant="destructive" size="sm">Detach</Button>
                  </form>
                </div>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No quizzes attached.</p>}
        </CardContent>
      </Card>
      <Card className="glass-panel h-fit"><CardHeader><CardTitle>Attach quiz</CardTitle></CardHeader><CardContent><form action={assignQuizToCourse.bind(null, course.id)} className="space-y-3"><Select name="quizId">{quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}</Select><Select name="moduleId"><option value="">Course level</option>{course.modules.map((module: any) => <option key={module.id} value={module.id}>{module.title}</option>)}</Select><Button className="w-full">Attach quiz</Button></form></CardContent></Card>
    </section>
  );
}

function AnalyticsTab({ course, enrollmentCount, avgProgress }: { course: any; enrollmentCount: number; avgProgress: number }) {
  const active = course.enrollments.filter((item: any) => item.status === "ACTIVE").length;
  return <section className="grid gap-4 md:grid-cols-3"><Metric icon={UsersRound} label="Active learners" value={String(active)} /><Metric icon={GraduationCap} label="Total learners" value={String(enrollmentCount)} /><Metric icon={BarChart3} label="Average progress" value={`${avgProgress}%`} /></section>;
}

function SettingsTab({ course, subjects, grades }: { course: any; subjects: Array<{ id: string; name: string }>; grades: Array<{ id: string; name: string }> }) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card className="glass-panel">
        <CardHeader><CardTitle>Edit course settings</CardTitle></CardHeader>
        <CardContent>
          <form action={updateCourseSettings.bind(null, course.id)} className="space-y-4">
            <Field label="Course name" htmlFor="settings-name"><Input id="settings-name" name="name" defaultValue={course.name} required /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Subject" htmlFor="settings-subject"><Select id="settings-subject" name="subjectId" defaultValue={course.subjectId ?? ""}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</Select></Field>
              <Field label="Grade" htmlFor="settings-grade"><Select id="settings-grade" name="gradeId" defaultValue={course.gradeId ?? ""}><option value="">All grades</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</Select></Field>
            </div>
            <Field label="Description" htmlFor="settings-description"><Textarea id="settings-description" name="description" defaultValue={course.description ?? ""} /></Field>
            <Field label="Thumbnail URL" htmlFor="settings-thumbnail"><Input id="settings-thumbnail" name="thumbnailUrl" defaultValue={course.thumbnailUrl ?? ""} /></Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Duration type" htmlFor="settings-duration-type"><Select id="settings-duration-type" name="durationType" defaultValue={course.durationType}><option value="DAYS">Days</option><option value="WEEKS">Weeks</option><option value="MONTHS">Months</option><option value="LIFETIME">Lifetime</option></Select></Field>
              <Field label="Duration value" htmlFor="settings-duration-value"><Input id="settings-duration-value" name="durationValue" type="number" defaultValue={course.durationValue ?? 1} /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Access" htmlFor="settings-access"><Select id="settings-access" name="accessType" defaultValue={course.accessType}><option value="FREE">Free</option><option value="PAID">Paid</option><option value="MANUAL_UNLOCK">Manual unlock</option></Select></Field>
              <Field label="Fee" htmlFor="settings-fee"><Input id="settings-fee" name="fee" type="number" step="0.01" defaultValue={Number(course.fee)} /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Start date" htmlFor="settings-start"><Input id="settings-start" name="startDate" type="date" defaultValue={dateValue(course.startDate)} /></Field>
              <Field label="End date" htmlFor="settings-end"><Input id="settings-end" name="endDate" type="date" defaultValue={dateValue(course.endDate)} /></Field>
            </div>
            <Field label="Status" htmlFor="settings-status"><Select id="settings-status" name="status" defaultValue={course.status}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></Select></Field>
            <Button type="submit" className="w-full">Save course settings</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="glass-panel h-fit"><CardHeader><CardTitle>System details</CardTitle></CardHeader><CardContent className="grid gap-3"><Info label="Course code" value={course.code} /><Info label="Slug" value={course.slug ?? "Not set"} /><Info label="Access" value={course.accessType.toLowerCase().replaceAll("_", " ")} /><Info label="Status" value={course.status.toLowerCase()} /></CardContent></Card>
    </section>
  );
}

function ResourceRow({ course, resource }: { course: any; resource: any }) {
  const publishAtValue = resource.publishAt ? dateTimeValue(resource.publishAt) : "";
  return (
    <div className="rounded-xl border bg-white/80 p-4">
      <form action={updateResource.bind(null, course.id, resource.id)} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{resource.resourceType.replaceAll("_", " ").toLowerCase()}</Badge>
          <Badge variant={resource.visibility === "FREE_PREVIEW" ? "success" : resource.visibility === "DRAFT" ? "outline" : "secondary"}>{resource.visibility.replaceAll("_", " ").toLowerCase()}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title" htmlFor={`resource-title-${resource.id}`}><Input id={`resource-title-${resource.id}`} name="title" defaultValue={resource.title} required /></Field>
          <Field label="Type" htmlFor={`resource-type-${resource.id}`}>
            <Select id={`resource-type-${resource.id}`} name="resourceType" defaultValue={resource.resourceType}>
              {resourceTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor={`resource-description-${resource.id}`}><Textarea id={`resource-description-${resource.id}`} name="description" defaultValue={resource.description ?? ""} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Module" htmlFor={`resource-module-${resource.id}`}>
            <Select id={`resource-module-${resource.id}`} name="moduleId" defaultValue={resource.moduleId ?? ""}>
              {course.modules.map((module: any) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </Select>
          </Field>
          <Field label="Sort order" htmlFor={`resource-sort-${resource.id}`}><Input id={`resource-sort-${resource.id}`} name="sortOrder" type="number" defaultValue={resource.sortOrder} /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="External URL" htmlFor={`resource-url-${resource.id}`}><Input id={`resource-url-${resource.id}`} name="externalUrl" defaultValue={resource.externalUrl ?? ""} /></Field>
          <Field label="Replace file" htmlFor={`resource-file-${resource.id}`}><Input id={`resource-file-${resource.id}`} name="resourceFile" type="file" /></Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Visibility" htmlFor={`resource-visibility-${resource.id}`}>
            <Select id={`resource-visibility-${resource.id}`} name="visibility" defaultValue={resource.visibility}>
              <option value="FREE_PREVIEW">Free Preview</option>
              <option value="ENROLLED">Enrolled Students</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled Publish</option>
            </Select>
          </Field>
          <Field label="Publish at" htmlFor={`resource-publish-${resource.id}`}><Input id={`resource-publish-${resource.id}`} name="publishAt" type="datetime-local" defaultValue={publishAtValue} /></Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="outline">Save resource</Button>
        </div>
      </form>
      <form action={deleteResource.bind(null, course.id, resource.id)} className="mt-2 flex justify-end">
        <Button type="submit" variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
      </form>
    </div>
  );
}

function WizardStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return <div><div className="mb-3 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{number}</span><h3 className="font-semibold">{title}</h3></div>{children}</div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Layers3; label: string; value: string }) {
  return <Card className="glass-panel"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white"><Icon className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div></CardContent></Card>;
}

function Progress({ label, value, compact = false }: { label?: string; value: number; compact?: boolean }) {
  return <div className={compact ? "min-w-28" : ""}>{label ? <div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}%</span></div> : null}<div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>{compact ? <p className="mt-1 text-xs">{value}%</p> : null}</div>;
}

function StudentSelect({ students }: { students: any[] }) {
  return <Select name="studentId" required>{students.map((student) => <option key={student.id} value={student.id}>{student.admissionNo} - {student.firstName} {student.lastName}</option>)}</Select>;
}

function ActionButton({ action, icon: Icon, label, destructive = false }: { action: () => Promise<void>; icon: typeof Lock; label: string; destructive?: boolean }) {
  return <form action={action}><Button type="submit" variant={destructive ? "destructive" : "ghost"} size="sm"><Icon className="h-4 w-4" />{label}</Button></form>;
}

function Toggle({ name, label, checked = false }: { name: string; label: string; checked?: boolean }) {
  return <label className="flex items-center gap-3 rounded-lg border bg-white/80 p-3 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4" /><span className="font-medium">{label}</span></label>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-white/70 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
