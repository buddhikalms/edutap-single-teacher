import { Filter, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ReportFilters({
  classes,
  students,
  values
}: {
  classes: Array<{ id: string; name: string }>;
  students: Array<{ id: string; name: string; admissionNo: string }>;
  values: {
    from?: string;
    to?: string;
    classGroupId?: string;
    studentId?: string;
    report?: string;
  };
}) {
  return (
    <form className="glass-panel rounded-2xl p-5" action="/reports">
      <input type="hidden" name="report" value={values.report ?? "attendance"} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto] xl:items-end">
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={values.from} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={values.to} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="classGroupId">Class</Label>
          <Select id="classGroupId" name="classGroupId" defaultValue={values.classGroupId ?? ""}>
            <option value="">All classes</option>
            {classes.map((classGroup) => (
              <option key={classGroup.id} value={classGroup.id}>
                {classGroup.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentId">Student</Label>
          <Select id="studentId" name="studentId" defaultValue={values.studentId ?? ""}>
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} - {student.admissionNo}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1 xl:flex-none">
            <Filter className="h-4 w-4" />
            Apply
          </Button>
          <Button asChild type="button" variant="outline" size="icon" aria-label="Reset filters">
            <Link href="/reports">
              <RotateCcw className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
