import { GuestExperience } from "../../components/GuestExperience";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestExperience token={token} />;
}
