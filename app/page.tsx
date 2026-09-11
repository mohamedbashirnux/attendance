import Link from "next/link"
import { UserRound, ShieldCheck } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Page() {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-[#fafafa] px-6 py-12">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#5F61E6]" />
      <div className="w-full max-w-lg">
        <div className="mb-10 flex flex-col items-center text-center">
          <img
            src="/images/logo1.png"
            alt="Capital University"
            className="mb-5 size-16 rounded-2xl border border-border/70 bg-white p-2 object-contain shadow-sm"
          />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#5F61E6]">
            Capital University
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Attendance portal
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Choose the account type you want to use to continue.
          </p>
        </div>

        <div className="grid gap-4">
          <Link href="/faculty/login" className="group block">
            <Card className="cursor-pointer border-border/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#5F61E6]/50 hover:shadow-md">
              <CardHeader className="flex-row items-center gap-4 space-y-0 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#5F61E6]/10 text-[#5F61E6]">
                  <UserRound className="size-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Login as User</CardTitle>
                  <CardDescription className="mt-1">Faculty member access</CardDescription>
                </div>
                <span className="ml-auto text-lg text-muted-foreground transition-transform group-hover:translate-x-1">→</span>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/login" className="group block">
            <Card className="cursor-pointer border-border/70 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#5F61E6]/50 hover:shadow-md">
              <CardHeader className="flex-row items-center gap-4 space-y-0 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-[#5F61E6]/10 text-[#5F61E6]">
                  <ShieldCheck className="size-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Login as Admin</CardTitle>
                  <CardDescription className="mt-1">Super admin access</CardDescription>
                </div>
                <span className="ml-auto text-lg text-muted-foreground transition-transform group-hover:translate-x-1">→</span>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  )
}
