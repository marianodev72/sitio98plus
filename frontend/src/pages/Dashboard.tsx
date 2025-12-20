import { useAuth } from "../auth/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </>
  );
}
