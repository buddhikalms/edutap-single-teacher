"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type PublicClass = {
  id: string;
  key: string;
  name: string;
  grade: string;
  subject: string;
  subjectColor: string;
  classType: string;
  schedule: string;
  location: string;
  monthlyFee: number;
  availableSeats: number;
};

export function ClassCatalog({ classes, currency }: { classes: PublicClass[]; currency: string }) {
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const options = (key: keyof PublicClass) => Array.from(new Set(classes.map((item) => String(item[key])))).sort();
  const filtered = useMemo(() => classes.filter((item) =>
    (!grade || item.grade === grade) && (!subject || item.subject === subject) &&
    (!type || item.classType === type) && (!location || item.location === location)
  ), [classes, grade, subject, type, location]);

  return (
    <>
      <div className="grid gap-3 rounded-3xl border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Filter label="All grades" value={grade} setValue={setGrade} options={options("grade")} />
        <Filter label="All subjects" value={subject} setValue={setSubject} options={options("subject")} />
        <Filter label="All class types" value={type} setValue={setType} options={options("classType")} />
        <Filter label="All locations" value={location} setValue={setLocation} options={options("location")} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{filtered.length} regular {filtered.length === 1 ? "class" : "classes"} available</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <article key={item.id} className="flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start justify-between gap-3"><Badge variant="outline">{item.classType.toLowerCase()}</Badge><Badge variant={item.availableSeats < 5 ? "warning" : "secondary"}>{item.availableSeats ? `${item.availableSeats} seats` : "Waitlist"}</Badge></div>
            <p className="mt-5 text-sm font-semibold" style={{ color: item.subjectColor }}>{item.subject} · {item.grade}</p>
            <h2 className="mt-2 text-xl font-semibold">{item.name}</h2>
            <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
              <span className="flex gap-2"><CalendarDays className="h-4 w-4 shrink-0" />{item.schedule}</span>
              <span className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" />{item.location}</span>
              <span className="flex gap-2"><Users className="h-4 w-4 shrink-0" />Teacher-approved enrollment</span>
            </div>
            <div className="mt-auto pt-6"><div className="flex items-center justify-between border-t pt-5"><div><p className="text-xs text-muted-foreground">Monthly fee</p><p className="font-semibold">{formatCurrency(item.monthlyFee, currency)}</p></div><Button asChild><Link href={`/classes/${item.key}`}>Request <ArrowRight className="h-4 w-4" /></Link></Button></div></div>
          </article>
        ))}
      </div>
      {!filtered.length ? <div className="mt-5 rounded-3xl border border-dashed p-10 text-center text-muted-foreground">No classes match these filters. Try widening your search.</div> : null}
    </>
  );
}

function Filter({ label, value, setValue, options }: { label: string; value: string; setValue: (value: string) => void; options: string[] }) {
  return <Select aria-label={label} value={value} onChange={(event) => setValue(event.target.value)}><option value="">{label}</option>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ").toLowerCase()}</option>)}</Select>;
}

