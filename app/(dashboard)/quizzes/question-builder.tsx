import { deleteQuizQuestion, upsertQuizQuestion } from "@/app/(dashboard)/quizzes/actions";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Question = {
  id: string;
  type: string;
  prompt: string;
  explanation: string | null;
  marks: unknown;
  order: number;
  correctAnswer: string | null;
  options: Array<{ label: string; text: string; isCorrect: boolean; order: number }>;
};

export function QuestionBuilder({ quizId, questions }: { quizId: string; questions: Question[] }) {
  async function action(formData: FormData) {
    "use server";
    await upsertQuizQuestion(quizId, formData);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        {questions.length ? questions.map((question, index) => (
          <Card key={question.id} className="glass-panel">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="outline">Question {index + 1}</Badge>
                  <h3 className="mt-3 font-semibold">{question.prompt}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{question.type.toLowerCase().replaceAll("_", " ")} · {question.marks?.toString()} marks</p>
                </div>
                <form action={async () => {
                  "use server";
                  await deleteQuizQuestion(quizId, question.id);
                }}>
                  <Button type="submit" variant="outline" size="sm">Delete</Button>
                </form>
              </div>
              {question.options.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <div key={`${question.id}-${option.label}`} className="rounded-lg border bg-white/70 p-3 text-sm">
                      <span className="font-semibold">{option.label}.</span> {option.text}
                      {option.isCorrect ? <Badge className="ml-2" variant="success">correct</Badge> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )) : (
          <Card className="glass-panel">
            <CardContent className="p-10 text-center">
              <h3 className="text-lg font-semibold">No questions yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">Add MCQ, true/false, short answer, or essay questions to publish this quiz.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Question builder</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="type">
                <Select id="type" name="type" defaultValue="MULTIPLE_CHOICE">
                  <option value="MULTIPLE_CHOICE">Multiple choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="SHORT_ANSWER">Short answer</option>
                  <option value="ESSAY">Essay</option>
                </Select>
              </Field>
              <Field label="Marks" htmlFor="marks">
                <Input id="marks" name="marks" type="number" min={0} step="0.5" defaultValue={1} />
              </Field>
            </div>
            <Field label="Question" htmlFor="prompt">
              <Textarea id="prompt" name="prompt" required className="min-h-[110px]" />
            </Field>
            <Field label="Correct answer" htmlFor="correctAnswer">
              <Input id="correctAnswer" name="correctAnswer" placeholder="true / false, keyword, or model answer" />
            </Field>
            <Field label="MCQ options" htmlFor="options">
              <Textarea id="options" name="options" placeholder={"A|First option|true\nB|Second option|false\nC|Third option|false"} className="min-h-[120px]" />
            </Field>
            <Field label="Explanation" htmlFor="explanation">
              <Textarea id="explanation" name="explanation" />
            </Field>
            <input type="hidden" name="order" value={questions.length} />
            <Button type="submit" className="w-full">Add question</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
