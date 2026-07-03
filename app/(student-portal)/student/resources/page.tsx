import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getStudentWebContext } from "@/lib/student-web";
export default async function StudentResources(){const{studentId,instituteId}=await getStudentWebContext();const rows=await prisma.courseResource.findMany({where:{instituteId,course:{status:"PUBLISHED",OR:[{accessType:"FREE"},{enrollments:{some:{studentId,status:{in:["ACTIVE","COMPLETED"]}}}}]}},include:{course:true,module:true},orderBy:{createdAt:"desc"}});return <div className="space-y-5"><h2 className="text-3xl font-semibold">Resources</h2><div className="grid gap-3 md:grid-cols-2">{rows.map(item=><Link href={`/student/courses/${item.courseId}?resource=${item.id}`} key={item.id}><Card><CardContent className="flex items-center gap-4 p-5"><FileText className="text-primary"/><div><p className="font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.course.name} · {item.module?.title??"Course resource"} · {item.resourceType}</p></div></CardContent></Card></Link>)}</div></div>}
