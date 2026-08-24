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
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/images/logo1.png"
            alt="Logo"
            className="mb-3 size-14 rounded-xl object-contain"
          />
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Select how you want to log in
          </p>
        </div>

        <div className="grid gap-3">
          <Link href="/faculty/login" className="group block">
            <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[#5F61E6] hover:bg-[#5F61E6]/5 hover:shadow-md">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#5F61E6]/10 text-[#5F61E6]">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Login as User</CardTitle>
                  <CardDescription>Faculty member access</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/login" className="group block">
            <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[#5F61E6] hover:bg-[#5F61E6]/5 hover:shadow-md">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#5F61E6]/10 text-[#5F61E6]">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Login as Admin</CardTitle>
                  <CardDescription>Super admin access</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
