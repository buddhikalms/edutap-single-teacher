import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCourse } from "@/lib/student-web";

export async function GET(_:Request,{params}:{params:Promise<{resourceId:string}>}) {
  const session=await getServerSession(authOptions);
  if(!session?.user?.id||session.user.role!=="STUDENT") return new NextResponse("Unauthorized",{status:401});
  const student=await prisma.student.findFirst({where:{userId:session.user.id},select:{id:true}});
  const {resourceId}=await params; const resource=await prisma.courseResource.findUnique({where:{id:resourceId}});
  if(!student||!resource||!resource.fileUrl) return new NextResponse("Not found",{status:404});
  const published = resource.visibility === "FREE_PREVIEW" || resource.visibility === "ENROLLED" || (resource.visibility === "SCHEDULED" && resource.publishAt && resource.publishAt <= new Date());
  if (!published || resource.visibility === "DRAFT") return new NextResponse("Not found",{status:404});
  if(resource.visibility!=="FREE_PREVIEW"&&resource.accessType!=="FREE"&&!await canAccessCourse(student.id,resource.courseId)) return new NextResponse("Locked",{status:403});
  const root=path.resolve(process.cwd(),"storage","courses"); const file=path.resolve(process.cwd(),"storage",resource.fileUrl.replace(/^\/courses\/?/,""));
  if(!file.startsWith(root+path.sep)) return new NextResponse("Invalid path",{status:400});
  try{return new NextResponse(await readFile(file),{headers:{"Content-Disposition":`inline; filename="${path.basename(file)}"`,"X-Content-Type-Options":"nosniff"}})}catch{return new NextResponse("Not found",{status:404})}
}
