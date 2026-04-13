import { redirect } from "next/navigation";

export default function AdminInviteOnlyPage() {
  redirect("/admin/config");
}
