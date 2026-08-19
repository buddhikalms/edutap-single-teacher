import Link from "next/link";

export function FallbackAttendanceOptions() {
  return (
    <div className="grid grid-cols-3 gap-2 text-center text-xs">
      <Link className="rounded-md border px-3 py-2 font-medium" href="/student/attendance">
        QR
      </Link>
      <Link className="rounded-md border px-3 py-2 font-medium" href="/student/attendance">
        NFC
      </Link>
      <Link className="rounded-md border px-3 py-2 font-medium" href="/student/attendance">
        Help
      </Link>
    </div>
  );
}
