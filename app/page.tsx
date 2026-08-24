import Link from "next/link"
import { GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[#5F61E6] text-white">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Select how you want to log in
          </p>
        </div>
        <div className="grid gap-3">
          <Link href="/login" className="block">
            <Button className="h-12 w-full text-base">Login as Admin</Button>
          </Link>
          <Link href="/faculty/login" className="block">
            <Button variant="outline" className="h-12 w-full text-base">
              Login as User
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
